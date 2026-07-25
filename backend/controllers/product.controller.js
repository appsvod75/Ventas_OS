const prisma = require('../db');
const { logAudit } = require('../utils/audit');
const { getIO } = require('../services/socketManager');

const getAllCategories = async (req, res) => {
    const { showInactive } = req.query;
    try {
        const categories = await prisma.category.findMany({
            where: showInactive === 'true' ? {} : { isActive: true }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
};

const createCategory = async (req, res) => {
    const { name, icon, colorHex } = req.body;
    try {
        const category = await prisma.category.create({
            data: { name, icon, colorHex, isActive: true }
        });

        await logAudit(req.user.id, 'CREATE_CATEGORY', { name, id: category.id }, req.user.branch_id);

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la categoría' });
    }
};

const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, icon, colorHex, isActive } = req.body;
    try {
        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { name, icon, colorHex, isActive: isActive !== undefined ? isActive : undefined }
        });

        await logAudit(req.user.id, 'UPDATE_CATEGORY', { name, id: category.id }, req.user.branch_id);

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la categoría' });
    }
};

const deleteCategory = async (req, res) => {
    const { id } = req.params;
    const idInt = parseInt(id);
    try {
        // Intentar borrado físico si no tiene productos asociados
        await prisma.category.delete({
            where: { id: idInt }
        });

        await logAudit(req.user.id, 'HARD_DELETE_CATEGORY', { id: idInt }, req.user.branch_id);
        res.json({ message: 'Categoría eliminada permanentemente de la base de datos' });
    } catch (error) {
        // P2003 es el código de Prisma para error de restricción de llave foránea (productos existentes)
        if (error.code === 'P2003') {
            try {
                await prisma.category.update({
                    where: { id: idInt },
                    data: { isActive: false }
                });

                await logAudit(req.user.id, 'DELETE_CATEGORY', { id: idInt }, req.user.branch_id);
                return res.json({ message: 'La categoría tiene productos asociados y no puede borrarse físicamente. Se ha desactivado correctamente.' });
            } catch (updateError) {
                console.error('Error al desactivar categoría fallback:', updateError);
                return res.status(500).json({ message: 'Error al procesar la desactivación' });
            }
        }
        
        console.error('Error in deleteCategory:', error);
        res.status(500).json({ message: 'Error al eliminar la categoría' });
    }
};

const restoreCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.category.update({
            where: { id: parseInt(id) },
            data: { isActive: true }
        });
        res.json({ message: 'Categoría restaurada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al restaurar categoría' });
    }
};

const getAllProducts = async (req, res) => {
    const { branch_id, show_inactive } = req.query;
    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: show_inactive === 'true' ? false : true,
            },
            include: {
                category: true,
                variants: true,
                providers: {
                    include: { provider: true }
                },
                inventory: branch_id ? {
                    where: { branchId: parseInt(branch_id) }
                } : true
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Format output to match old raw SQL structure for frontend compatibility
        const formatted = products.map(p => ({
            ...p,
            is_service: p.isService,
            basePrice: Number(p.basePrice),
            base_price: Number(p.basePrice), // Duplicate for back-compat if needed
            averageCost: Number(p.averageCost),
            average_cost: Number(p.averageCost),
            category_name: p.category?.name,
            inventory: p.inventory,
            providers: p.providers.map(pp => pp.provider), // Flatten providers for frontend
            stock_level: branch_id
                ? (p.inventory[0]?.stockLevel || 0)
                : p.inventory.reduce((acc, i) => acc + i.stockLevel, 0),
            min_stock: branch_id 
                ? (p.inventory[0]?.minStock || 0) 
                : (p.inventory.find(i => i.branchId === 1)?.minStock || 0), // Fallback to main branch if no ID
            max_stock: branch_id 
                ? (p.inventory[0]?.maxStock || 0) 
                : (p.inventory.find(i => i.branchId === 1)?.maxStock || 0),
            minStock: p.inventory[0]?.minStock || 0,
            maxStock: p.inventory[0]?.maxStock || 0
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener productos' });
    }
};

const getProductById = async (req, res) => {
    const { id } = req.params;
    const { branch_id } = req.query;
    try {
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                variants: true,
                category: true,
                providers: {
                    include: { provider: true }
                },
                inventory: branch_id ? {
                    where: { branchId: parseInt(branch_id) }
                } : true
            }
        });
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
        
        // Format to match frontend expectations
        const formatted = {
            ...product,
            base_price: Number(product.basePrice),
            is_service: product.isService,
            category_name: product.category?.name,
            variants: product.variants.map(v => ({ ...v, price: Number(v.price) })),
            providers: product.providers.map(pp => pp.provider),
            min_stock: branch_id 
                ? (product.inventory[0]?.minStock || 0) 
                : (product.inventory[0]?.minStock || 0), // Default to first branch if no branch_id provided for single detail
            max_stock: branch_id 
                ? (product.inventory[0]?.maxStock || 0) 
                : (product.inventory[0]?.maxStock || 0)
        };

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener producto' });
    }
};

const createProduct = async (req, res) => {
    const { name, sku, categoryId, basePrice, isMedicine, isService, description, imageUrl, variants, minStock, maxStock, providerIds, commissionType, commissionValue, hasCustomization } = req.body;
    console.log('--- DEBUG: createProduct Body ---', JSON.stringify(req.body, null, 2));
    console.log('--- DEBUG: User Branch ID ---', req.user.branch_id);
    
    try {
        const product = await prisma.$transaction(async (tx) => {
            console.log('--- DEBUG: Starting Transaction ---');
            const parsedCategoryId = categoryId ? parseInt(categoryId) : null;
            const data = {
                name: name.trim().toUpperCase(),
                sku: sku && sku.trim() !== "" ? sku.trim().toUpperCase() : null,
                ...(parsedCategoryId ? { category: { connect: { id: parsedCategoryId } } } : {}),
                basePrice: parseFloat(basePrice || 0),
                isService: !!isService,
                hasCustomization: !!hasCustomization,
                description: description || undefined,
                imageUrl: imageUrl || undefined,
                commissionType: commissionType || null,
                commissionValue: parseFloat(commissionValue) || 0,
                variants: variants && variants.length > 0 ? {
                    create: variants.map(v => ({
                        name: (v.name || 'Unidad').trim().toUpperCase(),
                        quantity: parseInt(v.quantity),
                        price: parseFloat(v.price)
                    }))
                } : undefined,
                providers: providerIds && providerIds.length > 0 ? {
                    create: providerIds.map(pid => ({
                        providerId: parseInt(pid)
                    }))
                } : undefined
            };
            
            console.log('--- DEBUG: Prisma Create Data ---', JSON.stringify(data, null, 2));

            const newProduct = await tx.product.create({
                data,
                include: { variants: true }
            });

            console.log('--- DEBUG: newProduct Created ---', newProduct.id);

            // Initialize inventory with min/max stock for the current branch
            if (req.user.branch_id) {
                console.log('--- DEBUG: Creating Inventory for branch ---', req.user.branch_id);
                await tx.inventory.create({
                    data: {
                        productId: newProduct.id,
                        branchId: req.user.branch_id,
                        stockLevel: 0,
                        minStock: parseInt(minStock) || 5,
                        maxStock: parseInt(maxStock) || 100
                    }
                });
            }
            return newProduct;
        });

        await logAudit(req.user.id, 'CREATE_PRODUCT', { name, sku: sku && sku.trim() !== "" ? sku.trim().toUpperCase() : null, id: product.id }, req.user.branch_id);

        // Notify other clients
        const io = getIO();
        if (io) io.emit('PRODUCT_CREATED', { productId: product.id, name: product.name });

        res.json(product);
    } catch (error) {
        console.error('--- DEBUG: createProduct ERROR ---', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'El código SKU ya existe en otro producto.' });
        }
        res.status(500).json({ message: 'Error al crear producto' });
    }
};

const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, sku, categoryId, basePrice, isMedicine, isService, description, imageUrl, variants, minStock, maxStock, providerIds, isActive, commissionType, commissionValue, hasCustomization } = req.body;
    try {
        const product = await prisma.$transaction(async (tx) => {
            // Delete old variants
            await tx.productVariant.deleteMany({
                where: { productId: parseInt(id) }
            });

            // Delete old provider relations
            await tx.productProvider.deleteMany({
                where: { productId: parseInt(id) }
            });

            // Update product and create new relations
            const updatedProduct = await tx.product.update({
                where: { id: parseInt(id) },
                data: {
                    name: name.trim().toUpperCase(),
                    sku: sku && sku.trim() !== "" ? sku.trim().toUpperCase() : null,
                    ...(categoryId ? { category: { connect: { id: parseInt(categoryId) } } } : {}),
                    basePrice: parseFloat(basePrice || 0),
                    isService: !!isService,
                    hasCustomization: hasCustomization !== undefined ? !!hasCustomization : undefined,
                    description: description || undefined,
                    imageUrl: imageUrl || undefined,
                    ...(isActive !== undefined ? { isActive } : {}),
                    commissionType: commissionType !== undefined ? commissionType : undefined,
                    commissionValue: commissionValue !== undefined ? parseFloat(commissionValue) : undefined,
                    variants: variants ? {
                        create: variants.map(v => ({
                            name: (v.name || 'Unidad').trim().toUpperCase(),
                            quantity: parseInt(v.quantity),
                            price: parseFloat(v.price)
                        }))
                    } : undefined,
                    providers: providerIds ? {
                        create: providerIds.map(pid => ({
                            providerId: parseInt(pid)
                        }))
                    } : undefined
                },
                include: { variants: true }
            });

            // Update inventory min/max limits
            if (req.user.branch_id && (minStock !== undefined || maxStock !== undefined)) {
                await tx.inventory.upsert({
                    where: {
                        branchId_productId: {
                            branchId: req.user.branch_id,
                            productId: parseInt(id)
                        }
                    },
                    update: {
                        ...(minStock !== undefined && { minStock: parseInt(minStock) }),
                        ...(maxStock !== undefined && { maxStock: parseInt(maxStock) })
                    },
                    create: {
                        branchId: req.user.branch_id,
                        productId: parseInt(id),
                        stockLevel: 0,
                        minStock: parseInt(minStock) || 5,
                        maxStock: parseInt(maxStock) || 100
                    }
                });
            }

            return updatedProduct;
        });

        await logAudit(req.user.id, 'UPDATE_PRODUCT', { name, sku: sku && sku.trim() !== "" ? sku.trim().toUpperCase() : null, id: product.id }, req.user.branch_id);

        // Notify other clients
        const io = getIO();
        if (io) io.emit('PRODUCT_UPDATED', { productId: product.id, name: product.name });

        res.json(product);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'El código SKU ya existe en otro producto.' });
        }
        res.status(500).json({ message: 'Error al actualizar producto' });
    }
};

const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const idInt = parseInt(id);
    try {
        // Intentar borrado físico si no tiene movimientos
        await prisma.$transaction(async (tx) => {
            // Limpiar datos dependientes que NO son movimientos
            await tx.inventory.deleteMany({ where: { productId: idInt } });
            await tx.inventoryLot.deleteMany({ where: { productId: idInt } });
            await tx.productProvider.deleteMany({ where: { productId: idInt } });
            await tx.aiCache.deleteMany({ where: { productId: idInt } });
            
            // Intentar borrar el producto (variants se borran por Cascade en el esquema)
            await tx.product.delete({ where: { id: idInt } });
        });

        await logAudit(req.user.id, 'HARD_DELETE_PRODUCT', { id: idInt }, req.user.branch_id);
        res.json({ message: 'Producto eliminado permanentemente de la base de datos' });
        
    } catch (error) {
        // P2003 es el código de Prisma para error de restricción de llave foránea (movimientos existentes)
        if (error.code === 'P2003') {
            try {
                const product = await prisma.product.update({
                    where: { id: idInt },
                    data: { isActive: false }
                });

                await logAudit(req.user.id, 'DELETE_PRODUCT', { name: product.name, id: product.id }, req.user.branch_id);
                return res.json({ message: 'El producto tiene movimientos y no puede borrarse físicamente. Se ha desactivado correctamente.' });
            } catch (updateError) {
                console.error('Error al desactivar fallback:', updateError);
                return res.status(500).json({ message: 'Error al procesar la desactivación' });
            }
        }
        
        console.error('Error in deleteProduct:', error);
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
};

const restoreProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: { isActive: true }
        });

        await logAudit(req.user.id, 'RESTORE_PRODUCT', { name: product.name, id: product.id }, req.user.branch_id);

        res.json({ message: 'Producto reactivado correctamente', product });
    } catch (error) {
        res.status(500).json({ message: 'Error al reactivar producto' });
    }
};

const deleteProductPermanent = async (req, res) => {
    const { id } = req.params;
    const idInt = parseInt(id);
    try {
        await prisma.$transaction(async (tx) => {
            // Limpiar datos dependientes que NO son movimientos (stocks, lotes sin movimientos, proveedores, cache)
            await tx.inventory.deleteMany({ where: { productId: idInt } });
            await tx.inventoryLot.deleteMany({ where: { productId: idInt } });
            await tx.productProvider.deleteMany({ where: { productId: idInt } });
            await tx.aiCache.deleteMany({ where: { productId: idInt } });
            await tx.productVariant.deleteMany({ where: { productId: idInt } });
            
            // Borrado físico estricto
            await tx.product.delete({ where: { id: idInt } });
        });

        await logAudit(req.user.id, 'HARD_DELETE_PRODUCT', { id: idInt }, req.user.branch_id);
        res.json({ message: 'Producto eliminado permanentemente de la base de datos' });
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'No se puede eliminar permanentemente: el producto ya tiene historial de ventas o movimientos.' });
        }
        console.error('Error in deleteProductPermanent:', error);
        res.status(500).json({ message: 'Error al intentar la eliminación permanente' });
    }
};

module.exports = { 
    getAllCategories, createCategory, updateCategory, deleteCategory, restoreCategory, 
    getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, restoreProduct,
    deleteProductPermanent 
};

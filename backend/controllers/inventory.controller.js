const prisma = require('../db');
const { getIO } = require('../services/socketManager');

const getInventoryByBranch = async (req, res) => {
    let { branch_id } = req.params;
    
    // Non-admin users are locked to their branch
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
        branch_id = req.user.branch_id;
    }
    try {
        const inventory = await prisma.inventory.findMany({
            where: { branchId: parseInt(branch_id) },
            include: { product: true },
            orderBy: {
                product: {
                    name: 'asc'
                }
            }
        });
        // Format to match frontend
        const formatted = inventory.map(i => ({
            ...i,
            name: i.product.name,
            sku: i.product.sku,
            base_price: i.product.basePrice
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
};

const updateInventory = async (req, res) => {
    let { branchId, productId } = req.params;
    const { minStock, maxStock, stockLevel } = req.body;

    // Non-admin users cannot update inventory settings/levels
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'No tiene permisos para modificar inventario' });
    }
    try {
        const updated = await prisma.inventory.upsert({
            where: {
                branchId_productId: {
                    branchId: parseInt(branchId),
                    productId: parseInt(productId)
                }
            },
            update: {
                minStock: minStock !== undefined ? parseInt(minStock) : undefined,
                maxStock: maxStock !== undefined ? parseInt(maxStock) : undefined,
                stockLevel: stockLevel !== undefined ? parseInt(stockLevel) : undefined
            },
            create: {
                branchId: parseInt(branchId),
                productId: parseInt(productId),
                minStock: minStock !== undefined ? parseInt(minStock) : 0,
                maxStock: maxStock !== undefined ? parseInt(maxStock) : 100,
                stockLevel: stockLevel !== undefined ? parseInt(stockLevel) : 0
            }
        });

        // Notify other clients about inventory change
        const io = getIO();
        if (io) {
            io.emit('INVENTORY_UPDATED', { branchId: parseInt(branchId) });
            io.emit('PRODUCT_UPDATED', { productId: parseInt(productId) }); // For min/max updates
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar inventario' });
    }
};

const createTransfer = async (req, res) => {
    const { from_branch_id, to_branch_id, items, status: requestedStatus, customDate } = req.body;
    const user_id = req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super Admin';

    // If a vendor tries to send 'COMPLETED', force it to 'PENDING'
    const finalStatus = (isAdmin && requestedStatus === 'COMPLETED') ? 'COMPLETED' : 'PENDING';

    try {
        const transfer = await prisma.$transaction(async (tx) => {
            const newTransfer = await tx.transfer.create({
                data: {
                    fromBranchId: parseInt(from_branch_id),
                    toBranchId: parseInt(to_branch_id),
                    userId: user_id,
                    status: finalStatus,
                    createdAt: customDate ? new Date(customDate + 'T12:00:00-06:00') : undefined,
                    details: {
                        create: items.map(item => ({
                            productId: item.product_id,
                            quantity: item.quantity
                        }))
                    }
                },
                include: { details: true }
            });

            // If direct transfer (COMPLETED), adjust stocks immediately
            if (finalStatus === 'COMPLETED') {
                for (const item of newTransfer.details) {
                    // Check stock at origin
                    const currentInventory = await tx.inventory.findUnique({
                        where: {
                            branchId_productId: {
                                branchId: newTransfer.fromBranchId,
                                productId: item.productId
                            }
                        }
                    });

                    if (!currentInventory || currentInventory.stockLevel < item.quantity) {
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        throw new Error(`Stock insuficiente en origen para "${product?.name}". Disponible: ${currentInventory?.stockLevel || 0}, Solicitado: ${item.quantity}`);
                    }

                    // Decrease origin
                    await tx.inventory.update({
                        where: {
                            branchId_productId: {
                                branchId: newTransfer.fromBranchId,
                                productId: item.productId
                            }
                        },
                        data: { stockLevel: { decrement: item.quantity } }
                    });

                    // Increase destination
                    await tx.inventory.upsert({
                        where: {
                            branchId_productId: {
                                branchId: newTransfer.toBranchId,
                                productId: item.productId
                            }
                        },
                        update: { stockLevel: { increment: item.quantity } },
                        create: {
                            branchId: newTransfer.toBranchId,
                            productId: item.productId,
                            stockLevel: item.quantity
                        }
                    });
                }
            }

            return newTransfer;
        });

        // Notify other clients about inventory change
        const io = getIO();
        if (io) {
            io.emit('INVENTORY_UPDATED', { branchId: from_branch_id });
            io.emit('INVENTORY_UPDATED', { branchId: to_branch_id });
        }

        res.json(transfer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear traslado' });
    }
};

const confirmTransfer = async (req, res) => {
    const { id } = req.params;

    try {
        const { from_branch_id } = req.body;
        const result = await prisma.$transaction(async (tx) => {
            const transfer = await tx.transfer.findUnique({
                where: { id: parseInt(id) },
                include: { details: true }
            });

            if (!transfer) throw new Error('Traslado no encontrado');
            if (transfer.status !== 'PENDING') throw new Error('El traslado ya no está pendiente');

            const originBranchId = from_branch_id ? parseInt(from_branch_id) : transfer.fromBranchId;
            if (!originBranchId) throw new Error('Debe especificar una sucursal de origen');
            if (originBranchId === transfer.toBranchId) throw new Error('Origen y destino deben ser diferentes');

            for (const item of transfer.details) {
                // Check stock at origin branch
                const currentInventory = await tx.inventory.findUnique({
                    where: {
                        branchId_productId: {
                            branchId: originBranchId,
                            productId: item.productId
                        }
                    }
                });

                if (!currentInventory || currentInventory.stockLevel < item.quantity) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    throw new Error(`Stock insuficiente en origen para "${product?.name}". Disponible: ${currentInventory?.stockLevel || 0}, Solicitado: ${item.quantity}`);
                }

                // Decrease origin
                await tx.inventory.update({
                    where: {
                        branchId_productId: {
                            branchId: originBranchId,
                            productId: item.productId
                        }
                    },
                    data: { stockLevel: { decrement: item.quantity } }
                });

                // Increase/Upsert destination
                await tx.inventory.upsert({
                    where: {
                        branchId_productId: {
                            branchId: transfer.toBranchId,
                            productId: item.productId
                        }
                    },
                    update: { stockLevel: { increment: item.quantity } },
                    create: {
                        branchId: transfer.toBranchId,
                        productId: item.productId,
                        stockLevel: item.quantity
                    }
                });
            }

            // Update transfer status and actual fromBranchId if it changed or was empty
            const finalTransfer = await tx.transfer.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'COMPLETED',
                    fromBranchId: originBranchId
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'CONFIRM_TRANSFER',
                    details: JSON.stringify({ transferId: id, originBranchId, destinationBranch: transfer.toBranchId }),
                    branchId: transfer.toBranchId
                }
            });

            return finalTransfer;
        });

        // Notify both branches (origin and destination) about inventory change
        const io = getIO();
        if (io) {
            io.emit('INVENTORY_UPDATED', { branchId: result.fromBranchId });
            io.emit('INVENTORY_UPDATED', { branchId: result.toBranchId });
        }

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error al confirmar traslado' });
    }
};

const getProductKardex = async (req, res) => {
    const { productId, branchId } = req.params;
    try {
        const prodId = parseInt(productId);
        const bId = parseInt(branchId);

        // 1. Fetch Movements
        const [purchases, sales, transfers] = await Promise.all([
            prisma.purchaseD.findMany({
                where: { productId: prodId, purchaseH: { branchId: bId } },
                include: { purchaseH: { include: { user: true } } }
            }),
            prisma.saleD.findMany({
                where: { productId: prodId, saleH: { branchId: bId } },
                include: { saleH: { include: { user: true } } }
            }),
            prisma.transferDetail.findMany({
                where: {
                    productId: prodId,
                    OR: [
                        { transfer: { fromBranchId: bId } },
                        { transfer: { toBranchId: bId } }
                    ]
                },
                include: { transfer: { include: { user: true, fromBranch: true, toBranch: true } } }
            })
        ]);

        // 1.1 Consolidate Purchases (Group by purchaseHId)
        const consolidatedPurchases = [];
        const purchaseGroups = {};
        
        purchases.forEach(p => {
            const hId = p.purchaseHId;
            if (!p.purchaseH) return; // Skip orphaned details
            if (!purchaseGroups[hId]) {
                purchaseGroups[hId] = {
                    recordId: hId,
                    recordType: 'PURCHASE',
                    date: p.purchaseH.createdAt,
                    type: '', // To be defined after consolidation
                    reference: p.purchaseH.invoiceNumber || `Comp #${p.purchaseH.id}`,
                    quantity: 0,
                    user: p.purchaseH.user?.name || 'Sistema',
                    totalCost: 0
                };
            }
            purchaseGroups[hId].quantity += p.quantity || 0;
            purchaseGroups[hId].totalCost += Number(p.subtotal || 0);
        });

        Object.values(purchaseGroups).forEach(group => {
            const isADJ = group.reference.includes('ADJ-');
            if (isADJ) {
                group.type = group.quantity < 0 ? 'SALIDA (AJUSTE)' : 'INGRESO (AJUSTE)';
            } else {
                group.type = group.quantity < 0 ? 'SALIDA (DEVOLUCION)' : 'INGRESO (COMPRA)';
            }
            consolidatedPurchases.push(group);
        });

        // 2. Map to common format
        const movements = [
            ...consolidatedPurchases,
            ...sales.map(s => ({
                recordId: s.saleHId,
                recordType: 'SALE',
                date: s.saleH?.createdAt || new Date(),
                type: 'SALIDA (VENTAS)',
                reference: s.saleH ? `Venta #${s.saleH.id}` : 'Venta (Sin Ref)',
                quantity: -(s.quantity || 0),
                user: s.saleH?.user?.name || 'Sistema'
            })),
            ...transfers.map(t => {
                if (!t.transfer) return null;
                const isEntry = t.transfer.toBranchId === bId;
                const branchName = isEntry 
                    ? (t.transfer.fromBranch?.name || 'Sucursal Desconocida') 
                    : (t.transfer.toBranch?.name || 'Sucursal Desconocida');
                
                return {
                    recordId: t.transfer.id,
                    recordType: 'TRANSFER',
                    date: t.transfer.createdAt,
                    type: isEntry ? 'INGRESO (TRASLADO)' : 'SALIDA (TRASLADO)',
                    reference: `Traslado #${t.transfer.id} (${isEntry ? 'Desde ' + branchName : 'Hacia ' + branchName})`,
                    quantity: isEntry ? (t.quantity || 0) : -(t.quantity || 0),
                    user: t.transfer.user?.name || 'Sistema'
                };
            }).filter(Boolean)
        ];


        // 3. Sort by date Ascending (Oldest first)
        movements.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 4. Calculate Running Balance
        let currentBalance = 0;
        const history = movements.map(m => {
            const initialBalance = currentBalance;
            currentBalance += m.quantity;
            return {
                ...m,
                initialBalance,
                finalBalance: currentBalance
            };
        });

        console.log('Sending Kardex history:', history[0]);
        res.json(history);
    } catch (error) {
        console.error("KARDEX ERROR:", error);
        require('fs').appendFileSync('/tmp/luckypos_kardex_err.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2) + '\n');
        res.status(500).json({ message: 'Error al obtener Kardex', details: error.message });
    }
};

const getLowStockReport = async (req, res) => {
    const { branchId } = req.query;
    try {
        const branchesWhere = { isActive: true };
        if (branchId) branchesWhere.id = parseInt(branchId);

        // 1. Fetch active data in bulk
        const [branches, products, allInventory] = await Promise.all([
            prisma.branch.findMany({ where: branchesWhere }),
            prisma.product.findMany({ 
                where: { isActive: true, isService: false },
                include: { 
                    providers: { include: { provider: true } }
                }
            }),
            prisma.inventory.findMany({
                where: branchId ? { branchId: parseInt(branchId) } : {}
            })
        ]);

        // 2. Index inventory for O(1) access
        const inventoryMap = new Map();
        allInventory.forEach(i => {
            inventoryMap.set(`${i.branchId}-${i.productId}`, i);
        });

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const nowLocal = new Date(`${todayStr}T23:59:59-06:00`);
        const thirtyDaysAgo = new Date(`${todayStr}T00:00:00-06:00`);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 3. Fetch all relevant sales in one query
        const allSales = await prisma.saleD.findMany({
            where: {
                productId: { in: products.map(p => p.id) },
                saleH: {
                    createdAt: { gte: thirtyDaysAgo },
                    ...(branchId && { branchId: parseInt(branchId) })
                }
            },
            include: { saleH: true }
        });

        // 4. Group sales by [branchId-productId]
        const salesStats = new Map();
        const sevenDaysAgo = new Date(nowLocal.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fifteenDaysAgo = new Date(nowLocal.getTime() - 15 * 24 * 60 * 60 * 1000);

        allSales.forEach(s => {
            const key = `${s.saleH.branchId}-${s.productId}`;
            if (!salesStats.has(key)) {
                salesStats.set(key, { s7: 0, s15: 0, s30: 0 });
            }
            const stats = salesStats.get(key);
            stats.s30 += s.quantity;
            if (s.saleH.createdAt >= sevenDaysAgo) stats.s7 += s.quantity;
            if (s.saleH.createdAt >= fifteenDaysAgo) stats.s15 += s.quantity;
        });

        const reportCandidates = [];

        // 5. Identify low stock items
        for (const branch of branches) {
            for (const product of products) {
                const inv = inventoryMap.get(`${branch.id}-${product.id}`);
                const stockLevel = inv ? inv.stockLevel : 0;
                const minStock = inv ? inv.minStock : 5;
                const maxStock = inv ? inv.maxStock : 100;

                if (minStock > 0 && stockLevel <= minStock) {
                    reportCandidates.push({ branch, product, stockLevel, minStock, maxStock });
                }
            }
        }

        // 6. Bulk fetch Recommended Providers for candidates
        // We only fetch for candidates to save resources
        const candidateProductIds = [...new Set(reportCandidates.map(c => c.product.id))];
        
        // Get linked providers
        const allLinkedProviders = await prisma.productProvider.findMany({
            where: { productId: { in: candidateProductIds } },
            include: { provider: true }
        });
        const linkedProvidersMap = new Map();
        allLinkedProviders.forEach(lp => {
            if (!linkedProvidersMap.has(lp.productId)) linkedProvidersMap.set(lp.productId, []);
            linkedProvidersMap.get(lp.productId).push(lp);
        });

        // Get purchase history to find best prices
        const allRecentPurchases = await prisma.purchaseD.findMany({
            where: {
                productId: { in: candidateProductIds }
            },
            orderBy: { purchaseH: { createdAt: 'desc' } },
            include: { purchaseH: { include: { provider: true } } }
        });
        const purchaseHistoryMap = new Map();
        allRecentPurchases.forEach(rp => {
            if (!purchaseHistoryMap.has(rp.productId)) purchaseHistoryMap.set(rp.productId, []);
            purchaseHistoryMap.get(rp.productId).push(rp);
        });

        // 7. Assemble final report
        const report = reportCandidates.map(({ branch, product, stockLevel, minStock, maxStock }) => {
            const stats = salesStats.get(`${branch.id}-${product.id}`) || { s7: 0, s15: 0, s30: 0 };
            const dailyAvg = stats.s30 / 30;
            const leadTime = 7;
            const coverageDays = 15;
            const suggested = Math.max(0, Math.ceil((dailyAvg * (leadTime + coverageDays)) - stockLevel));

            // Smart Sourcing Logic
            let recommendedProvider = null;
            const linked = linkedProvidersMap.get(product.id) || [];
            
            if (linked.length > 0) {
                const history = purchaseHistoryMap.get(product.id) || [];
                // Filter history to only include linked providers
                const relevantHistory = history.filter(h => linked.some(l => l.providerId === h.purchaseH.providerId));
                
                if (relevantHistory.length > 0) {
                    const bestPurchase = relevantHistory.reduce((prev, curr) =>
                        Number(curr.unitCost) < Number(prev.unitCost) ? curr : prev
                    );
                    recommendedProvider = {
                        id: bestPurchase.purchaseH.provider.id,
                        name: bestPurchase.purchaseH.provider.name,
                        lastCost: Number(bestPurchase.unitCost)
                    };
                } else {
                    recommendedProvider = {
                        id: linked[0].provider.id,
                        name: linked[0].provider.name,
                        lastCost: null
                    };
                }
            }

            return {
                productId: product.id,
                sku: product.sku,
                name: product.name,
                imageUrl: product.imageUrl,
                branch: branch.name,
                branchId: branch.id,
                stock: stockLevel,
                minStock,
                maxStock,
                sales7: stats.s7,
                sales15: stats.s15,
                sales30: stats.s30,
                dailyAvg: dailyAvg.toFixed(2),
                suggested,
                recommendedProvider
            };
        });

        res.json(report);
    } catch (error) {
        console.error('LOW STOCK REPORT ERROR:', error);
        res.status(500).json({ message: 'Error al obtener reporte de reposición' });
    }
};

const getAllTransfers = async (req, res) => {
    try {
        const { branchId, status } = req.query;
        const where = {};
        
        if (status) where.status = status;
        
        // Non-admin users see only their branch transfers
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            where.OR = [
                { fromBranchId: req.user.branch_id },
                { toBranchId: req.user.branch_id }
            ];
        } else if (branchId) {
            where.OR = [
                { fromBranchId: parseInt(branchId) },
                { toBranchId: parseInt(branchId) }
            ];
        }

        const transfers = await prisma.transfer.findMany({
            where,
            include: {
                fromBranch: true,
                toBranch: true,
                user: true,
                details: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(transfers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener traslados' });
    }
};

const getTransferById = async (req, res) => {
    const { id } = req.params;
    try {
        const transfer = await prisma.transfer.findUnique({
            where: { id: parseInt(id) },
            include: {
                fromBranch: true,
                toBranch: true,
                user: { select: { name: true } },
                details: { include: { product: { select: { name: true, sku: true } } } }
            }
        });
        if (!transfer) return res.status(404).json({ message: 'Traslado no encontrado' });
        res.json(transfer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener el traslado' });
    }
};

module.exports = { getInventoryByBranch, createTransfer, confirmTransfer, getProductKardex, getLowStockReport, updateInventory, getAllTransfers, getTransferById };

const prisma = require('../db');
const { getIO } = require('../services/socketManager');

const createPurchase = async (req, res) => {
    const { branch_id, provider_id, invoice_number, payment_type, details, customDate } = req.body;
    const userId = req.user.id;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Calculate totals and prepare details
            let total = 0;
            const purchaseDetails = details.map(item => {
                const subtotal = Number(item.quantity) * Number(item.unit_cost);
                total += subtotal;
                return {
                    productId: item.productId || item.product_id,
                    quantity: Number(item.quantity),
                    unitCost: Number(item.unit_cost),
                    subtotal: subtotal,
                    batchNumber: item.batchNumber || item.batch_number,
                    expirationDate: item.expirationDate || item.expiration_date ? new Date((item.expirationDate || item.expiration_date) + 'T12:00:00-06:00') : null
                };
            });

            // 2. Create Purchase Header
            const purchase = await tx.purchaseH.create({
                data: {
                    branchId: parseInt(branch_id),
                    userId: userId,
                    providerId: provider_id ? parseInt(provider_id) : null,
                    invoiceNumber: invoice_number,
                    total: total,
                    paymentType: payment_type,
                    balance: payment_type === 'CREDIT' ? total : 0,
                    createdAt: customDate ? new Date(customDate + 'T12:00:00-06:00') : undefined,
                    details: {
                        create: purchaseDetails.map(d => ({
                            productId: d.productId,
                            quantity: d.quantity,
                            unitCost: d.unitCost,
                            subtotal: d.subtotal
                        }))
                    }
                }
            });

            // 3. Update Inventory, Average Cost, and Create Lots
            for (const item of purchaseDetails) {
                // Get current product info for average cost calculation
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    include: { inventory: true }
                });

                if (!product) continue;

                const currentStock = product.inventory.reduce((acc, inv) => acc + inv.stockLevel, 0);
                const currentAvgCost = Number(product.averageCost) || 0;
                const newQuantity = Number(item.quantity) || 0;
                const newUnitCost = Number(item.unitCost) || 0;

                // Weighted Average Cost Calculation
                let newAverageCost = currentAvgCost;

                if (newQuantity > 0) {
                    // Only update cost on incoming stock
                    if (currentAvgCost === 0 && currentStock > 0 && newUnitCost > 0) {
                        // SEEDER LOGIC: If current cost is $0 but we have stock,
                        // this first real cost applies to all existing units.
                        newAverageCost = newUnitCost;
                    } else if (currentStock + newQuantity !== 0) {
                        // Standard Weighted Average
                        newAverageCost = ((currentStock * currentAvgCost) + (newQuantity * newUnitCost)) / (currentStock + newQuantity);
                    } else {
                        newAverageCost = newUnitCost;
                    }
                }
                
                // Fallback for completely invalid math (e.g. creating items where subtotal evaluating to NaN)
                if (isNaN(newAverageCost) || !isFinite(newAverageCost) || newAverageCost == null) {
                    newAverageCost = newUnitCost > 0 ? newUnitCost : 0;
                }
                // If newQuantity <= 0 (Adjustment Out), we keep the currentAverageCost

                // Update Product Average Cost
                await tx.product.update({
                    where: { id: item.productId },
                    data: { averageCost: newAverageCost }
                });

                // Update Inventory Stock Level
                await tx.inventory.upsert({
                    where: {
                        branchId_productId: {
                            branchId: parseInt(branch_id),
                            productId: item.productId
                        }
                    },
                    update: { stockLevel: { increment: item.quantity } },
                    create: {
                        branchId: parseInt(branch_id),
                        productId: item.productId,
                        stockLevel: item.quantity
                    }
                });

                // Create Inventory Lot for batch/expiration tracking
                await tx.inventoryLot.create({
                    data: {
                        productId: item.productId,
                        branchId: parseInt(branch_id),
                        batchNumber: item.batchNumber,
                        expirationDate: item.expirationDate,
                        quantity: item.quantity
                    }
                });
            }

            return purchase;
        });

        // Notify other clients about inventory change
        const io = getIO();
        if (io) io.emit('INVENTORY_UPDATED', { branchId: branch_id });

        res.json({ message: 'Compra registrada, costos recalculados y stock actualizado', purchase_id: result.id });
    } catch (error) {
        console.error("TRANSACTION ERROR:", error);
        require('fs').appendFileSync('/tmp/luckypos_purchase_err.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2) + '\n');
        res.status(500).json({ message: error.message || 'Error al procesar la compra', stack: error.stack });
    }
};

const getAllPurchases = async (req, res) => {
    try {
        const purchases = await prisma.purchaseH.findMany({
            include: { provider: true, details: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener compras' });
    }
};

const getAccountsPayable = async (req, res) => {
    try {
        const purchases = await prisma.purchaseH.findMany({
            where: { balance: { gt: 0 } },
            include: { provider: true, branch: true }
        });
        res.json(purchases);
    } catch (error) {
        console.error('ERROR getAccountsPayable:', error);
        res.status(500).json({ message: error.message || 'Error al obtener cuentas por pagar' });
    }
};

const getPurchaseById = async (req, res) => {
    const { id } = req.params;
    try {
        const purchase = await prisma.purchaseH.findUnique({
            where: { id: parseInt(id) },
            include: {
                provider: true,
                branch: true,
                user: { select: { name: true } },
                details: { include: { product: { select: { name: true, sku: true, averageCost: true } } } }
            }
        });
        if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });
        res.json(purchase);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener la compra' });
    }
};

const payPurchase = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;

    try {
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser un número válido mayor a 0' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const purchase = await tx.purchaseH.findUnique({
                where: { id: parseInt(id) },
                include: { provider: true }
            });

            if (!purchase) throw new Error('Factura no encontrada');
            if (Number(purchase.balance) <= 0) throw new Error('Esta factura ya está pagada');
            if (parsedAmount > Number(purchase.balance)) {
                throw new Error(`El monto supera el saldo pendiente de $${Number(purchase.balance).toFixed(2)}`);
            }

            // 1. Reduce the purchase balance
            const updatedPurchase = await tx.purchaseH.update({
                where: { id: parseInt(id) },
                data: { balance: Number(purchase.balance) - parsedAmount }
            });

            // 2. Auto-create expense record in the purchase's branch
            const providerName = purchase.provider?.name || 'Proveedor Genérico';
            const invoiceRef = purchase.invoiceNumber ? ` (${purchase.invoiceNumber})` : '';
            await tx.expense.create({
                data: {
                    branchId: purchase.branchId,
                    userId,
                    description: `Pago Factura #${purchase.id}${invoiceRef} - ${providerName}`,
                    amount: parsedAmount
                }
            });

            return updatedPurchase;
        });

        res.json({ message: 'Pago registrado y gasto generado con éxito', purchase: result });
    } catch (error) {
        console.error('Error paying purchase:', error);
        res.status(500).json({ message: error.message || 'Error al registrar el pago' });
    }
};

const markAsPaid = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const purchase = await prisma.purchaseH.findUnique({ where: { id: parseInt(id) } });
        if (!purchase) return res.status(404).json({ message: 'Factura no encontrada' });
        if (Number(purchase.balance) <= 0) return res.status(400).json({ message: 'Esta factura ya está marcada como pagada' });

        await prisma.purchaseH.update({
            where: { id: parseInt(id) },
            data: { balance: 0 }
        });

        res.json({ message: 'Factura marcada como pagada sin registrar gasto' });
    } catch (error) {
        console.error('Error marking purchase as paid:', error);
        res.status(500).json({ message: error.message || 'Error al marcar factura' });
    }
};

module.exports = { createPurchase, getAllPurchases, getAccountsPayable, getPurchaseById, payPurchase, markAsPaid };

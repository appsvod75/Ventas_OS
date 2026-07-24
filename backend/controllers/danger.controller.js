const prisma = require('../db');
const bcrypt = require('bcryptjs');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');

const resetSales = async (req, res) => {
    const { pin } = req.body;

    const isSuperAdmin = await hasPermission(req.user.id, PERMISSIONS.ALL);
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Acceso denegado: Solo Super Admin puede realizar esta acción.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
        return res.status(401).json({ message: 'PIN de seguridad incorrecto' });
    }

    try {
        await prisma.$transaction([
            prisma.paymentApplication.deleteMany(),
            prisma.clientPayment.deleteMany(),
            prisma.saleD.deleteMany(),
            prisma.saleH.deleteMany(),
            prisma.cashClosing.deleteMany(),
            prisma.expense.deleteMany(),
            prisma.inventoryLot.deleteMany(),
            prisma.inventory.updateMany({ data: { stockLevel: 0 } })
        ]);

        // Reset autoincrement counter in SQLite
        try {
            await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence WHERE name = 'SaleH'");
        } catch (_) {}

        res.json({ message: 'Datos de ventas y financieros eliminados correctamente. Inventario reiniciado a cero.' });
    } catch (error) {
        console.error('Error in resetSales:', error);
        res.status(500).json({ message: 'Error al eliminar datos de ventas' });
    }
};

const resetInventory = async (req, res) => {
    const { pin } = req.body;

    const isSuperAdmin = await hasPermission(req.user.id, PERMISSIONS.ALL);
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Acceso denegado: Solo Super Admin puede realizar esta acción.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
        return res.status(401).json({ message: 'PIN de seguridad incorrecto' });
    }

    try {
        await prisma.$transaction([
            prisma.inventory.updateMany({
                data: { stockLevel: 0 }
            }),
            prisma.inventoryLot.deleteMany()
        ]);

        res.json({ message: 'Stock de inventario reiniciado a cero' });
    } catch (error) {
        console.error('Error in resetInventory:', error);
        res.status(500).json({ message: 'Error al reiniciar inventario' });
    }
};

const resetProducts = async (req, res) => {
    const { pin } = req.body;

    const isSuperAdmin = await hasPermission(req.user.id, PERMISSIONS.ALL);
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Acceso denegado: Solo Super Admin puede realizar esta acción.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
        return res.status(401).json({ message: 'PIN de seguridad incorrecto' });
    }

    try {
        await prisma.$transaction([
            prisma.aiCache.deleteMany(),
            prisma.productVariant.deleteMany(),
            prisma.productProvider.deleteMany(),
            prisma.inventoryLot.deleteMany(),
            prisma.inventory.deleteMany(),
            prisma.saleD.deleteMany(),
            prisma.purchaseD.deleteMany(),
            prisma.transferDetail.deleteMany(),
            prisma.product.deleteMany()
        ]);

        res.json({ message: 'Todos los productos y sus datos asociados han sido eliminados correctamente' });
    } catch (error) {
        console.error('Error in resetProducts:', error);
        res.status(500).json({ message: 'Error al eliminar productos' });
    }
};

const resetSaleCounter = async (req, res) => {
    const { pin } = req.body;
    const isSuperAdmin = await hasPermission(req.user.id, PERMISSIONS.ALL);
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Acceso denegado' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
        return res.status(401).json({ message: 'PIN incorrecto' });
    }
    try {
        await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence WHERE name = 'SaleH'");
        await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence WHERE name = 'SaleD'");
        res.json({ message: 'Contador de ventas reiniciado. La próxima venta será #1.' });
    } catch (error) {
        console.error('Error resetting counter:', error);
        res.status(500).json({ message: 'Error al reiniciar contador' });
    }
};

module.exports = {
    resetSales,
    resetInventory,
    resetProducts,
    resetSaleCounter
};

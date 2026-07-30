const prisma = require('../db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
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

const backupDatabase = async (req, res) => {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/DATABASE_URL="file:(.+?)"/);
        if (!match) return res.status(500).json({ message: 'No se pudo determinar la ruta de la DB' });

        const dbPath = match[1].replace(/\\/g, '');
        const dbDir = path.dirname(dbPath);
        const dbBase = path.basename(dbPath, '.db');
        const files = [dbPath, path.join(dbDir, dbBase + '.db-wal'), path.join(dbDir, dbBase + '.db-shm')]
            .filter(f => fs.existsSync(f));

        const { ZipArchive } = require('archiver');
        const zip = new ZipArchive();
        for (const f of files) {
            zip.file(f, { name: path.basename(f) });
        }
        zip.finalize();

        const date = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="backup-ventasee-${date}.zip"`);
        zip.pipe(res);
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ message: 'Error al generar backup' });
    }
};

module.exports = {
    resetSales,
    resetInventory,
    resetProducts,
    resetSaleCounter,
    backupDatabase
};

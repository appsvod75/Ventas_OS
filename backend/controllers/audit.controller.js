const prisma = require('../db');

const getAllLogs = async (req, res) => {
    const { branch_id, limit = 100 } = req.query;
    try {
        const logs = await prisma.auditLog.findMany({
            where: branch_id ? { branchId: parseInt(branch_id) } : {},
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
            include: {
                user: { select: { name: true } },
                branch: { select: { name: true } }
            }
        });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener bitácora' });
    }
};

module.exports = { getAllLogs };

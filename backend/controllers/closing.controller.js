const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');

const getClosings = async (req, res) => {
    try {
        const { branchId, startDate, endDate, page = 1, limit = 15 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const whereClause = {};
        
        // Non-admin users are locked to their branch
        let targetBranchId = branchId;
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            targetBranchId = req.user.branch_id;
        }

        if (targetBranchId) {
            whereClause.branchId = parseInt(targetBranchId);
        }

        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date.gte = new Date(`${startDate}T00:00:00-06:00`);
            if (endDate) whereClause.date.lte = new Date(`${endDate}T23:59:59-06:00`);
        }

        // Filter out empty days (no sales AND no expenses)
        whereClause.OR = [
            { totalSales: { gt: 0 } },
            { totalExpenses: { gt: 0 } }
        ];

        // Calculate initial balance (cumulative net before current filter/start)
        const initialBalanceWhere = { ...whereClause };
        if (whereClause.date?.gte) {
            initialBalanceWhere.date = { lt: whereClause.date.gte };
        } else {
            // If no start date, we don't need initial balance or it's implicitly 0
            delete initialBalanceWhere.date; 
        }

        const [closings, total, prevBalanceSum] = await Promise.all([
            prisma.cashClosing.findMany({
                where: whereClause,
                include: {
                    branch: { select: { name: true } }
                },
                orderBy: {
                    date: 'desc'
                },
                skip,
                take: Number(limit)
            }),
            prisma.cashClosing.count({ where: whereClause }),
            whereClause.date?.gte ? prisma.cashClosing.aggregate({
                _sum: { netAmount: true },
                where: initialBalanceWhere
            }) : null
        ]);

        res.json({
            data: closings,
            initialBalance: prevBalanceSum?._sum?.netAmount ? Number(prevBalanceSum._sum.netAmount) : 0,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching cash closings:', error);
        res.status(500).json({ message: 'Error al obtener cierres de caja' });
    }
};

const forceClosing = async (req, res) => {
    try {
        const { date } = req.body;
        const targetDate = date ? new Date(`${date}T12:00:00-06:00`) : new Date();
        
        // Lazy load service to avoid circular dependency crash
        const { runClosingForDate } = require('../services/cron.service');
        await runClosingForDate(targetDate);
        
        res.json({ message: `Cierre de caja recalculado para ${targetDate.toLocaleDateString()}` });
    } catch (error) {
        console.error('Error in forceClosing:', error);
        res.status(500).json({ message: 'Error ejecutando el cierre manualmente' });
    }
};

const getTodaySummary = async (req, res) => {
    try {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const start = new Date(`${todayStr}T00:00:00-06:00`);
        const end = new Date(`${todayStr}T23:59:59-06:00`);
        const user_role = req.user.role;
        const user_branch_id = req.user.branch_id;

        const whereClause = {
            createdAt: {
                gte: start,
                lte: end
            },
            reversedAt: null
        };

        if (user_role !== 'Super Admin' && user_role !== 'Admin') {
            whereClause.branchId = user_branch_id;
        }

        const sales = await prisma.saleH.aggregate({
            _sum: { total: true, discount: true, shipping: true },
            where: whereClause
        });

        const expenses = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: whereClause
        });

        const totalSales = Number(sales._sum.total || 0);
        const totalShipping = Number(sales._sum.shipping || 0);
        const totalDiscounts = Number(sales._sum.discount || 0);
        const totalExpenses = Number(expenses._sum.amount || 0);
        const totalWithShipping = totalSales + totalShipping;

        const grossSales = totalWithShipping + totalDiscounts;
        res.json({
            todayStart: start,
            todayEnd: end,
            totalSales,
            totalShipping,
            totalDiscounts,
            grossSales,
            totalExpenses,
            netAmount: grossSales - totalExpenses
        });
    } catch (error) {
        console.error('Error fetching today summary:', error);
        res.status(500).json({ message: 'Error calculando el resumen de hoy' });
    }
};

const getClosingDetails = async (req, res) => {
    try {
        const { date, branchId } = req.query;
        if (!date || !branchId) return res.status(400).json({ message: 'Fecha y sucursal requeridos' });

        const start = new Date(`${date}T00:00:00-06:00`);
        const end = new Date(`${date}T23:59:59-06:00`);

        const [sales, expenses] = await Promise.all([
            prisma.saleH.findMany({
                where: { branchId: parseInt(branchId), createdAt: { gte: start, lte: end } },
                include: { client: { select: { name: true } }, user: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.expense.findMany({
                where: { branchId: parseInt(branchId), createdAt: { gte: start, lte: end } },
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            })
        ]);

        // Combine and format for a "Daily Kardex" view
        const movements = [
            ...sales.map(s => ({
                id: s.id,
                time: s.createdAt,
                type: 'SALE',
                description: `Venta #${s.id} - ${s.client?.name || 'Varios'}`,
                amount: Number(s.total || 0),
                user: s.user?.name
            })),
            ...expenses.map(e => ({
                id: e.id,
                time: e.createdAt,
                type: 'EXPENSE',
                description: e.description,
                amount: -Number(e.amount || 0),
                user: e.user?.name
            }))
        ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        res.json(movements);
    } catch (error) {
        console.error('Error fetching closing details:', error);
        res.status(500).json({ message: 'Error al obtener detalle del día' });
    }
};

module.exports = {
    getClosings,
    forceClosing,
    getTodaySummary,
    getClosingDetails
};

const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');
const { toSVDate, toSVNoon, toSVEndOfDay } = require('../utils/tz');

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
            if (startDate) whereClause.date.gte = toSVDate(startDate);
            if (endDate) whereClause.date.lte = toSVEndOfDay(endDate);
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
        const targetDate = date ? toSVNoon(date) : new Date();
        
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
        const start = toSVDate(todayStr);
        const end = toSVEndOfDay(todayStr);
        const user_role = req.user.role;
        const user_branch_id = req.user.branch_id;

        const whereClause = {
            createdAt: {
                gte: start,
                lte: end
            }
        };

        if (user_role !== 'Super Admin' && user_role !== 'Admin') {
            whereClause.branchId = user_branch_id;
        }

        const sales = await prisma.saleH.aggregate({
            _sum: { total: true, discount: true, shipping: true },
            where: { ...whereClause, reversedAt: null }
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

const getPeriodSummary = async (req, res) => {
    try {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const now = new Date();
        const user_role = req.user.role;
        const user_branch_id = req.user.branch_id;

        let branchId = req.query.branchId ? parseInt(req.query.branchId) : null;
        if (user_role !== 'Super Admin' && user_role !== 'Admin') {
            branchId = user_branch_id;
        }

        const branches = branchId
            ? await prisma.branch.findMany({ where: { id: branchId } })
            : await prisma.branch.findMany({ where: { isActive: true } });

        let periodStart = null;
        let periodLabel = 'Hoy';
        let closingType = 'daily';

        if (branches.length > 0) {
            const refBranch = branches[0];
            closingType = refBranch.closingType || 'daily';

            if (closingType === 'periodic') {
                const lastOpening = await prisma.cashOpening.findFirst({
                    where: { branchId: refBranch.id, closedAt: null, date: { lte: now } },
                    orderBy: { date: 'desc' }
                });
                if (lastOpening) {
                    periodStart = new Date(lastOpening.date);
                    const sDate = new Date(periodStart);
                    let endLabel;
                    if (refBranch.closeDay >= refBranch.openDay) {
                        endLabel = new Date(sDate);
                        endLabel.setDate(sDate.getDate() + (refBranch.closeDay - refBranch.openDay));
                    } else {
                        endLabel = new Date(sDate);
                        endLabel.setDate(sDate.getDate() + (7 - refBranch.openDay + refBranch.closeDay));
                    }
                    periodLabel = `${sDate.toLocaleDateString('es-SV', { weekday: 'short', day: '2-digit', month: '2-digit' })} → ${endLabel.toLocaleDateString('es-SV', { weekday: 'short', day: '2-digit', month: '2-digit' })}`;
                }
            }

            if (!periodStart) {
                periodStart = toSVDate(todayStr);
                periodLabel = 'Hoy';
            }
        } else {
            periodStart = toSVDate(todayStr);
        }

        const whereClause = {
            createdAt: { gte: periodStart, lte: now },
            reversedAt: null
        };
        const whereClauseExpenses = { createdAt: { gte: periodStart, lte: now } };
        if (branchId) {
            whereClause.branchId = branchId;
            whereClauseExpenses.branchId = branchId;
        }

        const sales = await prisma.saleH.aggregate({
            _sum: { total: true, discount: true, shipping: true },
            where: whereClause,
            _count: { id: true }
        });
        const expenses = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: whereClauseExpenses
        });

        const totalSales = Number(sales._sum.total || 0);
        const totalShipping = Number(sales._sum.shipping || 0);
        const totalDiscounts = Number(sales._sum.discount || 0);
        const totalExpenses = Number(expenses._sum.amount || 0);
        const salesCount = sales._count.id || 0;
        const grossSales = totalSales + totalShipping + totalDiscounts;

        res.json({
            periodLabel,
            closingType,
            periodStart,
            periodEnd: now,
            totalSales,
            totalShipping,
            totalDiscounts,
            grossSales,
            totalExpenses,
            netAmount: grossSales - totalExpenses,
            salesCount
        });
    } catch (error) {
        console.error('Error fetching period summary:', error);
        res.status(500).json({ message: 'Error calculando el resumen del periodo' });
    }
};

const getClosingDetails = async (req, res) => {
    try {
        const { date, branchId } = req.query;
        if (!date || !branchId) return res.status(400).json({ message: 'Fecha y sucursal requeridos' });

        const start = toSVDate(date);
        const end = toSVEndOfDay(date);

        const [sales, expenses, opening, creditPayments] = await Promise.all([
            prisma.saleH.findMany({
                where: { branchId: parseInt(branchId), createdAt: { gte: start, lte: end }, reversedAt: null },
                include: { client: { select: { name: true } }, user: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.expense.findMany({
                where: { branchId: parseInt(branchId), createdAt: { gte: start, lte: end } },
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.cashOpening.findUnique({
                where: { branchId_date: { branchId: parseInt(branchId), date: start } }
            }),
            prisma.clientPayment.findMany({
                where: { createdAt: { gte: start, lte: end } },
                include: { user: { select: { name: true } }, client: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            })
        ]);

        const paymentBreakdown = {};
        sales.forEach(s => {
            const m = s.paymentMethod || 'OTRO';
            if (!paymentBreakdown[m]) paymentBreakdown[m] = { count: 0, total: 0 };
            paymentBreakdown[m].count++;
            paymentBreakdown[m].total += Number(s.total || 0);
        });

        const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
        const cashSalesTotal = sales
            .filter(s => s.paymentMethod === 'EFECTIVO')
            .reduce((acc, s) => acc + Number(s.total || 0), 0);
        const cashCreditPayments = creditPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const openingAmount = opening ? Number(opening.amount || 0) : 0;
        const cashExpected = openingAmount + cashSalesTotal + cashCreditPayments - totalExpenses;

        const movements = [
            ...sales.map(s => ({
                id: s.id,
                time: s.createdAt,
                type: 'SALE',
                method: s.paymentMethod,
                description: `Venta #${s.id} - ${s.client?.name || 'Varios'}`,
                amount: Number(s.total || 0),
                balance: Number(s.balance || 0),
                user: s.user?.name
            })),
            ...creditPayments.map(p => ({
                id: `pay-${p.id}`,
                time: p.createdAt,
                type: 'PAYMENT',
                method: 'EFECTIVO',
                description: `Abono a crédito - ${p.client?.name || 'Cliente'}`,
                amount: Number(p.amount || 0),
                balance: 0,
                user: p.user?.name
            })),
            ...expenses.map(e => ({
                id: `exp-${e.id}`,
                time: e.createdAt,
                type: 'EXPENSE',
                method: 'EFECTIVO',
                description: e.description,
                amount: -Number(e.amount || 0),
                balance: 0,
                user: e.user?.name
            }))
        ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        res.json({
            movements,
            paymentBreakdown,
            cashSummary: {
                openingAmount,
                cashSalesTotal,
                cashCreditPayments,
                totalExpenses,
                cashExpected
            }
        });
    } catch (error) {
        console.error('Error fetching closing details:', error);
        res.status(500).json({ message: 'Error al obtener detalle del día' });
    }
};

module.exports = {
    getClosings,
    forceClosing,
    getTodaySummary,
    getPeriodSummary,
    getClosingDetails
};

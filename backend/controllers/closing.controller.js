const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');
const { toSVDate, toSVNoon, toSVEndOfDay } = require('../utils/tz');

const getClosings = async (req, res) => {
    try {
        const { branchId, startDate, endDate, page = 1, limit = 15, includeEmpty } = req.query;
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

        // Filter out empty days (no sales AND no expenses), unless includeEmpty is requested
        const showEmpty = includeEmpty === '1' || includeEmpty === 'true' || includeEmpty === true;
        if (!showEmpty) {
            whereClause.OR = [
                { totalSales: { gt: 0 } },
                { totalExpenses: { gt: 0 } }
            ];
        }

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
        const { processed, skipped } = await runClosingForDate(targetDate, { force: true });
        
        res.json({
            message: `Cierre de caja recalculado para ${targetDate.toLocaleDateString()}`,
            processed,
            skipped
        });
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
                const sDate = periodStartFor(now, refBranch);
                periodStart = sDate;
                const endDate = new Date(`${closeDayKeyFor(sDate, refBranch)}T00:00:00-06:00`);
                periodLabel = `${sDate.toLocaleDateString('es-SV', { weekday: 'short', day: '2-digit', month: '2-digit' })} → ${endDate.toLocaleDateString('es-SV', { weekday: 'short', day: '2-digit', month: '2-digit' })}`;
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
            netAmount: totalSales - totalExpenses,
            salesCount
        });
    } catch (error) {
        console.error('Error fetching period summary:', error);
        res.status(500).json({ message: 'Error calculando el resumen del periodo' });
    }
};

const getClosingDetails = async (req, res) => {
    try {
        const { date, endDate, branchId } = req.query;
        if (!date || !branchId) return res.status(400).json({ message: 'Fecha y sucursal requeridos' });

        const start = toSVDate(date);
        const end = endDate ? toSVEndOfDay(endDate) : toSVEndOfDay(date);

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

const svDateKey = (date) => date.toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });

const periodStartFor = (date, branch) => {
    const day = svDateKey(date);
    if (branch.closingType === 'periodic') {
        const d = new Date(`${day}T00:00:00-06:00`);
        const weekday = d.getDay();
        const openDay = branch.openDay || 1;
        const offset = (weekday - openDay + 7) % 7;
        d.setDate(d.getDate() - offset);
        return d;
    }
    return new Date(`${day}T00:00:00-06:00`);
};

const closeDayKeyFor = (periodStart, branch) => {
    const day = svDateKey(periodStart);
    const d = new Date(`${day}T00:00:00-06:00`);
    let offset;
    if (branch.closingType === 'periodic') {
        const openDay = branch.openDay || 1;
        const closeDay = branch.closeDay || 6;
        offset = closeDay >= openDay ? (closeDay - openDay) : (7 - openDay + closeDay);
    } else {
        offset = 0;
    }
    d.setDate(d.getDate() + offset);
    return svDateKey(d);
};

const getPeriodClosings = async (req, res) => {
    try {
        const { branchId, startDate, endDate } = req.query;
        const user_role = req.user.role;
        const user_branch_id = req.user.branch_id;

        let targetBranchId = branchId ? parseInt(branchId) : null;
        if (user_role !== 'Super Admin' && user_role !== 'Admin') {
            targetBranchId = user_branch_id;
        }

        const branches = targetBranchId
            ? await prisma.branch.findMany({ where: { id: targetBranchId } })
            : await prisma.branch.findMany({ where: { isActive: true } });

        const startFilter = startDate ? toSVDate(startDate) : null;
        const endFilter = endDate ? toSVEndOfDay(endDate) : null;

        let initialBalance = 0;
        const rows = [];

        for (const branch of branches) {
            const [sales, expenses, openings, closings] = await Promise.all([
                prisma.saleH.findMany({
                    where: { branchId: branch.id, reversedAt: null },
                    select: { createdAt: true, total: true, shipping: true }
                }),
                prisma.expense.findMany({
                    where: { branchId: branch.id },
                    select: { createdAt: true, amount: true }
                }),
                prisma.cashOpening.findMany({
                    where: { branchId: branch.id },
                    select: { date: true, closedAt: true }
                }),
                prisma.cashClosing.findMany({
                    where: { branchId: branch.id },
                    select: { date: true }
                })
            ]);

            const currentPeriodKey = svDateKey(periodStartFor(new Date(), branch));

const buckets = {};
            const touch = (key) => {
                if (!buckets[key]) buckets[key] = { sales: 0, shipping: 0, count: 0, expenses: 0 };
            };

            for (const s of sales) {
                const key = svDateKey(periodStartFor(s.createdAt, branch));
                touch(key);
                buckets[key].sales += Number(s.total || 0);
                buckets[key].shipping += Number(s.shipping || 0);
                buckets[key].count += 1;
            }
            for (const e of expenses) {
                const key = svDateKey(periodStartFor(e.createdAt, branch));
                touch(key);
                buckets[key].expenses += Number(e.amount || 0);
            }

            const openingsByPeriod = {};
            for (const o of openings) {
                const key = svDateKey(periodStartFor(o.date, branch));
                if (!openingsByPeriod[key]) openingsByPeriod[key] = { exists: false, closedAt: null };
                openingsByPeriod[key].exists = true;
                if (o.closedAt) openingsByPeriod[key].closedAt = true;
            }

            const closingDays = new Set(closings.map(c => svDateKey(c.date)));

            // The current period always appears (live)
            touch(currentPeriodKey);

            const keys = Object.keys(buckets).sort();

            for (const key of keys) {
                const b = buckets[key];
                const periodStart = new Date(`${key}T00:00:00-06:00`);
                const closeDayKey = closeDayKeyFor(periodStart, branch);
                const hasOpening = !!openingsByPeriod[key]?.exists;
                const hasClosing = closingDays.has(closeDayKey);
                const closed = !!openingsByPeriod[key]?.closedAt || hasClosing;
                const isCurrent = key === currentPeriodKey;

                // Skip periods with no activity (no sales, no expenses, no opening, no closing)
                if (!isCurrent && b.sales === 0 && b.expenses === 0 && !hasOpening && !hasClosing) continue;

                const netAmount = b.sales - b.expenses;
                const periodEnd = new Date(`${closeDayKey}T00:00:00-06:00`);

                const inRange = (!startFilter || periodStart >= startFilter) && (!endFilter || periodStart <= endFilter);
                if (inRange) {
                    rows.push({
                        id: `period-${branch.id}-${key}`,
                        branchId: branch.id,
                        branchName: branch.name,
                        periodStart,
                        periodEnd,
                        estado: closed ? 'closed' : 'open',
                        totalSales: b.sales + b.shipping,
                        totalShipping: b.shipping,
                        totalExpenses: b.expenses,
                        netAmount,
                        salesCount: b.count
                    });
                } else if (startFilter && periodStart < startFilter) {
                    initialBalance += netAmount;
                }
            }
        }

        rows.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

        res.json({ data: rows, initialBalance });
    } catch (error) {
        console.error('Error fetching period closings:', error);
        res.status(500).json({ message: 'Error al obtener cortes por período' });
    }
};

module.exports = {
    getClosings,
    forceClosing,
    getTodaySummary,
    getPeriodSummary,
    getClosingDetails,
    getPeriodClosings
};

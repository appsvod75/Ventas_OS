const prisma = require('../db');
const { startOfMonth, endOfMonth, format, differenceInDays, isSameMonth } = require('date-fns');

const getProjections = async (req, res) => {
    try {
        const { branchId, monthYear } = req.query; 
        const month = monthYear || format(new Date(), 'yyyy-MM');
        
        if (!branchId) return res.status(400).json({ message: 'branchId es requerido' });

        const goal = await prisma.salesGoal.findUnique({
            where: {
                branchId_monthYear: {
                    branchId: parseInt(branchId),
                    monthYear: month
                }
            }
        });

        if (!goal) return res.json(null);

        const start = new Date(month + '-01T00:00:00-06:00');
        const end = new Date(new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0] + 'T23:59:59-06:00');
        
        // Forzamos el día local para calcular días transcurridos
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const nowLocal = new Date(`${todayStr}T12:00:00-06:00`);
        
        // Detailed sales by day for the chart
        const salesData = await prisma.saleH.findMany({
            where: {
                branchId: parseInt(branchId),
                createdAt: { gte: start, lte: end }
            },
            select: { total: true, createdAt: true }
        });

        const dailyMap = {};
        salesData.forEach(s => {
            const day = s.createdAt.getDate();
            dailyMap[day] = (dailyMap[day] || 0) + Number(s.total);
        });

        const numDays = getDaysInMonth(start);
        const dailySales = [];
        for (let i = 1; i <= numDays; i++) {
            dailySales.push({ day: i, total: dailyMap[i] || 0 });
        }

        const currentSales = Number(salesData.reduce((acc, curr) => acc + Number(curr.total), 0));
        
        let elapsedDays = 0;
        if (nowLocal.getFullYear() === start.getFullYear() && nowLocal.getMonth() === start.getMonth()) {
            elapsedDays = nowLocal.getDate();
        } else {
            elapsedDays = numDays;
        }

        const dailyAverage = currentSales / (elapsedDays || 1);
        const projectionValue = dailyAverage * goal.totalWorkDays;
        
        const daysLeft = Math.max(0, goal.totalWorkDays - elapsedDays);
        const dailyNeeded = daysLeft > 0 ? (Number(goal.targetAmount) - currentSales) / daysLeft : 0;

        res.json({
            ...goal,
            currentSales,
            elapsedDays,
            dailyAverage,
            projection: projectionValue,
            daysLeft,
            dailyNeeded,
            dailySales
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener proyecciones' });
    }
};

const getGoals = async (req, res) => {
    try {
        const { branchId } = req.query;
        const goals = await prisma.salesGoal.findMany({
            where: { branchId: parseInt(branchId) },
            orderBy: { monthYear: 'desc' }
        });
        
        // Add current_sales for each goal for the history view
        const enrichedGoals = await Promise.all(goals.map(async (goal) => {
            const start = new Date(goal.monthYear + '-01T00:00:00-06:00');
            const end = new Date(new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0] + 'T23:59:59-06:00');
            const sales = await prisma.saleH.aggregate({
                where: {
                    branchId: goal.branchId,
                    createdAt: { gte: start, lte: end }
                },
                _sum: { total: true }
            });
            return {
                ...goal,
                current_sales: Number(sales._sum.total || 0)
            };
        }));

        res.json(enrichedGoals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener historial de metas' });
    }
};

const saveGoal = async (req, res) => {
    try {
        const { branchId, monthYear, targetAmount, totalWorkDays } = req.body;
        
        const goal = await prisma.salesGoal.upsert({
            where: {
                branchId_monthYear: {
                    branchId: parseInt(branchId),
                    monthYear
                }
            },
            update: {
                targetAmount: parseFloat(targetAmount),
                totalWorkDays: parseInt(totalWorkDays)
            },
            create: {
                branchId: parseInt(branchId),
                monthYear,
                targetAmount: parseFloat(targetAmount),
                totalWorkDays: parseInt(totalWorkDays)
            }
        });

        res.json(goal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar meta de ventas' });
    }
};

function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

module.exports = { getProjections, getGoals, saveGoal };

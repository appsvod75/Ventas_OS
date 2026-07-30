const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');

const getDashboardStats = async (req, res) => {
    try {
        const { branchId, date } = req.query;
        // Forzamos el offset El Salvador para que "Hoy" sea el día local.
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const targetDateStr = date || todayStr;

        const start = new Date(`${targetDateStr}T00:00:00-06:00`);
        const end = new Date(`${targetDateStr}T23:59:59-06:00`);

        const whereClause = {
            createdAt: {
                gte: start,
                lte: end
            },
            reversedAt: null
        };

        if (branchId) {
            whereClause.branchId = parseInt(branchId);
        }

        // 1. Get Sales
        const sales = await prisma.saleH.findMany({
            where: whereClause,
            include: {
                branch: { select: { name: true } }
            }
        });

        const totalAmount = sales.reduce((acc, s) => acc + Number(s.total || 0) + Number(s.shipping || 0), 0);
        const totalCount = sales.length;

        // Group by branch for cards details
        const branchesStats = {};
        sales.forEach(s => {
            const bName = s.branch?.name || 'Desconocida';
            if (!branchesStats[bName]) {
                branchesStats[bName] = { amount: 0, count: 0 };
            }
            branchesStats[bName].amount += Number(s.total || 0) + Number(s.shipping || 0);
            branchesStats[bName].count += 1;
        });

        // 2. Low Stock Products (Global)
        // Note: Field comparison in Prisma count/where
        const lowStockCount = await prisma.inventory.count({
            where: {
                stockLevel: { lte: prisma.inventory.fields.minStock }
            }
        });

        // 3. New Clients Today
        const newClientsCount = await prisma.client.count({
            where: {
                createdAt: { gte: start, lte: end }
            }
        });

        // 4. Total Expenses Today
        const expenses = await prisma.expense.findMany({
            where: whereClause,
            select: { amount: true }
        });
        const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

        res.json({
            sales: {
                totalAmount,
                totalCount,
                branches: branchesStats
            },
            totalExpenses,
            lowStockCount,
            newClientsCount
        });

    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas del dashboard' });
    }
};

const getReports = async (req, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;
        
        // Forzamos el offset El Salvador para los reportes
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        
        const startStr = startDate ? `${startDate}T00:00:00-06:00` : `${todayStr}T00:00:00-06:00`;
        const endStr = endDate ? `${endDate}T23:59:59-06:00` : `${todayStr}T23:59:59-06:00`;

        const start = new Date(startStr);
        const end = new Date(endStr);
        
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
        } else if (branchId) {
            whereClause.branchId = parseInt(branchId);
        }

        // 1. Sales & Expenses Totals
        const sales = await prisma.saleH.findMany({
            where: whereClause,
            select: { total: true, discount: true, paymentMethod: true, balance: true, createdAt: true }
        });

        const expenses = await prisma.expense.findMany({
            where: whereClause,
            select: { amount: true }
        });

        const totalSales = sales.reduce((acc, s) => acc + Number(s.total), 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

        // 2. Top Clients Logic (Multi-metric)
        // We aggregate sales by clientId, excluding ID 1 (Clientes Varios)
        const clientStats = await prisma.saleH.groupBy({
            by: ['clientId'],
            where: {
                ...whereClause,
                clientId: { not: 1 }
            },
            _sum: {
                total: true,
                balance: true
            },
            _count: {
                id: true
            },
            orderBy: {
                _sum: {
                    total: 'desc'
                }
            },
            take: 20
        });

        // Get client names and current total debt (not just period debt)
        const topClients = await Promise.all(clientStats.map(async (stat) => {
            const client = await prisma.client.findUnique({
                where: { id: stat.clientId },
                select: { name: true }
            });

            // Calculate current TOTAL debt (all time)
            const allTimeSales = await prisma.saleH.findMany({
                where: { clientId: stat.clientId },
                select: { balance: true }
            });
            const totalCurrentDebt = allTimeSales.reduce((acc, s) => acc + Number(s.balance), 0);

            return {
                id: stat.clientId,
                name: client?.name || 'Cliente ELIMINADO',
                consumption: stat._sum.total || 0,
                visits: stat._count.id || 0,
                periodDebt: stat._sum.balance || 0,
                totalCurrentDebt: totalCurrentDebt
            };
        }));

        // 3. Top Products
        const saleDetails = await prisma.saleD.findMany({
            where: {
                saleH: whereClause
            },
            include: {
                product: { select: { name: true } }
            }
        });

        const productMap = {};
        saleDetails.forEach(d => {
            const pid = d.productId;
            if (!productMap[pid]) {
                productMap[pid] = { name: d.product.name, quantity: 0, revenue: 0 };
            }
            productMap[pid].quantity += d.quantity;
            productMap[pid].revenue += Number(d.subtotal);
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 15);

        // 4. Payment Methods Breakdown
        const paymentMethods = sales.reduce((acc, s) => {
            acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + Number(s.total);
            return acc;
        }, {});

        // 5. Sales Trend (by day)
        const trend = sales.reduce((acc, s) => {
            const date = s.createdAt.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = 0;
            acc[date] += Number(s.total);
            return acc;
        }, {});

        const salesTrend = Object.entries(trend).map(([date, amount]) => ({ date, amount }));

        // 6. Sales by User
        const userStats = await prisma.saleH.groupBy({
            by: ['userId'],
            where: whereClause,
            _sum: { total: true },
            _count: { id: true },
            orderBy: { _sum: { total: 'desc' } }
        });

        const salesByUser = await Promise.all(userStats.map(async (stat) => {
            try {
                if (!stat.userId) {
                    return {
                        id: 'system',
                        name: 'Sistema / Varios',
                        role: '-',
                        total: Number(stat._sum.total || 0),
                        count: stat._count.id || 0
                    };
                }
                const user = await prisma.user.findUnique({
                    where: { id: stat.userId },
                    select: { name: true, role: true }
                });
                return {
                    id: stat.userId,
                    name: user?.name || 'Usuario ELIMINADO',
                    role: user?.role || '-',
                    total: Number(stat._sum.total || 0),
                    count: stat._count.id || 0
                };
            } catch (uErr) {
                console.error(`Error fetching user ${stat.userId} for report:`, uErr);
                return {
                    id: stat.userId || `err-${Math.random()}`,
                    name: 'Error de Datos',
                    role: '-',
                    total: Number(stat._sum.total || 0),
                    count: stat._count.id || 0
                };
            }
        }));

        // 7. Branch Performance
        const branchStats = await prisma.saleH.groupBy({
            by: ['branchId'],
            where: whereClause,
            _sum: { total: true },
            _count: { id: true },
            orderBy: { _sum: { total: 'desc' } }
        });

        const branchPerformance = await Promise.all(branchStats.map(async (stat) => {
            const branch = await prisma.branch.findUnique({
                where: { id: stat.branchId },
                select: { name: true }
            });
            return {
                id: stat.branchId,
                name: branch?.name || 'Sucursal ELIMINADA',
                total: Number(stat._sum.total || 0),
                count: stat._count.id || 0
            };
        }));

        res.json({
            summary: {
                totalSales,
                totalExpenses,
                netAmount: totalSales - totalExpenses,
                salesCount: sales.length
            },
            topClients,
            topProducts,
            paymentMethods,
            salesTrend,
            salesByUser,
            branchPerformance
        });

    } catch (error) {
        console.error('CRITICAL REPORT ERROR:', error);
        res.status(500).json({ 
            message: 'Error al generar reportes', 
            details: error.message,
            stack: error.stack
        });
    }
};

const getSalesBySeller = async (req, res) => {
    try {
        const { startDate, endDate, sellerId, branchId } = req.query;
        const start = new Date(`${startDate || '2000-01-01'}T00:00:00-06:00`);
        const end = new Date(`${endDate || '2100-12-31'}T23:59:59-06:00`);

        const whereSale = {
            createdAt: { gte: start, lte: end },
            reversedAt: null
        };
        if (branchId) whereSale.branchId = parseInt(branchId);
        if (sellerId) whereSale.userId = parseInt(sellerId);

        const sales = await prisma.saleH.findMany({
            where: whereSale,
            include: {
                user: { select: { id: true, name: true } },
                details: {
                    include: { product: { select: { name: true, commissionType: true, commissionValue: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Agrupar por vendedor
        const bySeller = {};
        for (const sale of sales) {
            const uid = sale.userId;
            if (!bySeller[uid]) {
                bySeller[uid] = {
                    userId: uid,
                    sellerName: sale.user?.name || 'Sistema',
                    totalSales: 0,
                    totalCommission: 0,
                    saleCount: 0,
                    details: []
                };
            }
            const s = bySeller[uid];
            s.saleCount++;
            s.totalSales += Number(sale.total) + Number(sale.shipping || 0);
            for (const d of sale.details) {
                s.totalCommission += Number(d.commission || 0);
                s.details.push({
                    saleId: sale.id,
                    date: sale.createdAt,
                    productName: d.product?.name || 'Producto',
                    quantity: d.quantity,
                    unitPrice: d.unitPrice,
                    subtotal: d.subtotal,
                    commission: d.commission || 0
                });
            }
        }

        res.json(Object.values(bySeller));
    } catch (error) {
        console.error('Sales by seller error:', error);
        res.status(500).json({ message: 'Error al obtener ventas por vendedor' });
    }
};

module.exports = {
    getDashboardStats,
    getReports,
    getSalesBySeller
};

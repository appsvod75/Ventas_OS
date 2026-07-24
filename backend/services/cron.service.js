const cron = require('node-cron');
const prisma = require('../db');
const { getIO } = require('./socketManager');
const { startOfDay, endOfDay, subDays } = require('date-fns');

// Store the currently active task so we can cancel and restart it if the time changes
let activeTask = null;

const runClosingForDate = async (targetDate) => {
    try {
        // Obtenemos la fecha en formato YYYY-MM-DD según el timezone de El Salvador
        const dateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        console.log(`Iniciando cierre de caja para el día local: ${dateStr}`);
        
        const start = new Date(`${dateStr}T00:00:00-06:00`);
        const end = new Date(`${dateStr}T23:59:59-06:00`);

        const branches = await prisma.branch.findMany({ where: { isActive: true } });

        for (const branch of branches) {
            // 1. Calculate Total Sales
            const sales = await prisma.saleH.aggregate({
                where: {
                    branchId: branch.id,
                    createdAt: { gte: start, lte: end }
                },
                _sum: { total: true }
            });
            const totalSales = Number(sales._sum.total || 0);

            // 2. Calculate Total Expenses
            const expenses = await prisma.expense.aggregate({
                where: {
                    branchId: branch.id,
                    createdAt: { gte: start, lte: end }
                },
                _sum: { amount: true }
            });
            const totalExpenses = Number(expenses._sum.amount || 0);

            // 3. Calculate Net Amount
            const netAmount = totalSales - totalExpenses;

            // 4. Save to CashClosing (Upsert to allow re-running if needed)
            await prisma.cashClosing.upsert({
                where: {
                    date_branchId: {
                        date: start,
                        branchId: branch.id
                    }
                },
                update: {
                    totalSales,
                    totalExpenses,
                    netAmount
                },
                create: {
                    date: start,
                    branchId: branch.id,
                    totalSales,
                    totalExpenses,
                    netAmount
                }
            });

            console.log(`Cierre completado para sucursal ${branch.name}. Ventas: ${totalSales}, Gastos: ${totalExpenses}, Neto: ${netAmount}`);
        }
    } catch (error) {
        console.error('Error durante el cierre de caja automático:', error);
    }
};

const scheduleClosingJob = async () => {
    try {
        if (activeTask) {
            activeTask.stop();
        }

        const config = await prisma.masterConfig.findFirst();
        const timeStr = config?.autoClosingTime;

        if (!timeStr) {
            console.log('Cierre automático de caja está deshabilitado.');
            return;
        }

        const [hours, minutes] = timeStr.split(':');

        const cronExpression = `${minutes} ${hours} * * *`;
        console.log(`Programando cierre automático de caja a las ${timeStr} (${cronExpression})`);

        activeTask = cron.schedule(cronExpression, async () => {
            console.log('--- EJECUTANDO CIERRE AUTOMÁTICO Y DESCONEXIÓN GLOBAL ---');
            
            // Emitir desconexión forzada a todos los usuarios via Socket.io
            const io = getIO();
            if (io) {
                io.emit('FORCE_LOGOUT', { message: 'Cierre de sistema programado ejecutado.' });
                console.log('Evento FORCE_LOGOUT emitido a todos los clientes.');
            }

            // Run for the current day
            await runClosingForDate(new Date());
        });

    } catch (error) {
        console.error('Error programando el cron de cierre de caja:', error);
    }
};

module.exports = {
    scheduleClosingJob,
    runClosingForDate
};

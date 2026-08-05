const cron = require('node-cron');
const prisma = require('../db');
const { getIO } = require('./socketManager');
const { addDays } = require('date-fns');
const { toSVDate } = require('../utils/tz');

let activeClosingTask = null;
let activeOpeningTask = null;

const runClosingForDate = async (targetDate, options = {}) => {
    const { force = false } = options;
    const processed = [];
    const skipped = [];
    try {
        const dateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        console.log(`Iniciando cierre de caja para el día local: ${dateStr}${force ? ' (FORZADO)' : ''}`);

        const start = toSVDate(dateStr);
        const end = new Date(`${dateStr}T23:59:59-06:00`);
        const dayOfWeek = new Date(start).getDay();

        const branches = await prisma.branch.findMany({ where: { isActive: true } });

        for (const branch of branches) {
            if (branch.closingType === 'periodic' && dayOfWeek !== branch.closeDay && !force) {
                skipped.push({ name: branch.name, reason: `ciclo semanal (día de cierre: ${branch.closeDay})` });
                continue;
            }

            const sales = await prisma.saleH.aggregate({
                where: { branchId: branch.id, createdAt: { gte: start, lte: end } },
                _sum: { total: true }
            });
            const totalSales = Number(sales._sum.total || 0);

            const expenses = await prisma.expense.aggregate({
                where: { branchId: branch.id, createdAt: { gte: start, lte: end } },
                _sum: { amount: true }
            });
            const totalExpenses = Number(expenses._sum.amount || 0);

            const netAmount = totalSales - totalExpenses;

            await prisma.cashClosing.upsert({
                where: { date_branchId: { date: start, branchId: branch.id } },
                update: { totalSales, totalExpenses, netAmount },
                create: { date: start, branchId: branch.id, totalSales, totalExpenses, netAmount }
            });

            processed.push({ name: branch.name, totalSales, totalExpenses, netAmount });
            console.log(`Cierre completado para ${branch.name}. Ventas: ${totalSales}, Gastos: ${totalExpenses}, Neto: ${netAmount}`);

            await prisma.cashOpening.updateMany({
                where: { branchId: branch.id, date: start, closedAt: null },
                data: { closedAt: new Date() }
            });
        }
    } catch (error) {
        console.error('Error durante el cierre de caja:', error);
        throw error;
    }
    return { processed, skipped };
};

const runOpeningForDate = async (targetDate) => {
    try {
        const dateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const openingDate = toSVDate(dateStr);
        const branches = await prisma.branch.findMany({ where: { isActive: true } });

        for (const branch of branches) {
            const dayOfWeek = new Date(openingDate).getDay();
            let shouldOpen = true;
            if (branch.closingType === 'periodic') {
                shouldOpen = dayOfWeek === branch.openDay;
            }

            if (!shouldOpen) continue;

            const existing = await prisma.cashOpening.findUnique({
                where: { branchId_date: { branchId: branch.id, date: openingDate } }
            });
            if (!existing) {
                await prisma.cashOpening.create({
                    data: { branchId: branch.id, date: openingDate, amount: 0, openedById: null }
                });
                console.log(`Apertura automática para ${branch.name} el ${dateStr} ($0)`);
            }
        }
    } catch (error) {
        console.error('Error durante la apertura automática:', error);
    }
};

const scheduleJobs = async () => {
    if (activeClosingTask) activeClosingTask.stop();
    if (activeOpeningTask) activeOpeningTask.stop();

    const config = await prisma.masterConfig.findFirst();
    const closingTime = config?.autoClosingTime;
    const openingTime = config?.autoOpeningTime;

    if (closingTime) {
        const [cH, cM] = closingTime.split(':');
        const closingCron = `${cM} ${cH} * * *`;
        console.log(`Cron de cierre programado: ${closingTime} (${closingCron})`);
        activeClosingTask = cron.schedule(closingCron, async () => {
            console.log('--- EJECUTANDO CIERRE AUTOMÁTICO ---');
            const io = getIO();
            if (io) {
                io.emit('FORCE_LOGOUT', { message: 'Cierre de sistema programado.' });
            }
            try {
                await runClosingForDate(new Date());
            } catch (error) {
                console.error('Error en cierre automático programado:', error);
            }
        });
    } else {
        console.log('Cierre automático deshabilitado.');
    }

    if (openingTime) {
        const [oH, oM] = openingTime.split(':');
        const openingCron = `${oM} ${oH} * * *`;
        console.log(`Cron de apertura programado: ${openingTime} (${openingCron})`);
        activeOpeningTask = cron.schedule(openingCron, async () => {
            console.log('--- EJECUTANDO APERTURA AUTOMÁTICA ---');
            await runOpeningForDate(new Date());
        });
    } else {
        console.log('Apertura automática deshabilitada.');
    }
};

module.exports = {
    scheduleJobs,
    runClosingForDate,
    runOpeningForDate
};
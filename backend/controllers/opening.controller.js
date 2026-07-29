const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');

const getLastOpening = async (req, res) => {
    try {
        let branchId = req.query.branchId;
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            branchId = req.user.branch_id;
        }
        const opening = await prisma.cashOpening.findFirst({
            where: { branchId: parseInt(branchId || req.user.branch_id) },
            orderBy: { date: 'desc' },
            include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } }
        });
        res.json(opening);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener apertura' });
    }
};

const createOpening = async (req, res) => {
    try {
        const { amount, date } = req.body;
        let branchId = req.body.branchId || req.user.branch_id;
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            branchId = req.user.branch_id;
        }
        const openingDate = date ? new Date(`${date}T00:00:00-06:00`) : new Date();
        const existing = await prisma.cashOpening.findUnique({
            where: { branchId_date: { branchId: parseInt(branchId), date: openingDate } }
        });
        if (existing) return res.status(400).json({ message: 'Ya existe apertura para esta fecha' });

        const opening = await prisma.cashOpening.create({
            data: { branchId: parseInt(branchId), date: openingDate, amount: parseFloat(amount || 0), openedById: req.user.id }
        });
        res.json(opening);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear apertura' });
    }
};

const checkOpening = async (req, res) => {
    try {
        let branchId = req.query.branchId || req.user.branch_id;
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            branchId = req.user.branch_id;
        }
        const branch = await prisma.branch.findUnique({ where: { id: parseInt(branchId) } });
        if (!branch) return res.json({ needsOpening: false });

        const today = new Date();
        const todayStart = startOfDay(today);

        if (branch.closingType === 'daily') {
            const opening = await prisma.cashOpening.findUnique({
                where: { branchId_date: { branchId: parseInt(branchId), date: todayStart } }
            });
            return res.json({ needsOpening: !opening, strictOpen: branch.strictOpen, closingType: 'daily' });
        }

        // Periodic: find current period opening
        const dayOfWeek = today.getDay();
        let periodStart;
        if (branch.closeDay >= branch.openDay) {
            if (dayOfWeek >= branch.openDay && dayOfWeek <= branch.closeDay) {
                // Inside the period, find opening from openDay
                periodStart = new Date(today);
                periodStart.setDate(today.getDate() - (dayOfWeek - branch.openDay));
            } else {
                return res.json({ needsOpening: true, strictOpen: branch.strictOpen, closingType: 'periodic' });
            }
        } else {
            // Period wraps around (e.g., open saturday, close monday)
            if (dayOfWeek >= branch.openDay || dayOfWeek <= branch.closeDay) {
                periodStart = new Date(today);
                if (dayOfWeek < branch.openDay) {
                    periodStart.setDate(today.getDate() - (dayOfWeek + 7 - branch.openDay));
                } else {
                    periodStart.setDate(today.getDate() - (dayOfWeek - branch.openDay));
                }
            } else {
                return res.json({ needsOpening: true, strictOpen: branch.strictOpen, closingType: 'periodic' });
            }
        }
        periodStart.setHours(0, 0, 0, 0);
        const opening = await prisma.cashOpening.findFirst({
            where: { branchId: parseInt(branchId), date: { gte: periodStart } },
            orderBy: { date: 'desc' }
        });
        if (opening && !opening.closedAt) {
            return res.json({ needsOpening: false, openingId: opening.id, strictOpen: branch.strictOpen, closingType: 'periodic' });
        }
        return res.json({ needsOpening: true, strictOpen: branch.strictOpen, closingType: 'periodic' });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar apertura' });
    }
};

module.exports = { getLastOpening, createOpening, checkOpening };

const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');
const { toSVDate } = require('../utils/tz');

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
        const openingDate = date ? toSVDate(date) : new Date();
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

const updateOpening = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date } = req.body;
        let branchId = req.body.branchId;
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Solo admin puede editar aperturas' });
        }

        const existing = await prisma.cashOpening.findUnique({ where: { id: parseInt(id) } });
        if (!existing) return res.status(404).json({ message: 'Apertura no encontrada' });

        const data = {};
        if (amount !== undefined) data.amount = parseFloat(amount);
        if (date) {
            const newDate = toSVDate(date);
            const conflict = await prisma.cashOpening.findUnique({
                where: { branchId_date: { branchId: existing.branchId, date: newDate } }
            });
            if (conflict && conflict.id !== existing.id) {
                return res.status(400).json({ message: 'Ya existe otra apertura para esa fecha' });
            }
            data.date = newDate;
        }
        if (branchId !== undefined) {
            data.branchId = parseInt(branchId);
        }

        const updated = await prisma.cashOpening.update({ where: { id: parseInt(id) }, data });
        res.json(updated);
    } catch (error) {
        console.error('Error updating opening:', error);
        res.status(500).json({ message: 'Error al actualizar apertura' });
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

module.exports = { getLastOpening, createOpening, updateOpening, checkOpening };

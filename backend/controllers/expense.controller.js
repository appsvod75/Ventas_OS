const prisma = require('../db');
const { startOfDay, endOfDay } = require('date-fns');

const registerExpense = async (req, res) => {
    try {
        let { branchId, description, amount, date } = req.body;
        const userId = req.user.id;
        
        // Non-admin users are locked to their branch
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            branchId = req.user.branch_id;
        }

        if (!branchId || !description || !amount) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const expense = await prisma.expense.create({
            data: {
                branchId: parseInt(branchId),
                userId,
                description,
                amount: parseFloat(amount),
                createdAt: date ? new Date(`${date}T12:00:00-06:00`) : undefined
            }
        });

        res.status(201).json({ message: 'Gasto registrado con éxito', expense });
    } catch (error) {
        console.error('Error registering expense:', error);
        res.status(500).json({ message: 'Error al registrar el gasto' });
    }
};

const getDailyExpenses = async (req, res) => {
    try {
        let { branchId, date } = req.query;
        
        // Non-admin users only see their branch
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            branchId = req.user.branch_id;
        }

        // --- Lógica de Filtrado por Fecha (Fixed with Offset -06:00) ---
        // Forzamos el offset para que "Hoy" sea el día local de El Salvador.
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
        const targetDateStr = date || todayStr;
        
        const start = new Date(`${targetDateStr}T00:00:00-06:00`);
        const end = new Date(`${targetDateStr}T23:59:59-06:00`);

        const expenses = await prisma.expense.findMany({
            where: {
                branchId: branchId ? parseInt(branchId) : undefined,
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                user: { select: { name: true } },
                branch: { select: { name: true } }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Error al obtener gastos del día' });
    }
};

const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, date } = req.body;

        if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'No tienes permisos para editar gastos' });
        }

        const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
        if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

        const updated = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                description: description ?? expense.description,
                amount: amount !== undefined ? parseFloat(amount) : expense.amount,
                createdAt: date ? new Date(`${date}T12:00:00-06:00`) : expense.createdAt
            }
        });

        res.json({ message: 'Gasto actualizado con éxito', expense: updated });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ message: 'Error al actualizar el gasto' });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'No tienes permisos para eliminar gastos' });
        }

        const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
        if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

        await prisma.expense.delete({ where: { id: parseInt(id) } });

        res.json({ message: 'Gasto eliminado con éxito' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Error al eliminar el gasto' });
    }
};

module.exports = {
    registerExpense,
    getDailyExpenses,
    updateExpense,
    deleteExpense
};

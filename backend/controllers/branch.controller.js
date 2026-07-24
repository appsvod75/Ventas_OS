const prisma = require('../db');

const getAllBranches = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true }
        });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener sucursales' });
    }
};

const createBranch = async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        const branch = await prisma.branch.create({
            data: { name, address, phone }
        });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear sucursal' });
    }
};

const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, isActive } = req.body;
        const branch = await prisma.branch.update({
            where: { id: parseInt(id) },
            data: { name, address, phone, isActive: !!isActive }
        });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar sucursal' });
    }
};

const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.branch.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });
        res.json({ message: 'Sucursal desactivada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desactivar sucursal' });
    }
};

module.exports = { getAllBranches, createBranch, updateBranch, deleteBranch };

const prisma = require('../db');

const getAll = async (req, res) => {
    try {
        const data = await prisma.delivery.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener deliverys' });
    }
};

const create = async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Nombre requerido' });
        const data = await prisma.delivery.create({ data: { name: name.trim().toUpperCase(), phone: phone || null } });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear delivery' });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, isActive } = req.body;
        const data = await prisma.delivery.update({
            where: { id: parseInt(id) },
            data: { ...(name !== undefined && { name: name.trim().toUpperCase() }), ...(phone !== undefined && { phone }), ...(isActive !== undefined && { isActive }) }
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar delivery' });
    }
};

module.exports = { getAll, create, update };

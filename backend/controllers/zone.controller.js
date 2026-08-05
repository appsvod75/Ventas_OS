const prisma = require('../db');

const getZones = async (req, res) => {
    try {
        const zones = await prisma.deliveryZone.findMany({
            include: { _count: { select: { addresses: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(zones);
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({ message: 'Error al obtener zonas' });
    }
};

const createZone = async (req, res) => {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'El nombre de la zona es requerido' });
    }
    try {
        const existing = await prisma.deliveryZone.findFirst({
            where: { name: { equals: String(name).trim(), mode: 'insensitive' } }
        });
        if (existing) return res.status(409).json({ message: 'La zona ya existe' });
        const zone = await prisma.deliveryZone.create({ data: { name: String(name).trim() } });
        res.status(201).json({ data: zone });
    } catch (error) {
        console.error('Error creating zone:', error);
        res.status(500).json({ message: 'Error al crear zona' });
    }
};

const updateZone = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'El nombre de la zona es requerido' });
    }
    try {
        const existing = await prisma.deliveryZone.findFirst({
            where: { name: { equals: String(name).trim(), mode: 'insensitive' }, NOT: { id: Number(id) } }
        });
        if (existing) return res.status(409).json({ message: 'La zona ya existe' });
        const zone = await prisma.deliveryZone.update({
            where: { id: Number(id) },
            data: { name: String(name).trim() }
        });
        res.json({ data: zone });
    } catch (error) {
        console.error('Error updating zone:', error);
        res.status(500).json({ message: 'Error al actualizar zona' });
    }
};

const deleteZone = async (req, res) => {
    const { id } = req.params;
    try {
        const inUse = await prisma.clientAddress.count({ where: { zoneId: Number(id) } });
        if (inUse > 0) {
            return res.status(409).json({ message: `Zona en uso por ${inUse} dirección(es). Reasigna o elimina esas direcciones primero` });
        }
        await prisma.deliveryZone.delete({ where: { id: Number(id) } });
        res.json({ message: 'Zona eliminada' });
    } catch (error) {
        console.error('Error deleting zone:', error);
        res.status(500).json({ message: 'Error al eliminar zona' });
    }
};

module.exports = {
    getZones,
    createZone,
    updateZone,
    deleteZone
};
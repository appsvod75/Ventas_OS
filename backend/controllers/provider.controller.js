const prisma = require('../db');

const getAllProviders = async (req, res) => {
    try {
        const providers = await prisma.provider.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(providers);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener proveedores' });
    }
};

const getProviderById = async (req, res) => {
    try {
        const provider = await prisma.provider.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!provider) return res.status(404).json({ message: 'Proveedor no encontrado' });
        res.json(provider);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener proveedor' });
    }
};

const createProvider = async (req, res) => {
    const { name, vendor, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });
    try {
        const provider = await prisma.provider.create({
            data: { name, vendor, phone, email, address }
        });
        res.json(provider);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear proveedor' });
    }
};

const updateProvider = async (req, res) => {
    const { id } = req.params;
    const { name, vendor, phone, email, address, isActive } = req.body;
    try {
        const provider = await prisma.provider.update({
            where: { id: parseInt(id) },
            data: { name, vendor, phone, email, address, isActive }
        });
        res.json(provider);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar proveedor' });
    }
};

const deleteProvider = async (req, res) => {
    try {
        await prisma.provider.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });
        res.json({ message: 'Proveedor desactivado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desactivar proveedor' });
    }
};

module.exports = { getAllProviders, getProviderById, createProvider, updateProvider, deleteProvider };

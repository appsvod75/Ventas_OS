const prisma = require('../db');
const { logAudit } = require('../utils/audit');

const getClients = async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'Ventas') {
            where.createdById = req.user.id;
        }
        const clients = await prisma.client.findMany({
            where,
            include: {
                createdBy: { select: { name: true } },
                addresses: {
                    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
                    include: { zone: { select: { id: true, name: true } } }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (error) {
        console.error('--- GET CLIENTS ERROR ---');
        console.error(error);
        res.status(500).json({ message: 'Error retrieving clients' });
    }
};

const createClient = async (req, res) => {
    const { name, documentId, phone, email, address, isActive, deliveryId } = req.body;
    console.log('--- CREATE CLIENT ATTEMPT ---');
    console.log('Payload:', req.body);
    try {
        const newClient = await prisma.$transaction(async (tx) => {
            const client = await tx.client.create({
                data: {
                    name,
                    documentId: documentId || null,
                    phone: phone || null,
                    email: email || null,
                    address: address || null,
                    isActive: isActive !== undefined ? isActive : true,
                    createdById: req.user.id,
                    ...(deliveryId && { delivery: { connect: { id: parseInt(deliveryId) } } })
                }
            });
            if (address) {
                await tx.clientAddress.create({
                    data: { clientId: client.id, label: 'Casa', address, isDefault: true }
                });
            }
            return client;
        });
        console.log('--- CREATE CLIENT SUCCESS ---');
        res.status(201).json({ message: 'Client created successfully', data: newClient });
    } catch (error) {
        console.error('--- CREATE CLIENT ERROR ---');
        console.error(error);
        res.status(500).json({ message: 'Error creating client', error: error.message });
    }
};

const updateClient = async (req, res) => {
    const { id } = req.params;
    const { name, documentId, phone, email, address, isActive, pin, deliveryId } = req.body;
    try {
        // Check if client has sales and user is not admin
        if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
            const saleCount = await prisma.saleH.count({ where: { clientId: parseInt(id) } });
            if (saleCount > 0) {
                if (!pin) return res.status(400).json({ message: 'PIN requerido para editar cliente con ventas' });
                const admin = await prisma.user.findFirst({ where: { role: { name: { in: ['Super Admin', 'Admin'] } }, isActive: true } });
                if (!admin || !(await require('bcryptjs').compare(pin, admin.pinHash))) {
                    return res.status(401).json({ message: 'PIN incorrecto' });
                }
            }
        }

        const updatedClient = await prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                name,
                documentId: documentId || null,
                phone: phone || null,
                email: email || null,
                address: address || null,
                isActive: isActive !== undefined ? isActive : true,
                ...(deliveryId !== undefined && { delivery: deliveryId ? { connect: { id: parseInt(deliveryId) } } : { disconnect: true } })
            }
        });

        // Mantener sincronizada la direccion default cuando se envia "address" en el payload
        if (address !== undefined) {
            const existingDefault = await prisma.clientAddress.findFirst({ where: { clientId: parseInt(id), isDefault: true } });
            if (existingDefault) {
                await prisma.clientAddress.update({ where: { id: existingDefault.id }, data: { address } });
            } else if (address) {
                await prisma.clientAddress.create({ data: { clientId: parseInt(id), label: 'Casa', address, isDefault: true } });
            }
        }

        res.json({ message: 'Cliente actualizado correctamente', data: updatedClient });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
    }
};

const getClientStatement = async (req, res) => {
    const { id } = req.params;
    try {
        const clientId = parseInt(id);

        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

        const sales = await prisma.saleH.findMany({
            where: { clientId: clientId },
            include: {
                branch: { select: { name: true } },
                details: { include: { product: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const payments = await prisma.clientPayment.findMany({
            where: { clientId: clientId },
            include: {
                user: { select: { name: true } },
                applications: {
                    include: { sale: { select: { id: true, createdAt: true, total: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalDebt = sales.reduce((sum, sale) => sum + Number(sale.balance), 0);
        const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const totalHistoricallySold = sales.reduce((sum, sale) => sum + Number(sale.total), 0);

        res.json({
            client,
            summary: {
                totalDebt,
                totalPaid,
                totalHistoricallySold,
                pendingInvoices: sales.filter(s => Number(s.balance) > 0).length
            },
            history: {
                sales,
                payments
            }
        });

    } catch (error) {
        console.error('Error fetching client statement:', error);
        res.status(500).json({ message: 'Error al obtener estado de cuenta' });
    }
};

const getClientAddresses = async (req, res) => {
    const { id } = req.params;
    try {
        const addresses = await prisma.clientAddress.findMany({
            where: { clientId: parseInt(id) },
            include: { zone: { select: { id: true, name: true } } },
            orderBy: [{ isDefault: 'desc' }, { id: 'asc' }]
        });
        res.json(addresses);
    } catch (error) {
        console.error('Error fetching client addresses:', error);
        res.status(500).json({ message: 'Error al obtener direcciones' });
    }
};

const createClientAddress = async (req, res) => {
    const { id } = req.params;
    const { label, address, isDefault, zoneId } = req.body;
    try {
        if (!address || !String(address).trim()) {
            return res.status(400).json({ message: 'Dirección requerida' });
        }
        const clientId = parseInt(id);
        const noAddresses = (await prisma.clientAddress.count({ where: { clientId } })) === 0;
        const makeDefault = isDefault === true || noAddresses;

        const result = await prisma.$transaction(async (tx) => {
            if (makeDefault) {
                await tx.clientAddress.updateMany({ where: { clientId, isDefault: true }, data: { isDefault: false } });
            }
            return tx.clientAddress.create({
                data: { clientId, label: label || null, address: String(address).trim(), isDefault: makeDefault, zoneId: zoneId ? parseInt(zoneId) : null },
                include: { zone: { select: { id: true, name: true } } }
            });
        });
        res.status(201).json({ message: 'Dirección agregada', data: result });
    } catch (error) {
        console.error('Error creating client address:', error);
        res.status(500).json({ message: 'Error al agregar dirección', error: error.message });
    }
};

const updateClientAddress = async (req, res) => {
    const { id, addressId } = req.params;
    const { label, address, isDefault, zoneId } = req.body;
    try {
        const result = await prisma.$transaction(async (tx) => {
            if (isDefault === true) {
                await tx.clientAddress.updateMany({ where: { clientId: parseInt(id), isDefault: true }, data: { isDefault: false } });
            }
            return tx.clientAddress.update({
                where: { id: parseInt(addressId) },
                data: {
                    label: label !== undefined ? (label || null) : undefined,
                    address: address !== undefined ? String(address).trim() : undefined,
                    isDefault: isDefault !== undefined ? !!isDefault : undefined,
                    zoneId: zoneId !== undefined ? (zoneId ? parseInt(zoneId) : null) : undefined
                },
                include: { zone: { select: { id: true, name: true } } }
            });
        });
        res.json({ message: 'Dirección actualizada', data: result });
    } catch (error) {
        console.error('Error updating client address:', error);
        res.status(500).json({ message: 'Error al actualizar dirección', error: error.message });
    }
};

const deleteClientAddress = async (req, res) => {
    const { addressId } = req.params;
    try {
        const addr = await prisma.clientAddress.findUnique({ where: { id: parseInt(addressId) } });
        if (!addr) return res.status(404).json({ message: 'Dirección no encontrada' });
        await prisma.clientAddress.delete({ where: { id: parseInt(addressId) } });
        if (addr.isDefault) {
            const next = await prisma.clientAddress.findFirst({ where: { clientId: addr.clientId }, orderBy: { id: 'asc' } });
            if (next) await prisma.clientAddress.update({ where: { id: next.id }, data: { isDefault: true } });
        }
        res.json({ message: 'Dirección eliminada' });
    } catch (error) {
        console.error('Error deleting client address:', error);
        res.status(500).json({ message: 'Error al eliminar dirección', error: error.message });
    }
};

const setDefaultClientAddress = async (req, res) => {
    const { id, addressId } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            await tx.clientAddress.updateMany({ where: { clientId: parseInt(id), isDefault: true }, data: { isDefault: false } });
            await tx.clientAddress.update({ where: { id: parseInt(addressId) }, data: { isDefault: true } });
        });
        res.json({ message: 'Dirección predeterminada actualizada' });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ message: 'Error al actualizar dirección predeterminada', error: error.message });
    }
};

const deleteClient = async (req, res) => {
    const { id } = req.params;
    const idInt = parseInt(id);
    try {
        // Check if client has sales
        const salesCount = await prisma.saleH.count({ where: { clientId: idInt } });
        if (salesCount > 0) {
            return res.status(400).json({ message: 'No se puede eliminar: el cliente tiene ventas registradas.' });
        }
        await prisma.client.delete({ where: { id: idInt } });
        await logAudit(req.user.id, 'DELETE_CLIENT', { id: idInt }, req.user.branch_id);
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error al eliminar cliente' });
    }
};

module.exports = {
    getClients,
    createClient,
    updateClient,
    getClientStatement,
    deleteClient,
    getClientAddresses,
    createClientAddress,
    updateClientAddress,
    deleteClientAddress,
    setDefaultClientAddress
};

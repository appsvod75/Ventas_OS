const prisma = require('../db');
const { logAudit } = require('../utils/audit');

const getClients = async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
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
        const newClient = await prisma.client.create({
            data: {
                name,
                documentId: documentId || null,
                phone: phone || null,
                email: email || null,
                address: address || null,
                isActive: isActive !== undefined ? isActive : true,
                ...(deliveryId && { delivery: { connect: { id: parseInt(deliveryId) } } })
            }
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
    deleteClient
};

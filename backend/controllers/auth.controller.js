const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../utils/audit');

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { role: true, branch: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, pin, roleId, branchId } = req.body;
        const pinHash = await bcrypt.hash(pin, 10);
        const user = await prisma.user.create({
            data: { name, pinHash, roleId: parseInt(roleId), branchId: parseInt(branchId) },
            include: { role: true }
        });

        await logAudit(req.user.id, 'CREATE_USER', { 
            createdUserId: user.id, 
            createdUserName: user.name,
            role: user.role.name 
        }, req.user.branch_id);

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, pin, roleId, branchId, isActive } = req.body;

        const data = { name, roleId: parseInt(roleId), branchId: parseInt(branchId), isActive: !!isActive };
        if (pin) {
            data.pinHash = await bcrypt.hash(pin, 10);
        }
        
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data,
            include: { role: true }
        });

        await logAudit(req.user.id, 'UPDATE_USER', { 
            updatedUserId: user.id, 
            updatedUserName: user.name,
            isActive: user.isActive,
            role: user.role.name
        }, req.user.branch_id);

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
};

const login = async (req, res) => {
    const { pin } = req.body;
    const ip = req.ip;

    if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: 'El PIN debe ser de 6 dígitos numéricos' });
    }

    try {
        const oneMinAgo = new Date(Date.now() - 60000);
        const failedOnIpCount = await prisma.auditLog.count({
            where: {
                ipAddress: ip,
                action: 'LOGIN_FAILURE',
                timestamp: { gte: oneMinAgo }
            }
        });

        if (failedOnIpCount >= 3) {
            return res.status(423).json({ message: 'Demasiados intentos. Bloqueado por 1 minuto.' });
        }

        const users = await prisma.user.findMany({
            where: {
                isActive: true
            },
            include: { role: true, branch: true }
        });

        let authenticatedUser = null;
        for (const user of users) {
            if (await bcrypt.compare(pin, user.pinHash)) {
                authenticatedUser = user;
                break;
            }
        }

        if (!authenticatedUser) {
            await logAudit(null, 'LOGIN_FAILURE', { note: 'PIN incorrecto' }, null, ip);
            return res.status(401).json({ message: 'PIN incorrecto o usuario inactivo' });
        }

        const token = jwt.sign(
            {
                id: authenticatedUser.id,
                role: authenticatedUser.role.name,
                branch_id: authenticatedUser.branchId
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await logAudit(
            authenticatedUser.id,
            'LOGIN_SUCCESS',
            { name: authenticatedUser.name, role: authenticatedUser.role.name },
            authenticatedUser.branchId,
            ip
        );

        res.json({
            token,
            user: {
                id: authenticatedUser.id,
                name: authenticatedUser.name,
                role: authenticatedUser.role.name,
                branch_id: authenticatedUser.branchId,
                branch_name: authenticatedUser.branch?.name,
                color_hex: authenticatedUser.branch?.colorHex
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

const verifyPin = async (req, res) => {
    const { pin } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { role: true }
        });

        if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
            return res.status(401).json({ message: 'PIN de confirmación incorrecto' });
        }

        // Check if user has admin-level permissions via role permissions
        const userPermissions = await prisma.rolePermission.findMany({
            where: { roleId: user.roleId },
            include: { permission: true }
        });
        const permKeys = userPermissions.map(rp => rp.permission.key);
        
        const isAdmin = permKeys.includes('all') || permKeys.includes('settings.manage') || permKeys.includes('expenses.delete');
        if (!isAdmin) {
            return res.status(403).json({ message: 'No tienes permisos de administrador' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar PIN' });
    }
};

module.exports = { login, getUsers, createUser, updateUser, verifyPin };

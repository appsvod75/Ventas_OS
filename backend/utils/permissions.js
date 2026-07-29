const prisma = require('../db');

const PERMISSIONS = {
    ALL: 'all',
    POS_ACCESS: 'pos.access',
    ADMIN_ACCESS: 'admin.access',
    SALES_CREATE: 'sales.create',
    SALES_VIEW: 'sales.view',
    SALES_EDIT: 'sales.edit',
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_EDIT: 'inventory.edit',
    INVENTORY_TRANSFER: 'inventory.transfer',
    CATEGORIES_VIEW: 'categories.view',
    CATEGORIES_MANAGE: 'categories.manage',
    CLIENTS_VIEW: 'clients.view',
    CLIENTS_MANAGE: 'clients.manage',
    PROVIDERS_VIEW: 'providers.view',
    PROVIDERS_MANAGE: 'providers.manage',
    PURCHASES_CREATE: 'purchases.create',
    PURCHASES_VIEW: 'purchases.view',
    EXPENSES_VIEW: 'expenses.view',
    EXPENSES_MANAGE: 'expenses.manage',
    REPORTS_VIEW: 'reports.view',
    USERS_VIEW: 'users.view',
    USERS_MANAGE: 'users.manage',
    BRANCHES_VIEW: 'branches.view',
    BRANCHES_MANAGE: 'branches.manage',
    CONFIG_VIEW: 'config.view',
    CONFIG_EDIT: 'config.edit',
    AUDIT_VIEW: 'audit.view',
    PROJECTIONS_VIEW: 'projections.view',
    PROJECTIONS_MANAGE: 'projections.manage',
    CLOSINGS_VIEW: 'closings.view',
    CLOSINGS_FORCE: 'closings.force',
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_MANAGE: 'settings.manage',
    EXPENSES_DELETE: 'expenses.delete',
    LOOKUP_ACCESS: 'lookup.access',
};

const allPermissions = Object.values(PERMISSIONS);

async function hasPermission(userId, permissionKey) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        if (!user || !user.role) return false;

        const userPermissions = user.role.rolePermissions.map(rp => rp.permission.key);
        return userPermissions.includes(PERMISSIONS.ALL) || userPermissions.includes(permissionKey);
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

function requirePermission(permissionKey) {
    return async (req, res, next) => {
        const has = await hasPermission(req.user.id, permissionKey);
        if (!has) {
            return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
        }
        next();
    };
}

module.exports = { PERMISSIONS, hasPermission, requirePermission, allPermissions };

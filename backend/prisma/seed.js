require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { allPermissions, PERMISSIONS } = require('../utils/permissions');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding...');

    // 1. Create Permissions
    const permissionNames = {
        'all': 'Acceso Total',
        'pos.access': 'Punto de Venta',
        'admin.access': 'Dashboard Admin',
        'sales.create': 'Crear Ventas',
        'sales.view': 'Ver Ventas',
        'sales.edit': 'Editar Ventas',
        'products.view': 'Ver Productos',
        'products.create': 'Crear Productos',
        'products.edit': 'Editar Productos',
        'products.delete': 'Eliminar Productos',
        'inventory.view': 'Ver Inventario',
        'inventory.edit': 'Editar Inventario',
        'inventory.transfer': 'Traslados',
        'categories.view': 'Ver Categorías',
        'categories.manage': 'Gestionar Categorías',
        'clients.view': 'Ver Clientes',
        'clients.manage': 'Gestionar Clientes',
        'providers.view': 'Ver Proveedores',
        'providers.manage': 'Gestionar Proveedores',
        'purchases.create': 'Crear Compras',
        'purchases.view': 'Ver Compras',
        'expenses.view': 'Ver Gastos',
        'expenses.manage': 'Gestionar Gastos',
        'expenses.delete': 'Eliminar Gastos',
        'reports.view': 'Ver Reportes',
        'users.view': 'Ver Usuarios',
        'users.manage': 'Gestionar Usuarios',
        'branches.view': 'Ver Sucursales',
        'branches.manage': 'Gestionar Sucursales',
        'config.view': 'Ver Configuración',
        'config.edit': 'Editar Configuración',
        'audit.view': 'Ver Auditoría',
        'projections.view': 'Ver Proyecciones',
        'projections.manage': 'Gestionar Proyecciones',
        'closings.view': 'Ver Cortes',
        'closings.force': 'Forzar Corte',
        'settings.view': 'Ver Ajustes',
        'settings.manage': 'Gestionar Ajustes',
        'lookup.access': 'Consultar Productos',
    };
    const permissionRecords = [];
    for (const key of allPermissions) {
        const name = permissionNames[key] || key.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' - ');
        const perm = await prisma.permission.upsert({
            where: { key },
            update: { name },
            create: { key, name, description: null }
        });
        permissionRecords.push(perm);
    }
    console.log(`✅ ${permissionRecords.length} permissions created.`);

    // 2. Create Roles with permissions
    const superAdminRole = await prisma.role.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: 'Super Admin' }
    });

    const adminRole = await prisma.role.upsert({
        where: { id: 2 },
        update: {},
        create: { id: 2, name: 'Admin' }
    });

    const vendorRole = await prisma.role.upsert({
        where: { id: 3 },
        update: {},
        create: { id: 3, name: 'Ventas' }
    });

    // Super Admin: all permissions
    for (const perm of permissionRecords) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: superAdminRole.id, permissionId: perm.id }
        });
    }

    // Admin: most permissions except super-admin-only
    const adminExclude = [PERMISSIONS.CONFIG_EDIT, PERMISSIONS.USERS_MANAGE, PERMISSIONS.AUDIT_VIEW, PERMISSIONS.ALL];
    for (const perm of permissionRecords) {
        if (adminExclude.includes(perm.key)) continue;
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: perm.id }
        });
    }

    // Ventas: POS, consultar, crear/ver ventas, ver productos/inventario, clientes, gastos
    const vendorPermissions = [
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.CLIENTS_VIEW,
        PERMISSIONS.CLIENTS_MANAGE,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.PROVIDERS_VIEW,
        PERMISSIONS.LOOKUP_ACCESS,
    ];
    for (const key of vendorPermissions) {
        const perm = permissionRecords.find(p => p.key === key);
        if (perm) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: vendorRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: vendorRole.id, permissionId: perm.id }
            });
        }
    }

    console.log('✅ Roles created: Super Admin, Admin, Ventas');

    // 3. Create Branches
    await prisma.branch.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: 'Sucursal Principal', address: 'Calle Principal', phone: '0000-0000', colorHex: '#3b82f6' }
    });

    // 4. Create Super Admin user (PIN: 020518)
    const pinHash = await bcrypt.hash('020518', 10);
    await prisma.user.upsert({
        where: { id: 1 },
        update: { pinHash, roleId: superAdminRole.id },
        create: { id: 1, name: 'Admin Lucky', pinHash, roleId: superAdminRole.id, branchId: 1 }
    });

    console.log('✅ Super Admin user created (PIN: 020518)');

    // 5. Create Default Client
    await prisma.client.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: 'Clientes Varios', documentId: '00000000-0', isActive: true }
    });

    // 6. Create Master Config
    const defaultSidebarConfig = [
        { key: 'pos', label: 'Ventas (POS)', enabled: true },
        { key: 'summary', label: 'Resumen Día', enabled: true },
        { key: 'inventory', label: 'Inventario', enabled: true },
        { key: 'replenishment', label: 'Reposición', enabled: true },
        { key: 'products', label: 'Productos', enabled: true },
        { key: 'categories', label: 'Categorías', enabled: false },
        { key: 'suppliers', label: 'Proveedores', enabled: false },
        { key: 'clients', label: 'Clientes', enabled: true },
        { key: 'receivable', label: 'CxC', enabled: false },
        { key: 'payable', label: 'CxP', enabled: false },
        { key: 'expenses', label: 'Gastos', enabled: true },
        { key: 'history', label: 'Hist. Ventas', enabled: true },
        { key: 'closings', label: 'Cortes Caja', enabled: false },
        { key: 'users', label: 'Personal', enabled: false },
        { key: 'branches', label: 'Sucursales', enabled: false },
        { key: 'reports', label: 'Reportes', enabled: false },
        { key: 'admin', label: 'Dashboard', enabled: true },
        { key: 'settings', label: 'Configuración', enabled: false },
        { key: 'audit', label: 'Auditoría', enabled: false },
        { key: 'transfers', label: 'Traslados', enabled: false },
        { key: 'projections', label: 'Proyecciones', enabled: false },
        { key: 'lookup', label: 'Consultar', enabled: true },
        { key: 'sellerReport', label: 'Comisiones', enabled: true }
    ];
    const defaultDashboardConfig = [
        { key: 'pos', label: 'Punto de Venta' },
        { key: 'summary', label: 'Resumen Día' },
        { key: 'inventory', label: 'Inventario' },
        { key: 'replenishment', label: 'Reposición' },
        { key: 'products', label: 'Productos' },
        { key: 'clients', label: 'Clientes' },
        { key: 'expenses', label: 'Gastos' },
        { key: 'history', label: 'Historial Ventas' },
        { key: 'projections', label: 'Proyecciones' },
        { key: 'reports', label: 'Reportes' },
        { key: 'receivable', label: 'Cuentas por Cobrar' },
        { key: 'payable', label: 'Cuentas por Pagar' },
        { key: 'transfers', label: 'Traslados' },
        { key: 'closings', label: 'Cortes de Caja' },
        { key: 'categories', label: 'Categorías' },
        { key: 'suppliers', label: 'Proveedores' },
        { key: 'branches', label: 'Sucursales' },
        { key: 'users', label: 'Personal' },
        { key: 'settings', label: 'Configuración' },
        { key: 'audit', label: 'Auditoría' },
        { key: 'shipments', label: 'Envíos' },
        { key: 'lookup', label: 'Consultar' },
        { key: 'sellerReport', label: 'Comisiones' }
    ];
    await prisma.masterConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1, businessName: 'Mi Negocio', autoClosingTime: '23:59',
            sidebarConfig: JSON.stringify({
                sidebar: defaultSidebarConfig,
                dashboard: defaultDashboardConfig
            })
        }
    });

    console.log('✅ Default config created.');
    console.log('✅ Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

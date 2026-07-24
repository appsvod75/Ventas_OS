require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { allPermissions, PERMISSIONS } = require('../utils/permissions');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding...');

    // 1. Create Permissions
    const permissionRecords = [];
    for (const key of allPermissions) {
        const name = key.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' - ');
        const perm = await prisma.permission.upsert({
            where: { key },
            update: {},
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

    // Ventas: only pos.access, sales.create, products.view, inventory.view, clients.view, expenses.view
    const vendorPermissions = [
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.CLIENTS_VIEW,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.PROVIDERS_VIEW,
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
        { key: 'projections', label: 'Proyecciones', enabled: false }
    ];
    await prisma.masterConfig.upsert({
        where: { id: 1 },
        update: { sidebarConfig: JSON.stringify(defaultSidebarConfig) },
        create: { id: 1, businessName: 'LuckyPOS', autoClosingTime: '23:59', sidebarConfig: JSON.stringify(defaultSidebarConfig) }
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

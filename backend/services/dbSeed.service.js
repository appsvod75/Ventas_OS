const prisma = require('../db');

const seedDefaultClient = async () => {
    try {
        const defaultClient = await prisma.client.upsert({
            where: { id: 1 },
            update: {},
            create: {
                id: 1,
                name: 'Clientes Varios',
                documentId: '00000000-0',
                phone: '0000-0000',
                email: 'ventas@luckypos.com',
                address: 'Ventas de Mostrador',
                isActive: true
            }
        });
        console.log('✅ Default client (Clientes Varios) verified/created.');
        return defaultClient;
    } catch (error) {
        console.error('❌ Error seeding default client:', error);
    }
};

module.exports = { seedDefaultClient };

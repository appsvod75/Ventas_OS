const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- USERS IN DB ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}, Name: ${u.name}, PinHash: ${u.pinHash}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

check();

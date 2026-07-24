const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting data reset...');
    try {
        // Delete in order to respect foreign keys
        await prisma.paymentApplication.deleteMany({});
        console.log('Deleted payment applications.');

        await prisma.clientPayment.deleteMany({});
        console.log('Deleted client payments.');

        await prisma.saleD.deleteMany({});
        console.log('Deleted sale details.');

        await prisma.saleH.deleteMany({});
        console.log('Deleted sale headers.');

        // Correct model name is cashClosing
        await prisma.cashClosing.deleteMany({});
        console.log('Deleted cash closings.');

        console.log('Data reset completed successfully.');
    } catch (error) {
        console.error('Error during data reset:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

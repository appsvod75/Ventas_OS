const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.masterConfig.findFirst();
    if (config) {
        await prisma.masterConfig.update({
            where: { id: config.id },
            data: {
                geminiApiKey: 'AIzaSyC_KucAipvZOJolsD5YwsWSXJ4Cz8CQwNo',
                businessName: 'LuckyPOS',
            }
        });
        console.log('MasterConfig updated with API Key');
    } else {
        await prisma.masterConfig.create({
            data: {
                businessName: 'LuckyPOS',
                geminiApiKey: 'AIzaSyC_KucAipvZOJolsD5YwsWSXJ4Cz8CQwNo'
            }
        });
        console.log('MasterConfig created with API Key');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

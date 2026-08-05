// Backfill: crea una direccion default (etiqueta "Casa") por cada cliente
// que tenga Client.address y todavia no tenga ninguna ClientAddress.
// Uso en VPS: node scripts/backfill_client_addresses.js  (una sola vez)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany({
        where: { address: { not: null, not: '' } },
        select: { id: true, name: true, address: true }
    });

    let created = 0;
    let skipped = 0;

    for (const c of clients) {
        const existing = await prisma.clientAddress.findFirst({ where: { clientId: c.id } });
        if (existing) { skipped++; continue; }
        await prisma.clientAddress.create({
            data: { clientId: c.id, label: 'Casa', address: c.address, isDefault: true }
        });
        created++;
    }

    console.log(`Clientes con direccion: ${clients.length}`);
    console.log(`Direcciones creadas: ${created}, ya existentes (saltadas): ${skipped}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
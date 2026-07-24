const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sales = await prisma.saleH.findMany({ orderBy: { id: 'desc' }, take: 5, include: { client: true } });
  console.log(JSON.stringify(sales, null, 2));
}
main();

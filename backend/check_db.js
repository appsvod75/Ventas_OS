const prisma = require('./db');

async function check() {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true }
    });
    console.log('--- PRODUCTS ---');
    products.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}, Active: ${p.isActive}`);
      p.inventory.forEach(i => {
        console.log(`  - Branch: ${i.branchId}, Stock: ${i.stockLevel}, Min: ${i.minStock}`);
      });
    });

    const branches = await prisma.branch.findMany();
    console.log('\n--- BRANCHES ---');
    branches.forEach(b => {
      console.log(`ID: ${b.id}, Name: ${b.name}, Active: ${b.isActive}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();

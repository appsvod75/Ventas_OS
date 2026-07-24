const mysql = require('mysql2/promise');
require('dotenv').config();

// Extract connection info from DATABASE_URL
// DATABASE_URL="mysql://root:@localhost:3306/luckypos"
const url = process.env.DATABASE_URL;
const regex = /mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/;
const match = url.match(regex);

async function check() {
  if (!match) {
    console.error('DATABASE_URL format not recognized');
    return;
  }
  const [, user, password, host, port, database] = match;

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password: password || '',
      port,
      database
    });

    console.log('--- PRODUCTS (Acetaminofen) ---');
    const [products] = await connection.execute('SELECT * FROM products WHERE name LIKE "%Acetaminofen%" OR sku LIKE "%Acetaminofen%";');
    console.log(JSON.stringify(products, null, 2));

    if (products.length > 0) {
      console.log('\n--- INVENTORY FOR THESE PRODUCTS ---');
      const productIds = products.map(p => p.id).join(',');
      const [inventory] = await connection.execute(`SELECT * FROM inventory WHERE product_id IN (${productIds});`);
      console.log(JSON.stringify(inventory, null, 2));
    }

    console.log('\n--- BRANCHES ---');
    const [branches] = await connection.execute('SELECT * FROM branches WHERE is_active = 1;');
    console.log(JSON.stringify(branches, null, 2));

    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

check();

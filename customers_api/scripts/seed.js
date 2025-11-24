import 'dotenv/config';
import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const seedPath = join(__dirname, '../../db/seed.sql');
    const seedData = readFileSync(seedPath, 'utf8');

    await connection.query(seedData);
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();

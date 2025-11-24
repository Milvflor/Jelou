import 'dotenv/config';
import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    const schemaPath = join(__dirname, '../../db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    await connection.query(schema);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

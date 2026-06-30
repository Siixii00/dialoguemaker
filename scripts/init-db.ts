import { db, initDatabase } from '../src/lib/db';

async function main() {
  console.log('Initializing database...');
  await initDatabase();
  console.log('Database initialized successfully!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
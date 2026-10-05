import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const { ensureIndexes } = await import('../src/lib/db');
await ensureIndexes();
console.log('MongoDB Atlas indexes are ready.');
process.exit(0);

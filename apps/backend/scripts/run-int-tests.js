const { execFileSync } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const backendDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendDir, '.env'), quiet: true });

const DEFAULT_TEST_DB_URL =
  'postgresql://quacker:quacker@localhost:5433/quacker_test';

function resolveTestDatabaseUrl() {
  const raw = process.env.DATABASE_URL || DEFAULT_TEST_DB_URL;
  const url = new URL(raw);
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName || dbName === 'quacker') {
    url.pathname = '/quacker_test';
  }
  return url.toString();
}

async function ensureDatabaseExists(databaseUrl) {
  const targetUrl = new URL(databaseUrl);
  const dbName = targetUrl.pathname.replace(/^\//, '');
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`Unsafe database name: ${dbName}`);
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created test database "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const testDatabaseUrl = resolveTestDatabaseUrl();
  process.env.DATABASE_URL = testDatabaseUrl;

  await ensureDatabaseExists(testDatabaseUrl);

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
  });

  const extraArgs = process.argv.slice(2);
  execFileSync(
    'pnpm',
    ['exec', 'jest', '--config', 'jest.int.config.json', '--runInBand', ...extraArgs],
    {
      cwd: backendDir,
      stdio: 'inherit',
      env: process.env,
    },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

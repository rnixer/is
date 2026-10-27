import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
const root = resolve(import.meta.dirname, '..');
const bin = resolve(root, '.local/pgsql/bin/pg_ctl.exe');
const data = resolve(root, '.local/postgres-data');
if (!existsSync(bin) || !existsSync(resolve(data, 'PG_VERSION'))) {
  throw new Error('Local PostgreSQL is not installed. See docs/local-backend.md.');
}
const env = parseEnv(readFileSync(resolve(root, 'apps/cms/.env'), 'utf8'));
const port = Number(env.DATABASE_PORT || 5432);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DATABASE_PORT');
const run = (args) =>
  spawnSync(bin, ['-D', data, ...args], { stdio: 'inherit', windowsHide: true });
if (process.argv[2] === 'stop') {
  process.exitCode = run(['stop', '-m', 'fast', '-w']).status ?? 1;
} else {
  const status = spawnSync(bin, ['-D', data, 'status'], { windowsHide: true, stdio: 'ignore' });
  if (status.status === 0) console.log('Local PostgreSQL is already running.');
  else
    process.exitCode =
      run([
        '-l',
        resolve(root, '.local/postgres.log'),
        '-o',
        `-h 127.0.0.1 -p ${port}`,
        'start',
        '-w',
      ]).status ?? 1;
}

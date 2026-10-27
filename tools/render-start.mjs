import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const required = [
  ...(process.env.DATABASE_URL?.trim()
    ? []
    : ['DATABASE_HOST', 'DATABASE_USERNAME', 'DATABASE_PASSWORD']),
  'DATABASE_SSL_CA',
  'APP_KEYS',
  'API_TOKEN_SALT',
  'ADMIN_JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'STOREFRONT_TOKEN',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_PUBLIC_URL',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) throw new Error(`Missing Render environment variables: ${missing.join(', ')}`);
let databaseHost = process.env.DATABASE_HOST;
if (process.env.DATABASE_URL?.trim()) {
  let url;
  try {
    url = new URL(process.env.DATABASE_URL.trim());
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.password
  )
    throw new Error('DATABASE_URL needs a PostgreSQL host, username and password.');
  databaseHost = url.hostname;
}
if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseHost)) {
  throw new Error('Render must connect to Supabase, not the local Windows database.');
}
if (process.env.UPLOAD_PROVIDER !== 'aws-s3')
  throw new Error('Render needs persistent S3 uploads.');
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/@strapi/strapi/bin/strapi.js', import.meta.url)),
    'start',
  ],
  {
    cwd: new URL('../apps/cms/', import.meta.url),
    stdio: 'inherit',
  },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));

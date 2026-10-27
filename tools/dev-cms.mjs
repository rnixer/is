import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import net from 'node:net';

const env = parseEnv(readFileSync(new URL('../apps/cms/.env', import.meta.url), 'utf8'));
const port = Number(env.PORT?.trim() || 1337);
const base = `http://127.0.0.1:${port}`;
const occupied = await new Promise((resolve) => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.setTimeout(1500);
  socket.once('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.once('error', () => resolve(false));
  socket.once('timeout', () => {
    socket.destroy();
    resolve(false);
  });
});
if (occupied) {
  const response = await fetch(`${base}/api/store/catalog`, {
    headers: { 'x-storefront-token': env.STOREFRONT_TOKEN || '' },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (response?.ok && Array.isArray((await response.json().catch(() => null))?.products)) {
    console.log(`Backend is already running. Use ${base}/admin (no duplicate server started).`);
  } else {
    console.error(
      `Port ${port} is occupied or the backend is still starting. Check ${base}/admin before retrying. No process was stopped.`,
    );
    process.exitCode = 1;
  }
} else {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/@strapi/strapi/bin/strapi.js', import.meta.url)),
      'develop',
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
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
}

// Minimal Node adapter for the Start Fetch entry, including public assets.
import http from 'node:http';
import { Readable } from 'node:stream';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/storefront');
const { default: app } = await import(pathToFileURL(path.join(root, 'dist/server/server.js')).href);
const types = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
const origin = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
const client = path.join(root, 'dist/client');
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', origin);
      const file = path.resolve(client, '.' + decodeURIComponent(url.pathname));
      if (file.startsWith(client + path.sep) && ['GET', 'HEAD'].includes(req.method)) {
        const info = await stat(file).catch(() => null);
        if (info?.isFile()) {
          res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
          res.setHeader(
            'cache-control',
            url.pathname.startsWith('/assets/')
              ? 'public,max-age=31536000,immutable'
              : 'public,max-age=3600',
          );
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          createReadStream(file).pipe(res);
          return;
        }
      }
      const init = { method: req.method, headers: req.headers };
      if (!['GET', 'HEAD'].includes(req.method)) {
        init.body = Readable.toWeb(req);
        init.duplex = 'half';
      }
      const response = await app.fetch(new Request(url, init));
      res.statusCode = response.status;
      response.headers.forEach((value, name) => {
        if (name !== 'set-cookie') res.setHeader(name, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('set-cookie', cookies);
      if (response.body) Readable.fromWeb(response.body).pipe(res);
      else res.end();
    } catch {
      res.statusCode = 500;
      res.end('Storefront temporarily unavailable');
    }
  })
  .listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () =>
    console.log(`Storefront listening on ${process.env.PORT || 3000}`),
  );

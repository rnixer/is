import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            ...(process.env.S3_PUBLIC_URL ? [new URL(process.env.S3_PUBLIC_URL).origin] : []),
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            ...(process.env.S3_PUBLIC_URL ? [new URL(process.env.S3_PUBLIC_URL).origin] : []),
          ],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000',
        'https://is-mix14.vercel.app',
        'https://casual-probably-dingo.ngrok-free.app',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Storefront-Token', 'x-storefront-token'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  { name: 'strapi::body', config: { includeUnparsed: true, jsonLimit: '1mb' } },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;

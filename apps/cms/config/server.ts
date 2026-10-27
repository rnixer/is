import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  url: env('PUBLIC_URL', env('RENDER_EXTERNAL_URL', '')) || undefined,
  port: env('PORT', '').trim() ? env.int('PORT', 1337) : 1337,
  cron: {
    enabled: true,
    tasks: {
      '*/2 * * * *': async ({ strapi }) => {
        const { reconcile } = await import('../src/commerce/store');
        await reconcile(strapi);
      },
    },
  },
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;

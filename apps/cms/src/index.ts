import type { Core } from '@strapi/strapi';
import { registerGuards, ensureConstraints } from './commerce/guards';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Fail before Strapi's schema synchronization if a broken/incomplete build
    // omitted application models. Never let that look like model deletion.
    for (const uid of [
      'api::product.product',
      'api::variant.variant',
      'api::collection.collection',
      'api::order.order',
      'api::reservation.reservation',
      'api::stripe-event.stripe-event',
    ] as const) {
      if (!strapi.contentTypes[uid])
        throw new Error(
          `Incomplete CMS build: ${uid} missing. Database startup refused; rebuild the CMS.`,
        );
    }
    registerGuards(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureConstraints(strapi);
  },
};

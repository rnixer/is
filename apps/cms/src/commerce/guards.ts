import type { Core } from '@strapi/strapi';
import { table } from './store';
export function registerGuards(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx, next) => {
    const model = ctx.uid as string;
    if (
      [
        'api::order.order',
        'api::reservation.reservation',
        'api::stripe-event.stripe-event',
      ].includes(model) &&
      ['create', 'update', 'delete', 'publish'].includes(ctx.action)
    ) {
      if (model === 'api::order.order' && ctx.action === 'update') {
        const data = (ctx.params as { data?: Record<string, unknown> }).data || {};
        const existing = await strapi
          .documents('api::order.order')
          .findOne({ documentId: (ctx.params as { documentId: string }).documentId });
        if (
          existing &&
          Object.entries(data).every(
            ([k, value]) =>
              ['fulfillmentStatus', 'trackingNumber'].includes(k) ||
              JSON.stringify(value) ===
                JSON.stringify((existing as unknown as Record<string, unknown>)[k]),
          )
        )
          return next();
      }
      throw new Error(
        'Payment and reservation records are read-only. Use fulfillment fields on orders.',
      );
    }
    if (model === 'api::variant.variant' && ['update', 'delete'].includes(ctx.action)) {
      return strapi.db.transaction(async ({ trx }) => {
        const row = await trx(table(strapi, model))
          .where('document_id', (ctx.params as { documentId: string }).documentId)
          .forUpdate()
          .first();
        if (row?.reserved)
          throw new Error(
            'This item is reserved for a pending payment. Try again after payment or expiration.',
          );
        const data = (ctx.params as { data?: Record<string, unknown> }).data || {};
        if ('reserved' in data && data.reserved !== row?.reserved)
          throw new Error('Reserved stock is managed automatically.');
        if ('sku' in data && data.sku !== row?.sku) throw new Error('SKU cannot be changed.');
        return next();
      });
    }
    return next();
  });
}
export async function ensureConstraints(strapi: Core.Strapi) {
  const db = strapi.db.connection;
  const variants = table(strapi, 'api::variant.variant'),
    reservations = table(strapi, 'api::reservation.reservation');
  const constraint = 'igh_variant_stock_bounds';
  const exists = await db.raw('SELECT 1 FROM pg_constraint WHERE conname = ?', [constraint]);
  if (!exists.rows.length)
    await db.raw(
      'ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (stock IN (0,1) AND reserved IN (0,1) AND reserved <= stock)',
      [variants, constraint],
    );
  await db.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS igh_reservation_order_sku ON ?? (order_reference,sku)',
    [reservations],
  );
  // Strapi's `unique` attribute validates via the CMS but does not guarantee a
  // PostgreSQL unique index. Commerce invariants need explicit DB constraints.
  for (const [name, uid, column] of [
    ['igh_variant_sku', 'api::variant.variant', 'sku'],
    ['igh_variant_product_slug', 'api::variant.variant', 'product_slug'],
    ['igh_order_reference', 'api::order.order', 'reference'],
    ['igh_order_idempotency', 'api::order.order', 'idempotency_key'],
    ['igh_order_session', 'api::order.order', 'stripe_session_id'],
    ['igh_stripe_event_id', 'api::stripe-event.stripe-event', 'event_id'],
  ])
    await db.raw('CREATE UNIQUE INDEX IF NOT EXISTS ?? ON ?? (??)', [
      name,
      table(strapi, uid),
      column,
    ]);
}

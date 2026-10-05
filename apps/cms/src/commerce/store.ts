import type { Core } from '@strapi/strapi';
import Stripe from 'stripe';
import { randomUUID, createHash } from 'node:crypto';
import { SHIPPING_SATANG, type CheckoutInput } from './validation';

type Item = { sku: string; name: string; slug: string; priceSatang: number; quantity: 1 };
export type OrderRow = {
  id: number;
  reference: string;
  access_token_hash: string;
  idempotency_key: string;
  request_hash: string;
  payment_status: string;
  customer: CheckoutInput['customer'];
  items: Item[];
  subtotal_satang: number;
  shipping_satang: number;
  total_satang: number;
  expires_at: string;
  stripe_session_id: string | null;
  checkout_url: string | null;
};
type RawOrderRow = Omit<OrderRow, 'items' | 'customer'> & {
  items: Item[] | string;
  customer: CheckoutInput['customer'] | string;
};
// Strapi installs PostgreSQL JSON parsers that defer deserialization to its
// query engine. Raw Knex queries must normalize JSON columns explicitly.
export const normalizeOrder = (row: RawOrderRow): OrderRow => ({
  ...row,
  items: typeof row.items === 'string' ? (JSON.parse(row.items) as Item[]) : row.items,
  customer:
    typeof row.customer === 'string'
      ? (JSON.parse(row.customer) as CheckoutInput['customer'])
      : row.customer,
});
type VariantRow = {
  id: number;
  sku: string;
  product_slug: string;
  stock: number;
  reserved: number;
  active: boolean;
};
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const table = (strapi: Core.Strapi, uid: string) => strapi.db.metadata.get(uid).tableName;
export function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const live = process.env.STRIPE_MODE === 'live';
  if (!secret || !secret.startsWith(live ? 'sk_live_' : 'sk_test_'))
    throw new Error('PAYMENTS_NOT_CONFIGURED');
  return new Stripe(secret, { maxNetworkRetries: 2, timeout: 20000 });
}
const serialize = (x: unknown) => JSON.stringify(x);

export async function reserve(strapi: Core.Strapi, input: CheckoutInput, token: string) {
  const db = strapi.db.connection;
  const orders = table(strapi, 'api::order.order'),
    variants = table(strapi, 'api::variant.variant'),
    reservations = table(strapi, 'api::reservation.reservation');
  // PostgreSQL advisory lock serializes identical request keys before the order
  // exists. All stock row locks are acquired in deterministic SKU order.
  return db.transaction(async (trx) => {
    await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [input.idempotencyKey]);
    const normalized = {
      items: [...input.items].sort((a, b) => a.sku.localeCompare(b.sku)),
      customer: input.customer,
    };
    const requestHash = hash(serialize(normalized));
    const previousRaw = await trx<RawOrderRow>(orders)
      .where('idempotency_key', input.idempotencyKey)
      .first();
    if (previousRaw) {
      const previous = normalizeOrder(previousRaw);
      if (previous.request_hash !== requestHash || previous.access_token_hash !== hash(token))
        throw new Error('CHECKOUT_CONFLICT');
      if (previous.payment_status !== 'PENDING_PAYMENT') throw new Error('CHECKOUT_CLOSED');
      return previous;
    }
    const rows = await trx<VariantRow>(variants)
      .whereIn(
        'sku',
        normalized.items.map((i) => i.sku),
      )
      .orderBy('sku')
      .forUpdate();
    if (rows.length !== normalized.items.length || rows.some((v) => v.stock - v.reserved < 1))
      throw new Error('ITEM_UNAVAILABLE');
    const items: Item[] = [];
    for (const row of rows) {
      const product = await strapi.db.query('api::product.product').findOne({
        where: {
          slug: row.product_slug,
          publishedAt: { $notNull: true },
        },
      });
      if (
        !product ||
        product.sku !== row.sku ||
        !Number.isSafeInteger(product.priceSatang) ||
        product.priceSatang < 1
      )
        throw new Error('ITEM_UNAVAILABLE');
      items.push({
        sku: row.sku,
        name: product.name,
        slug: product.slug,
        priceSatang: product.priceSatang,
        quantity: 1,
      });
    }
    const subtotal = items.reduce((sum, i) => sum + i.priceSatang, 0);
    if (!Number.isSafeInteger(subtotal) || subtotal > 10_000_000)
      throw new Error('ORDER_TOO_LARGE');
    const now = new Date(),
      expires = new Date(now.getTime() + 35 * 60 * 1000);
    const reference = randomUUID();
    const [order] = (await trx(orders)
      .insert({
        document_id: randomUUID().replaceAll('-', '').slice(0, 24),
        reference,
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        access_token_hash: hash(token),
        payment_status: 'PENDING_PAYMENT',
        fulfillment_status: 'UNFULFILLED',
        currency: 'THB',
        customer: serialize(input.customer),
        items: serialize(items),
        subtotal_satang: subtotal,
        shipping_satang: SHIPPING_SATANG,
        total_satang: subtotal + SHIPPING_SATANG,
        expires_at: expires.toISOString(),
        published_at: now,
        created_at: now,
        updated_at: now,
      })
      .returning('*')) as OrderRow[];
    for (const row of rows) {
      await trx(variants).where('id', row.id).update({ reserved: 1, updated_at: now });
      await trx(reservations).insert({
        document_id: randomUUID().replaceAll('-', '').slice(0, 24),
        order_reference: reference,
        sku: row.sku,
        state: 'ACTIVE',
        expires_at: expires.toISOString(),
        published_at: now,
        created_at: now,
        updated_at: now,
      });
    }
    return normalizeOrder(order);
  });
}

export async function createCheckout(strapi: Core.Strapi, input: CheckoutInput, token: string) {
  const stripe = stripeClient(); // Fail before reserving if secret missing.
  const order = await reserve(strapi, input, token);
  if (order.checkout_url) return { url: order.checkout_url, reference: order.reference };
  const origin = process.env.STOREFRONT_URL || 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      allowed_payment_method_types: ['promptpay', 'card'],
      customer_email: input.customer.email,
      client_reference_id: order.reference,
      metadata: { orderReference: order.reference },
      payment_intent_data: { metadata: { orderReference: order.reference } },
      expires_at: Math.floor(new Date(order.expires_at).getTime() / 1000),
      line_items: [
        ...order.items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: 'thb',
            unit_amount: item.priceSatang,
            product_data: { name: item.name },
          },
        })),
        {
          quantity: 1,
          price_data: {
            currency: 'thb',
            unit_amount: SHIPPING_SATANG,
            product_data: { name: 'จัดส่งทั่วประเทศไทย' },
          },
        },
      ],
      success_url: `${origin}/order/${order.reference}`,
      cancel_url: `${origin}/checkout?cancelled=true`,
    },
    { idempotencyKey: `checkout-${order.idempotency_key}` },
  );
  // Deterministic key recovers sessions after network failures/process restarts.
  await strapi.db
    .connection(table(strapi, 'api::order.order'))
    .where('id', order.id)
    .update({ stripe_session_id: session.id, checkout_url: session.url, updated_at: new Date() });
  if (!session.url) throw new Error('PAYMENT_SESSION_NOT_READY');
  return { url: session.url, reference: order.reference };
}

export async function consumePaidSession(
  strapi: Core.Strapi,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== 'paid' || !session.payment_intent) return;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
  const orders = table(strapi, 'api::order.order'),
    variants = table(strapi, 'api::variant.variant'),
    reservations = table(strapi, 'api::reservation.reservation'),
    events = table(strapi, 'api::stripe-event.stripe-event');
  await strapi.db.connection.transaction(async (trx) => {
    const inserted = await trx(events)
      .insert({
        document_id: randomUUID().replaceAll('-', '').slice(0, 24),
        event_id: event.id,
        event_type: event.type,
        processed_at: new Date(),
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict('event_id')
      .ignore()
      .returning('id');
    if (!inserted.length) return;
    const rawOrder = await trx<RawOrderRow>(orders)
      .where('reference', session.metadata?.orderReference || '')
      .forUpdate()
      .first();
    const order = rawOrder ? normalizeOrder(rawOrder) : undefined;
    if (
      !order ||
      session.client_reference_id !== order.reference ||
      session.currency !== 'thb' ||
      session.amount_total !== order.total_satang ||
      (order.stripe_session_id && order.stripe_session_id !== session.id)
    )
      throw new Error('PAYMENT_MISMATCH');
    if (order.payment_status === 'PAID') return;
    if (order.payment_status !== 'PENDING_PAYMENT') {
      await trx(orders)
        .where('id', order.id)
        .update({ payment_status: 'PAYMENT_REVIEW', updated_at: new Date() });
      return;
    }
    const holds = await trx(reservations)
      .where({ order_reference: order.reference, state: 'ACTIVE' })
      .orderBy('sku')
      .forUpdate();
    if (holds.length !== order.items.length) throw new Error('RESERVATION_MISMATCH');
    for (const hold of holds) {
      const count = await trx(variants)
        .where({ sku: hold.sku, stock: 1, reserved: 1 })
        .update({ stock: 0, reserved: 0, updated_at: new Date() });
      if (count !== 1) throw new Error('RESERVATION_MISMATCH');
      await trx(reservations)
        .where('id', hold.id)
        .update({ state: 'CONSUMED', updated_at: new Date() });
    }
    await trx(orders).where('id', order.id).update({
      payment_status: 'PAID',
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date(),
      updated_at: new Date(),
    });
  });
}

export async function releaseExpired(strapi: Core.Strapi, reference: string) {
  const orders = table(strapi, 'api::order.order'),
    variants = table(strapi, 'api::variant.variant'),
    reservations = table(strapi, 'api::reservation.reservation');
  await strapi.db.connection.transaction(async (trx) => {
    const order = await trx<OrderRow>(orders).where('reference', reference).forUpdate().first();
    if (!order || order.payment_status !== 'PENDING_PAYMENT') return;
    const holds = await trx(reservations)
      .where({ order_reference: reference, state: 'ACTIVE' })
      .orderBy('sku')
      .forUpdate();
    for (const hold of holds) {
      await trx(variants)
        .where({ sku: hold.sku, reserved: 1 })
        .update({ reserved: 0, updated_at: new Date() });
      await trx(reservations)
        .where('id', hold.id)
        .update({ state: 'RELEASED', updated_at: new Date() });
    }
    await trx(orders)
      .where('id', order.id)
      .update({ payment_status: 'EXPIRED', updated_at: new Date() });
  });
}

export async function reconcile(strapi: Core.Strapi) {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const stripe = stripeClient();
  const overdue = await strapi.db
    .connection<RawOrderRow>(table(strapi, 'api::order.order'))
    .where('payment_status', 'PENDING_PAYMENT')
    .where('expires_at', '<', new Date())
    .limit(50);
  for (const rawOrder of overdue) {
    const order = normalizeOrder(rawOrder);
    try {
      let session: Stripe.Checkout.Session;
      if (!order.stripe_session_id) {
        // Stripe cannot safely replay a create with an already expired expires_at.
        // Search by durable metadata; retain the hold on uncertain outcomes.
        const intents = await stripe.paymentIntents.search({
          query: `metadata['orderReference']:'${order.reference}'`,
        });
        if (intents.data.length) {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: intents.data[0].id,
            limit: 1,
          });
          if (!sessions.data.length) continue;
          session = sessions.data[0];
        } else {
          // Checkout can exist without a PaymentIntent until payment selection.
          // Scan recent sessions rather than assume no session was created.
          const sessions = await stripe.checkout.sessions.list({
            created: { gte: Math.floor(new Date(order.expires_at).getTime() / 1000) - 3600 },
            limit: 100,
          });
          const match = sessions.data.find((s) => s.metadata?.orderReference === order.reference);
          if (!match) {
            strapi.log.warn(
              `Order ${order.reference}: creation outcome needs review; reservation retained`,
            );
            continue;
          }
          session = match;
        }
        await strapi.db
          .connection(table(strapi, 'api::order.order'))
          .where('id', order.id)
          .update({ stripe_session_id: session.id, checkout_url: session.url });
      } else session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_status === 'paid') {
        await consumePaidSession(
          strapi,
          { id: `reconcile-${session.id}`, type: 'checkout.session.completed' } as Stripe.Event,
          session,
        );
        continue;
      }
      if (session.status === 'open') session = await stripe.checkout.sessions.expire(session.id);
      if (session.status === 'expired' && session.payment_status === 'unpaid') {
        if (session.payment_intent) {
          const id =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent.id;
          let intent = await stripe.paymentIntents.retrieve(id);
          if (['processing', 'succeeded'].includes(intent.status)) continue;
          if (intent.status !== 'canceled') intent = await stripe.paymentIntents.cancel(id);
          if (intent.status !== 'canceled') continue;
        }
        await releaseExpired(strapi, order.reference);
      }
    } catch {
      strapi.log.warn(`Order ${order.reference}: reconciliation deferred`);
    }
  }
}

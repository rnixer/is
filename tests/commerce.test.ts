import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import knex from 'knex';
import { randomUUID } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import Stripe from 'stripe';
import { checkoutSchema as sharedSchema, SHIPPING_SATANG } from '../packages/contracts/src/index';
import { checkoutSchema, type CheckoutInput } from '../apps/cms/src/commerce/validation';
import { reserve, consumePaidSession, releaseExpired } from '../apps/cms/src/commerce/store';

const customer = {
  name: 'Test buyer',
  email: 'buyer@example.com',
  phone: '0812345678',
  address: '123 Test road',
  subdistrict: 'Test',
  district: 'Test',
  province: 'Bangkok',
  postalCode: '10100',
};
const input = (sku = 'sku-a'): CheckoutInput => ({
  items: [{ sku, quantity: 1 }],
  idempotencyKey: randomUUID(),
  customer,
});
test('Checkout rejects browser price/payment fields and duplicate or multi-unit SKUs', () => {
  for (const schema of [sharedSchema, checkoutSchema]) {
    assert.equal(schema.safeParse(input()).success, true);
    assert.equal(schema.safeParse({ ...input(), price: 1 }).success, false);
    assert.equal(schema.safeParse({ ...input(), paymentStatus: 'PAID' }).success, false);
    assert.equal(
      schema.safeParse({ ...input(), items: [{ sku: 'a', quantity: 1, price: 1 }] }).success,
      false,
    );
    assert.equal(
      schema.safeParse({ ...input(), items: [{ sku: 'a', quantity: 2 }] }).success,
      false,
    );
    assert.equal(
      schema.safeParse({
        ...input(),
        items: [
          { sku: 'a', quantity: 1 },
          { sku: 'a', quantity: 1 },
        ],
      }).success,
      false,
    );
  }
  assert.equal(SHIPPING_SATANG, 3000);
});
test('Stripe validates raw-body signatures and rejects modified payloads', () => {
  const stripe = new Stripe('sk_test_fixture'),
    secret = 'whsec_fixture';
  const body = JSON.stringify({
    id: 'evt_fixture',
    object: 'event',
    type: 'checkout.session.completed',
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  assert.equal(stripe.webhooks.constructEvent(body, signature, secret).id, 'evt_fixture');
  assert.throws(() => stripe.webhooks.constructEvent(body + ' ', signature, secret));
});

// Dedicated temporary schema in real PostgreSQL, never the shop's tables.
const schema = 'test_' + randomUUID().replaceAll('-', '');
const db = knex({
  client: 'pg',
  connection:
    process.env.TEST_DATABASE_URL ||
    'postgresql://igh:local-development-only@127.0.0.1:5432/igh_ess',
  pool: { min: 0, max: 6 },
});
const names = {
  'api::order.order': `${schema}.orders`,
  'api::variant.variant': `${schema}.variants`,
  'api::reservation.reservation': `${schema}.reservations`,
  'api::stripe-event.stripe-event': `${schema}.events`,
};
const fake = {
  db: {
    connection: db,
    metadata: { get: (uid: keyof typeof names) => ({ tableName: names[uid] }) },
    query: () => ({
      findOne: async () => ({
        name: 'Trusted product',
        slug: 'trusted-product',
        sku: 'sku-a',
        priceSatang: 20000,
      }),
    }),
  },
} as unknown as Core.Strapi;
before(async () => {
  await db.raw('CREATE SCHEMA ??', [schema]);
  await db.schema.withSchema(schema).createTable('variants', (t) => {
    t.increments('id');
    t.string('sku').unique();
    t.string('product_slug');
    t.integer('stock');
    t.integer('reserved');
    t.boolean('active');
    t.timestamp('updated_at');
  });
  await db.schema.withSchema(schema).createTable('orders', (t) => {
    t.increments('id');
    for (const name of [
      'document_id',
      'reference',
      'idempotency_key',
      'access_token_hash',
      'request_hash',
      'payment_status',
      'fulfillment_status',
      'currency',
      'stripe_session_id',
      'stripe_payment_intent_id',
      'checkout_url',
    ])
      t.string(name);
    t.unique('idempotency_key');
    t.jsonb('customer');
    t.jsonb('items');
    for (const name of ['subtotal_satang', 'shipping_satang', 'total_satang']) t.integer(name);
    for (const name of ['expires_at', 'created_at', 'updated_at', 'paid_at', 'published_at'])
      t.timestamp(name);
  });
  await db.schema.withSchema(schema).createTable('reservations', (t) => {
    t.increments('id');
    for (const name of ['document_id', 'order_reference', 'sku', 'state']) t.string(name);
    for (const name of ['expires_at', 'created_at', 'updated_at', 'published_at'])
      t.timestamp(name);
    t.unique(['order_reference', 'sku']);
  });
  await db.schema.withSchema(schema).createTable('events', (t) => {
    t.increments('id');
    t.string('document_id');
    t.string('event_id').unique();
    t.string('event_type');
    for (const name of ['processed_at', 'created_at', 'updated_at', 'published_at'])
      t.timestamp(name);
  });
  await db(names['api::variant.variant']).insert({
    sku: 'sku-a',
    product_slug: 'trusted-product',
    stock: 1,
    reserved: 0,
    active: true,
  });
});
after(async () => {
  await db.raw('DROP SCHEMA ?? CASCADE', [schema]);
  await db.destroy();
});
test('Real PostgreSQL: final garment has one winner, retry is idempotent, bad amount rolls back, duplicate events consume once', async () => {
  const a = input(),
    b = input(),
    token = 'a'.repeat(64);
  const results = await Promise.allSettled([reserve(fake, a, token), reserve(fake, b, token)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const winner = results[0].status === 'fulfilled' ? a : b;
  const original = results.find((r) => r.status === 'fulfilled');
  assert.ok(original?.status === 'fulfilled');
  const order = original.value;
  assert.equal(order.total_satang, 23000);
  assert.equal(order.shipping_satang, 3000);
  const again = await reserve(fake, winner, token);
  assert.equal(again.reference, order.reference);
  await assert.rejects(
    reserve(fake, { ...winner, customer: { ...customer, name: 'Other buyer' } }, token),
    /CHECKOUT_CONFLICT/,
  );
  await assert.rejects(reserve(fake, winner, 'b'.repeat(64)), /CHECKOUT_CONFLICT/);
  const session = {
    id: 'cs_test_fixture',
    payment_status: 'paid',
    payment_intent: 'pi_test_fixture',
    client_reference_id: order.reference,
    metadata: { orderReference: order.reference },
    currency: 'thb',
    amount_total: 23000,
  } as Stripe.Checkout.Session;
  const event = (id: string) => ({ id, type: 'checkout.session.completed' }) as Stripe.Event;
  await assert.rejects(
    consumePaidSession(fake, event('evt_bad'), { ...session, amount_total: 1 }),
    /PAYMENT_MISMATCH/,
  );
  assert.equal(
    (await db(names['api::stripe-event.stripe-event']).where('event_id', 'evt_bad')).length,
    0,
  );
  await Promise.all([
    consumePaidSession(fake, event('evt_paid'), session),
    consumePaidSession(fake, event('evt_paid'), session),
  ]);
  await consumePaidSession(fake, event('evt_paid_other'), session);
  const stock = await db(names['api::variant.variant']).first();
  assert.equal(stock.stock, 0);
  assert.equal(stock.reserved, 0);
  assert.equal(
    (await db(names['api::order.order']).where('reference', order.reference).first())
      .payment_status,
    'PAID',
  );
  await releaseExpired(fake, order.reference);
  assert.equal(
    (await db(names['api::order.order']).where('reference', order.reference).first())
      .payment_status,
    'PAID',
  );
});
test('Expiration releases once and late success is flagged for staff review', async () => {
  await db(names['api::variant.variant']).where('sku', 'sku-a').update({ stock: 1, reserved: 0 });
  const order = await reserve(fake, input(), 'a'.repeat(64));
  await releaseExpired(fake, order.reference);
  await releaseExpired(fake, order.reference);
  const stock = await db(names['api::variant.variant']).first();
  assert.equal(stock.stock, 1);
  assert.equal(stock.reserved, 0);
  const session = {
    id: 'cs_late',
    payment_status: 'paid',
    payment_intent: 'pi_late',
    client_reference_id: order.reference,
    metadata: { orderReference: order.reference },
    currency: 'thb',
    amount_total: 23000,
  } as Stripe.Checkout.Session;
  await consumePaidSession(
    fake,
    { id: 'evt_late', type: 'checkout.session.completed' } as Stripe.Event,
    session,
  );
  assert.equal(
    (await db(names['api::order.order']).where('reference', order.reference).first())
      .payment_status,
    'PAYMENT_REVIEW',
  );
  assert.equal((await db(names['api::variant.variant']).first()).stock, 1);
});

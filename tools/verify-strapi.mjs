// Run with the CMS stopped. Creates/removes only uniquely identified fixtures.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { compileStrapi, createStrapi } = require('@strapi/strapi');
process.chdir(path.resolve('apps/cms'));
const app = await createStrapi(await compileStrapi()).load();
const { reserve, consumePaidSession, table } = require(
  path.join(process.cwd(), 'dist/src/commerce/store.js'),
);
const id = randomUUID(),
  sku = `VERIFY-${id}`,
  slug = `verify-${id}`,
  token = 'a'.repeat(64);
let product, variant, order;
const before = (
  await app.documents('api::product.product').findMany({ status: 'draft', limit: 1000 })
).length;
try {
  product = await app
    .documents('api::product.product')
    .create({
      status: 'draft',
      data: {
        name: 'Verification fixture',
        slug,
        sku,
        priceSatang: 21100,
        reviewState: 'NEEDS_REVIEW',
      },
    });
  variant = await app
    .documents('api::variant.variant')
    .create({ data: { sku, productSlug: slug, stock: 1, reserved: 0, active: false } });
  await assert.rejects(
    app.documents('api::product.product').publish({ documentId: product.documentId }),
  );
  await app
    .documents('api::product.product')
    .update({ documentId: product.documentId, data: { reviewState: 'APPROVED' } });
  await assert.rejects(
    app.documents('api::product.product').publish({ documentId: product.documentId }),
  );
  await app
    .documents('api::variant.variant')
    .update({ documentId: variant.documentId, data: { active: true } });
  await app.documents('api::product.product').publish({ documentId: product.documentId });
  order = await reserve(
    app,
    {
      items: [{ sku, quantity: 1 }],
      idempotencyKey: randomUUID(),
      customer: {
        name: 'Verification',
        email: 'verification@example.com',
        phone: '0812345678',
        address: '123 Test address',
        subdistrict: 'Test',
        district: 'Test',
        province: 'Bangkok',
        postalCode: '10100',
      },
    },
    token,
  );
  assert.equal(order.total_satang, 24100);
  const adminOrder = await app
    .documents('api::order.order')
    .findOne({ documentId: order.document_id });
  assert.ok(adminOrder, 'Order must be visible through Strapi Document Service');
  assert.equal(adminOrder.paymentStatus, 'PENDING_PAYMENT');
  await assert.rejects(
    app
      .documents('api::variant.variant')
      .update({ documentId: variant.documentId, data: { stock: 0 } }),
  );
  await assert.rejects(
    app
      .documents('api::order.order')
      .update({ documentId: adminOrder.documentId, data: { paymentStatus: 'PAID' } }),
  );
  await app
    .documents('api::order.order')
    .update({ documentId: adminOrder.documentId, data: { fulfillmentStatus: 'PACKING' } });
  await consumePaidSession(
    app,
    { id: `evt_verify_${id}`, type: 'checkout.session.completed' },
    {
      id: `cs_verify_${id}`,
      payment_status: 'paid',
      payment_intent: `pi_verify_${id}`,
      metadata: { orderReference: order.reference },
      client_reference_id: order.reference,
      currency: 'thb',
      amount_total: 24100,
    },
  );
  const paid = await app.documents('api::order.order').findOne({ documentId: order.document_id });
  assert.equal(paid.paymentStatus, 'PAID');
  const stock = await app
    .documents('api::variant.variant')
    .findOne({ documentId: variant.documentId });
  assert.equal(stock.stock, 0);
  assert.equal(stock.reserved, 0);
  console.log(
    'Actual Strapi/PostgreSQL: publication guards, SKU reservation, order Admin visibility, protected payment fields and stock consumption passed.',
  );
} finally {
  if (order) {
    await app.db
      .connection(table(app, 'api::reservation.reservation'))
      .where('order_reference', order.reference)
      .delete();
    await app.db
      .connection(table(app, 'api::order.order'))
      .where('reference', order.reference)
      .delete();
  }
  await app.db
    .connection(table(app, 'api::stripe-event.stripe-event'))
    .where('event_id', `evt_verify_${id}`)
    .delete();
  if (variant)
    await app.db
      .connection(table(app, 'api::variant.variant'))
      .where('sku', sku)
      .update({ reserved: 0 });
  if (variant)
    await app.documents('api::variant.variant').delete({ documentId: variant.documentId });
  if (product)
    await app.documents('api::product.product').delete({ documentId: product.documentId });
  assert.equal(
    (await app.documents('api::product.product').findMany({ status: 'draft', limit: 1000 })).length,
    before,
  );
  await app.destroy();
}

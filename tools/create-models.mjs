// Kept as a reproducible schema generator; schemas are committed.
import { mkdir, writeFile } from 'node:fs/promises';
const str = (extra = {}) => ({ type: 'string', ...extra });
const integer = (extra = {}) => ({ type: 'integer', ...extra });
const bool = (value = false) => ({ type: 'boolean', default: value });
const models = {
  product: {
    draft: true,
    attrs: {
      name: str({ required: true }),
      slug: { type: 'uid', targetField: 'name', required: true },
      sku: str({ required: true }),
      description: { type: 'text' },
      priceSatang: integer({ min: 1 }),
      category: {
        type: 'enumeration',
        enum: ['short-sleeve', 'long-sleeve', 'other'],
        default: 'other',
      },
      material: str(),
      measurements: { type: 'json' },
      images: { type: 'media', multiple: true, allowedTypes: ['images'] },
      reviewState: {
        type: 'enumeration',
        enum: ['NEEDS_REVIEW', 'APPROVED'],
        default: 'NEEDS_REVIEW',
      },
      postedAt: { type: 'date' },
      sourceCaption: { type: 'text', private: true },
      sourceId: str({ unique: true, private: true }),
      sourceSold: { type: 'boolean', default: false },
      reviewNotes: { type: 'json', private: true },
      collection: { type: 'relation', relation: 'manyToOne', target: 'api::collection.collection' },
    },
  },
  variant: {
    attrs: {
      sku: str({ required: true, unique: true }),
      productSlug: str({ required: true, unique: true }),
      stock: integer({ default: 1, min: 0, max: 1, required: true }),
      reserved: integer({ default: 0, min: 0, max: 1, private: true }),
      active: bool(false),
    },
  },
  collection: {
    draft: true,
    attrs: {
      name: str({ required: true }),
      slug: { type: 'uid', targetField: 'name', required: true },
      description: { type: 'text' },
      image: { type: 'media', multiple: false, allowedTypes: ['images'] },
    },
  },
  order: {
    attrs: {
      reference: str({ required: true, unique: true }),
      accessTokenHash: str({ private: true }),
      idempotencyKey: str({ unique: true, private: true }),
      requestHash: str({ private: true }),
      paymentStatus: {
        type: 'enumeration',
        enum: ['PENDING_PAYMENT', 'PAID', 'EXPIRED', 'PAYMENT_REVIEW'],
        default: 'PENDING_PAYMENT',
      },
      fulfillmentStatus: {
        type: 'enumeration',
        enum: ['UNFULFILLED', 'PACKING', 'SHIPPED', 'CANCELLED'],
        default: 'UNFULFILLED',
      },
      customer: { type: 'json', private: true },
      items: { type: 'json' },
      subtotalSatang: integer(),
      shippingSatang: integer({ default: 3000 }),
      totalSatang: integer(),
      currency: str({ default: 'THB' }),
      expiresAt: { type: 'datetime' },
      stripeSessionId: str({ unique: true, private: true }),
      checkoutUrl: { type: 'text', private: true },
      stripePaymentIntentId: str({ private: true }),
      trackingNumber: str(),
      paidAt: { type: 'datetime' },
    },
  },
  reservation: {
    attrs: {
      orderReference: str({ required: true }),
      sku: str({ required: true }),
      state: { type: 'enumeration', enum: ['ACTIVE', 'CONSUMED', 'RELEASED'], default: 'ACTIVE' },
      expiresAt: { type: 'datetime' },
    },
  },
  'stripe-event': {
    attrs: {
      eventId: str({ required: true, unique: true }),
      eventType: str(),
      processedAt: { type: 'datetime' },
    },
  },
};
for (const [name, { draft = false, attrs }] of Object.entries(models)) {
  const folder = `apps/cms/src/api/${name}/content-types/${name}`;
  await mkdir(folder, { recursive: true });
  await writeFile(
    `${folder}/schema.json`,
    JSON.stringify(
      {
        kind: 'collectionType',
        collectionName:
          name === 'collection' ? 'shop_collections' : name.replaceAll('-', '_') + 's',
        info: {
          singularName: name,
          pluralName: name + 's',
          displayName: name[0].toUpperCase() + name.slice(1),
        },
        options: { draftAndPublish: draft },
        attributes: attrs,
      },
      null,
      2,
    ),
  );
}

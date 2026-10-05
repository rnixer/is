import type { Context } from 'koa';
import { z } from 'zod';
import { checkoutSchema } from '../../../commerce/validation';
import {
  createCheckout,
  consumePaidSession,
  stripeClient,
  hash,
  table,
  normalizeOrder,
} from '../../../commerce/store';
import type { Core } from '@strapi/strapi';
declare const strapi: Core.Strapi;
const rate = new Map<string, { count: number; reset: number }>();
export default {
  async catalog(ctx: Context) {
    const preview = process.env.NODE_ENV !== 'production' && ctx.query.preview === 'true';
    const products = await strapi
      .documents('api::product.product')
      .findMany({
        status: preview ? 'draft' : 'published',
        populate: ['images', 'collection'],
        sort: 'postedAt:desc',
        limit: 1000,
      });
    const collections = await strapi
      .documents('api::collection.collection')
      .findMany({ status: preview ? 'draft' : 'published', populate: ['image'], limit: 100 });
    const variants = await strapi.db.query('api::variant.variant').findMany({});
    ctx.body = {
      preview,
      collections: collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description || '',
        image: c.image?.url || null,
      })),
      products: products.map((p) => {
        const variant = variants.find((v) => v.sku === p.sku);
        return {
          id: p.documentId,
          slug: p.slug,
          sku: p.sku,
          name: p.name,
          description: p.description || '',
          priceSatang: p.priceSatang || null,
          collection: p.collection?.slug,
          category: p.category || 'other',
          material: p.material || null,
          measurements: p.measurements || {},
          images: (p.images || []).map(
            (img: {
              url: string;
              width?: number;
              height?: number;
              alternativeText?: string;
              formats?: Record<string, { url: string; width: number }>;
            }) => ({
              src: img.url,
              width: img.width || 1000,
              height: img.height || 1200,
              alt: img.alternativeText || p.name,
              srcSet: [
                ...Object.values(img.formats || {})
                  .filter((f) => f.width >= 400)
                  .map((f) => `${f.url} ${f.width}w`),
                `${img.url} ${img.width || 1000}w`,
              ].join(', '),
            }),
          ),
          available:
            !!variant?.active &&
            variant.stock - variant.reserved === 1 &&
            p.reviewState === 'APPROVED' &&
            !preview,
          published: !!p.publishedAt,
          reviewState: p.reviewState,
          postedAt: p.postedAt,
        };
      }),
    };
  },
  async checkout(ctx: Context) {
    const now = Date.now(),
      id = ctx.ip;
    if (rate.size > 1000) for (const [key, val] of rate) if (val.reset < now) rate.delete(key);
    const bucket = rate.get(id);
    if (bucket && bucket.reset > now && bucket.count >= 20) {
      ctx.status = 429;
      ctx.body = { error: 'กรุณารอสักครู่แล้วลองใหม่' };
      return;
    }
    rate.set(id, {
      count: bucket && bucket.reset > now ? bucket.count + 1 : 1,
      reset: bucket && bucket.reset > now ? bucket.reset : now + 60000,
    });
    const input = checkoutSchema.safeParse(ctx.request.body);
    const token = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .safeParse(ctx.get('x-order-token'));
    if (!input.success || !token.success) {
      ctx.status = 400;
      ctx.body = { error: 'ข้อมูลสั่งซื้อไม่ครบหรือไม่ถูกต้อง' };
      return;
    }
    try {
      ctx.body = await createCheckout(strapi, input.data, token.data);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      ctx.status =
        code === 'PAYMENTS_NOT_CONFIGURED'
          ? 503
          : code === 'ITEM_UNAVAILABLE'
            ? 409
            : code.startsWith('CHECKOUT_')
              ? 409
              : 502;
      ctx.body = {
        error:
          code === 'PAYMENTS_NOT_CONFIGURED'
            ? 'ยังไม่เปิดระบบชำระเงิน กรุณาติดต่อร้าน'
            : code === 'ITEM_UNAVAILABLE'
              ? 'สินค้าบางชิ้นถูกจองหรือขายแล้ว กรุณาตรวจตะกร้า'
              : code.startsWith('CHECKOUT_')
                ? 'รายการชำระเงินนี้สิ้นสุดหรือข้อมูลเปลี่ยนแล้ว กรุณาเริ่มใหม่'
                : 'ยังยืนยันการสร้างรายการชำระเงินไม่ได้ กรุณาลองรายการเดิมอีกครั้ง',
      };
    }
  },
  async status(ctx: Context) {
    const input = z
      .object({ reference: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .safeParse(ctx.request.body);
    if (!input.success) {
      ctx.status = 400;
      return;
    }
    const order = await strapi.db
      .connection(table(strapi, 'api::order.order'))
      .where({ reference: input.data.reference, access_token_hash: hash(input.data.token) })
      .first();
    if (!order) {
      ctx.status = 404;
      ctx.body = { error: 'ไม่พบคำสั่งซื้อ' };
      return;
    }
    ctx.body = {
      reference: order.reference,
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.fulfillment_status,
      totalSatang: order.total_satang,
      items: normalizeOrder(order).items,
      trackingNumber: order.tracking_number,
    };
  },
  async webhook(ctx: Context) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      ctx.status = 503;
      return;
    }
    const body = ctx.request.body as { [key: symbol]: string | Buffer };
    const raw = body?.[Symbol.for('unparsedBody')];
    const signature = ctx.get('stripe-signature');
    if (!raw || !signature) {
      ctx.status = 400;
      return;
    }
    let event;
    try {
      event = stripeClient().webhooks.constructEvent(raw, signature, secret);
    } catch {
      ctx.status = 400;
      ctx.body = { error: 'Invalid webhook signature' };
      return;
    }
    if (event.livemode !== (process.env.STRIPE_MODE === 'live')) {
      ctx.status = 400;
      return;
    }
    try {
      if (
        ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
          event.type,
        )
      ) {
        const session = await stripeClient().checkout.sessions.retrieve(
          (event.data.object as { id: string }).id,
        );
        await consumePaidSession(strapi, event, session);
      }
      ctx.body = { received: true };
    } catch {
      strapi.log.error('Stripe event processing failed; retry required');
      ctx.status = 500;
      ctx.body = { error: 'Retry required' };
    }
  },
};

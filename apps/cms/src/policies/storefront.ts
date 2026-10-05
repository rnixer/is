import { timingSafeEqual } from 'node:crypto';
export default (ctx: { request: { headers: Record<string, string | string[] | undefined> } }) => {
  const expected = process.env.STOREFRONT_TOKEN;
  const supplied = ctx.request.headers['x-storefront-token'];
  if (!expected || typeof supplied !== 'string') return false;
  const a = Buffer.from(expected),
    b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
};

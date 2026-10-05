import type { Catalog } from '@igh/contracts';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { randomBytes } from 'node:crypto';
import { mediaUrl } from './media.server';
const normalizeBaseUrl = (value?: string) =>
  (value || 'http://127.0.0.1:1337').trim().replace(/\/+$/, '');
const cms = () => normalizeBaseUrl(process.env.STRAPI_URL);
export async function cmsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = process.env.STOREFRONT_TOKEN;
  if (!token) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อร้านค้า');
  const response = await fetch(`${cms()}/api${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      'x-storefront-token': token,
      ...options.headers,
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const result = (await response
      .json()
      .catch(() => ({ error: 'ติดต่อร้านค้าไม่ได้ กรุณาลองใหม่' }))) as {
      error?: string | { message?: string };
    };
    throw new Error(
      typeof result.error === 'string' ? result.error : 'ติดต่อร้านค้าไม่ได้ กรุณาลองใหม่',
    );
  }
  return response.json() as Promise<T>;
}
export async function fetchCatalog(): Promise<Catalog> {
  const preview = process.env.NODE_ENV !== 'production' && process.env.PREVIEW_DRAFTS === 'true';
  const data = await cmsFetch<Catalog>(`/store/catalog${preview ? '?preview=true' : ''}`);
  return {
    ...data,
    siteUrl: process.env.SITE_URL,
    collections: data.collections?.map((c) => ({
      ...c,
      image: c.image ? mediaUrl(c.image) : c.image,
    })),
    products: data.products.map((p) => ({
      ...p,
      images: p.images.map((img) => ({
        ...img,
        src: mediaUrl(img.src),
        srcSet: img.srcSet
          ?.split(',')
          .map((entry) => {
            const [src, width] = entry.trim().split(' ');
            return `${mediaUrl(src)} ${width}`;
          })
          .join(', '),
      })),
    })),
  };
}
export function orderToken() {
  let token = getCookie('igh_order_access');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString('hex');
    setCookie('igh_order_access', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return token;
}
export function existingOrderToken() {
  return getCookie('igh_order_access');
}

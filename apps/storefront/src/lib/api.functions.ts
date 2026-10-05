import { createServerFn } from '@tanstack/react-start';
import { checkoutSchema } from '@igh/contracts';
import { z } from 'zod';
import { fetchCatalog, cmsFetch, orderToken, existingOrderToken } from './api.server';
export const getCatalog = createServerFn({ method: 'GET' }).handler(() => fetchCatalog());
export const getSiteConfig = createServerFn({ method: 'GET' }).handler(() => ({
  siteUrl: process.env.SITE_URL,
  preview: process.env.NODE_ENV !== 'production',
}));
export const checkout = createServerFn({ method: 'POST' })
  .validator(checkoutSchema)
  .handler(({ data }) =>
    cmsFetch<{ url: string; reference: string }>('/store/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'x-order-token': orderToken() },
    }),
  );
export type OrderStatus = {
  reference: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalSatang: number;
  items: { sku: string; name: string; quantity: 1; priceSatang: number }[];
  trackingNumber: string | null;
};
export const getOrder = createServerFn({ method: 'POST' })
  .validator(z.object({ reference: z.uuid() }).strict())
  .handler(({ data }) => {
    const token = existingOrderToken();
    if (!token) throw new Error('กรุณาเปิดคำสั่งซื้อในเบราว์เซอร์ที่ใช้ชำระเงิน');
    return cmsFetch<OrderStatus>('/store/order-status', {
      method: 'POST',
      body: JSON.stringify({ ...data, token }),
    });
  });

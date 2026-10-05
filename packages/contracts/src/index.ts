import { z } from 'zod';

export const SHIPPING_SATANG = 3000;
export const itemSchema = z
  .object({ sku: z.string().min(1).max(100), quantity: z.literal(1) })
  .strict();
export const checkoutSchema = z
  .object({
    items: z.array(itemSchema).min(1).max(20),
    idempotencyKey: z.uuid(),
    customer: z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.email().max(254),
        phone: z.string().regex(/^0[0-9]{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ไทย'),
        address: z.string().trim().min(5).max(300),
        subdistrict: z.string().trim().min(1).max(100),
        district: z.string().trim().min(1).max(100),
        province: z.string().trim().min(1).max(100),
        postalCode: z.string().regex(/^[1-9][0-9]{4}$/),
      })
      .strict(),
  })
  .strict()
  .refine(
    (x) => new Set(x.items.map((i) => i.sku)).size === x.items.length,
    'สินค้าในรายการซ้ำกัน',
  );
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  priceSatang: number | null;
  category: string;
  material: string | null;
  measurements: Record<string, string>;
  images: { src: string; width: number; height: number; alt: string; srcSet?: string }[];
  available: boolean;
  published: boolean;
  reviewState: string;
  postedAt: string;
  collection?: string;
};
export type Catalog = {
  products: Product[];
  preview: boolean;
  siteUrl?: string;
  collections?: { slug: string; name: string; description: string; image: string | null }[];
};
export const money = (satang: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: satang % 100 ? 2 : 0,
  }).format(satang / 100);

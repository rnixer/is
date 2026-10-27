import { z } from 'zod';
// CMS compilation stays within its own root. Match the shared contract and test
// both schemas in tests; browser prices and payment state are never inputs.
export const checkoutSchema = z
  .object({
    items: z
      .array(z.object({ sku: z.string().min(1).max(100), quantity: z.literal(1) }).strict())
      .min(1)
      .max(20),
    idempotencyKey: z.uuid(),
    customer: z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.email().max(254),
        phone: z
          .string()
          .trim()
          .max(40)
          .transform((value) => value.replace(/[\s()-]/g, '').replace(/^(?:\+66|0066)/, '0'))
          .pipe(
            z
              .string()
              .regex(
                /^0[0-9]{8,9}$/,
                'กรุณากรอกเบอร์โทรศัพท์ไทย เช่น 087-123-4567 หรือ +66871234567',
              ),
          ),
        address: z.string().trim().min(5).max(300),
        subdistrict: z.string().trim().min(1).max(100),
        district: z.string().trim().min(1).max(100),
        province: z.string().trim().min(1).max(100),
        postalCode: z.string().regex(/^[1-9][0-9]{4}$/),
      })
      .strict(),
  })
  .strict()
  .refine((x) => new Set(x.items.map((i) => i.sku)).size === x.items.length, 'Duplicate SKU');
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export const SHIPPING_SATANG = 3000;

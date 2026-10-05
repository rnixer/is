import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { useState, useRef, type FormEvent } from 'react';
import { z } from 'zod';
import { money, SHIPPING_SATANG, checkoutSchema, type CheckoutInput } from '@igh/contracts';
import { useCart } from '../lib/cart';
import { catalogQuery } from '../lib/queries';
import { checkout } from '../lib/api.functions';
import { ProductImage, Icon } from '../components/ui';
export const Route = createFileRoute('/checkout')({
  validateSearch: z.object({ cancelled: z.coerce.boolean().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery()),
  head: () => ({ meta: [{ title: 'Checkout — igh.ess' }, { name: 'robots', content: 'noindex' }] }),
  component: Checkout,
});
const fields: [keyof CheckoutInput['customer'], string, string][] = [
  ['name', 'ชื่อ–นามสกุลผู้รับ', 'name'],
  ['email', 'อีเมล สำหรับข้อมูลชำระเงิน', 'email'],
  ['phone', 'เบอร์โทรศัพท์', 'tel'],
  ['address', 'บ้านเลขที่ ถนน หมู่บ้าน / อาคาร', 'street-address'],
  ['subdistrict', 'แขวง / ตำบล', 'address-level3'],
  ['district', 'เขต / อำเภอ', 'address-level2'],
  ['province', 'จังหวัด', 'address-level1'],
  ['postalCode', 'รหัสไปรษณีย์', 'postal-code'],
];
function Checkout() {
  const cart = useCart(),
    { data } = useSuspenseQuery(catalogQuery()),
    search = Route.useSearch();
  const [error, setError] = useState('');
  const key = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: CheckoutInput) => checkout({ data: input }),
    onSuccess: (result) => {
      window.location.assign(result.url);
    },
    onError: (e: Error) => setError(e.message),
  });
  const items = cart.skus.map((s) => data.products.find((p) => p.sku === s));
  const unavailable = items.some((p) => !p || !p.available),
    subtotal = items.reduce((sum, p) => sum + (p?.priceSatang || 0), 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (mutation.isPending) return;
    const form = new FormData(event.currentTarget),
      customer = Object.fromEntries(
        fields.map(([name]) => [name, String(form.get(name) || '').trim()]),
      );
    if (!key.current) key.current = crypto.randomUUID();
    const input = checkoutSchema.safeParse({
      items: cart.skus.map((sku) => ({ sku, quantity: 1 })),
      idempotencyKey: key.current,
      customer,
    });
    if (!input.success) {
      setError(
        input.error.issues
          .map(
            (x) => `${fields.find(([name]) => name === x.path[1])?.[1] || 'ข้อมูล'}: ${x.message}`,
          )
          .join(' · '),
      );
      return;
    }
    mutation.mutate(input.data);
  }
  return (
    <main className="section checkout-section">
      <div className="page-heading">
        <span className="eyebrow">THE NEXT CHAPTER</span>
        <h1>Make it yours.</h1>
      </div>
      {search.cancelled && (
        <p className="notice">
          คุณกลับจากหน้าชำระเงิน รายการเดิมอาจยังจองอยู่จนกว่าจะหมดเวลา
          กรุณาติดต่อร้านหากต้องการความช่วยเหลือ
        </p>
      )}
      {!cart.ready ? (
        <p>กำลังโหลดตะกร้า…</p>
      ) : !items.length ? (
        <p>
          ตะกร้ายังว่าง <Link to="/shop">เลือกดูสินค้า →</Link>
        </p>
      ) : (
        <div className="checkout-layout">
          <form onSubmit={submit}>
            <h2>ข้อมูลจัดส่ง</h2>
            <p className="muted">ไม่ต้องสมัครสมาชิก · จัดส่งเฉพาะประเทศไทย</p>
            <div className="form-grid">
              {fields.map(([name, label, auto]) => (
                <label key={name} className={name === 'address' ? 'full' : ''}>
                  {label}
                  <input
                    name={name}
                    autoComplete={auto}
                    type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}
                    inputMode={name === 'postalCode' ? 'numeric' : undefined}
                    required
                    maxLength={name === 'address' ? 300 : name === 'postalCode' ? 5 : 254}
                  />
                </label>
              ))}
            </div>
            <h2 className="payment-heading">ชำระเงิน</h2>
            <div className="payment-methods">
              <span>PROMPTPAY / QR</span>
              <span>CREDIT / DEBIT CARD</span>
            </div>
            <p className="small">
              เลือกวิธีชำระเงินในหน้าปลอดภัยของ Stripe ร้านจะยืนยันการชำระเงินอัตโนมัติ
            </p>
            <p className="small">
              สินค้าซื้อแล้วไม่รับเปลี่ยน/คืนตามนโยบายร้าน{' '}
              <Link to="/shipping" className="underline">
                อ่านนโยบาย
              </Link>
            </p>
            {unavailable && (
              <p className="error">
                มีสินค้าที่ไม่พร้อมจำหน่าย <Link to="/bag">กลับไปแก้ตะกร้า</Link>
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="button dark"
              type="submit"
              disabled={mutation.isPending || unavailable}
            >
              {mutation.isPending
                ? 'กำลังเตรียมรายการชำระเงิน…'
                : `ไปชำระเงิน ${money(subtotal + SHIPPING_SATANG)}`}
              <Icon name="arrow" />
            </button>
          </form>
          <aside className="order-summary">
            <span className="eyebrow">YOUR PIECES</span>
            {items
              .filter((p) => !!p)
              .map((p) => (
                <div key={p.sku} className="checkout-item">
                  <ProductImage product={p} />
                  <div>
                    <span>{p.name}</span>
                    <p>{money(p.priceSatang || 0)}</p>
                  </div>
                </div>
              ))}
            <dl>
              <div>
                <dt>สินค้า</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div>
                <dt>จัดส่ง</dt>
                <dd>{money(SHIPPING_SATANG)}</dd>
              </div>
              <div className="total">
                <dt>รวม</dt>
                <dd>{money(subtotal + SHIPPING_SATANG)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </main>
  );
}

import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { money, SHIPPING_SATANG } from '@igh/contracts';
import { useCart } from '../lib/cart';
import { catalogQuery } from '../lib/queries';
import { ProductImage, Icon, EmptyState } from '../components/ui';
export const Route = createFileRoute('/bag')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery()),
  head: () => ({ meta: [{ title: 'Your bag — igh.ess' }, { name: 'robots', content: 'noindex' }] }),
  component: Bag,
});
function Bag() {
  const cart = useCart(),
    { data } = useSuspenseQuery(catalogQuery());
  const items = cart.skus.map((sku) => data.products.find((p) => p.sku === sku));
  const subtotal = items.reduce((s, p) => s + (p?.priceSatang || 0), 0);
  const unavailable = items.some((p) => !p || (!p.available && !data.preview));
  return (
    <main className="section">
      <div className="page-heading">
        <span className="eyebrow">YOUR UNIQUE FINDS</span>
        <h1>
          Your bag <span className="count">({cart.skus.length})</span>
        </h1>
      </div>
      {!cart.ready ? (
        <p role="status">กำลังโหลดตะกร้า…</p>
      ) : !items.length ? (
        <EmptyState message="ตะกร้ายังว่าง เลือกชิ้นที่เป็นคุณได้เลย" />
      ) : (
        <div className="bag-layout">
          <div>
            {items.map((p, i) =>
              p ? (
                <article className="bag-item" key={p.sku}>
                  <Link to="/products/$slug" params={{ slug: p.slug }} className="bag-image">
                    <ProductImage product={p} />
                  </Link>
                  <div className="bag-info">
                    <Link to="/products/$slug" params={{ slug: p.slug }}>
                      {p.name}
                    </Link>
                    <p>{money(p.priceSatang || 0)}</p>
                    <small>จำนวน 1 · แต่ละชิ้นมีเพียงตัวเดียว</small>
                    {!p.available && <p className="error">สินค้าชิ้นนี้ไม่พร้อมจำหน่าย</p>}
                    <button className="remove" onClick={() => cart.remove(p.sku)}>
                      นำออก
                    </button>
                  </div>
                </article>
              ) : (
                <article key={cart.skus[i]} className="bag-item">
                  <p>สินค้าชิ้นนี้ถูกนำออกจากร้านแล้ว</p>
                  <button onClick={() => cart.remove(cart.skus[i])}>นำออกจากตะกร้า</button>
                </article>
              ),
            )}
          </div>
          <aside className="order-summary">
            <span className="eyebrow">ORDER SUMMARY</span>
            <dl>
              <div>
                <dt>สินค้า</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div>
                <dt>จัดส่งทั่วประเทศไทย</dt>
                <dd>{money(SHIPPING_SATANG)}</dd>
              </div>
              <div className="total">
                <dt>รวม</dt>
                <dd>{money(subtotal + SHIPPING_SATANG)}</dd>
              </div>
            </dl>
            {unavailable ? (
              <p className="error">กรุณานำสินค้าที่ไม่พร้อมจำหน่ายออกก่อน</p>
            ) : (
              <Link to="/checkout" className="button dark">
                CHECKOUT <Icon name="arrow" />
              </Link>
            )}
            <p className="small">สต็อกและราคาจะตรวจสอบอีกครั้งก่อนชำระเงิน</p>
            <Link to="/shop" className="text-link">
              CONTINUE EXPLORING
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}

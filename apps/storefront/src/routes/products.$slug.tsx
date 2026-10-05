import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useState } from 'react';
import { productHead } from '../lib/seo';
import { money } from '@igh/contracts';
import { catalogQuery } from '../lib/queries';
import { useCart } from '../lib/cart';
import { ProductImage, PreviewNotice, ProductCard, Icon } from '../components/ui';
const labels: Record<string, string> = {
  chest: 'รอบอก',
  shoulder: 'ไหล่',
  length: 'ความยาว',
  sleeve: 'แขน',
};
export const Route = createFileRoute('/products/$slug')({
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQuery());
    const product = catalog.products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product, catalog };
  },
  head: ({ loaderData }) => productHead(loaderData),
  component: Detail,
});
function Detail() {
  const { product: p, catalog } = Route.useLoaderData(),
    cart = useCart();
  const [added, setAdded] = useState(false);
  const inBag = cart.skus.includes(p.sku);
  return (
    <main>
      <PreviewNotice preview={catalog.preview} />
      <div className="breadcrumb">
        <Link to="/shop">SHOP</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <section className="product-detail">
        <div className="gallery">
          {p.images.map((_, i) => (
            <div key={i}>
              <ProductImage product={p} index={i} eager={i === 0} />
            </div>
          ))}
        </div>
        <div className="detail-info">
          <span className="eyebrow">REWORKED · ONE OF A KIND</span>
          <h1>{p.name}</h1>
          <p className="detail-price">{p.priceSatang ? money(p.priceSatang) : 'รอตรวจสอบราคา'}</p>
          <p className="detail-intro">
            เสื้อมือสองรีเมคเป็นทรงครอป
            <br />
            แต่ละชิ้นมีเพียงตัวเดียว
          </p>
          <div className="measurements">
            <span className="eyebrow">GARMENT MEASUREMENTS</span>
            <dl>
              {Object.entries(p.measurements).map(([key, value]) => (
                <div key={key}>
                  <dt>{labels[key] || key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <small>ขนาดจริงตามข้อมูลร้าน กรุณาเทียบกับเสื้อที่ใส่ประจำ</small>
          </div>
          <p className="availability">
            {catalog.preview
              ? 'กำลังรอเจ้าของร้านตรวจสอบ'
              : p.available
                ? 'มี 1 ตัว พร้อมให้คุณเลือก'
                : 'สินค้าชิ้นนี้ไม่พร้อมจำหน่าย'}
          </p>
          <button
            className="button dark add-bag"
            disabled={(!p.available && !catalog.preview) || inBag}
            onClick={() => {
              cart.add(p.sku);
              setAdded(true);
            }}
          >
            {inBag
              ? 'ADDED TO BAG'
              : catalog.preview
                ? 'ADD TO BAG · PREVIEW'
                : !p.available
                  ? 'UNAVAILABLE'
                  : 'ADD TO BAG'}
            <Icon name="bag" />
          </button>
          {added && (
            <p role="status">
              เพิ่มลงตะกร้าแล้ว{' '}
              <Link to="/bag" className="underline">
                ดูตะกร้า →
              </Link>
            </p>
          )}
          <p className="shipping-note">จัดส่งทั่วประเทศไทย 30 บาทต่อออเดอร์</p>
          <div className="accordions">
            <details open>
              <summary>DETAILS</summary>
              <p className="pre-line">{p.description}</p>
              {p.material && <p>เนื้อผ้า: {p.material}</p>}
            </details>
            <details>
              <summary>SHIPPING & RETURNS</summary>
              <p>จัดส่งเฉพาะประเทศไทย ค่าส่งเหมาจ่าย 30 บาทต่อออเดอร์</p>
              <p>
                สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืนตามนโยบายร้าน
                หากมีปัญหากับคำสั่งซื้อกรุณาติดต่อร้าน
              </p>
              <Link to="/shipping">อ่านรายละเอียด →</Link>
            </details>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>A different perspective.</h2>
          <Link to="/shop" className="text-link">
            MORE PIECES <Icon name="arrow" />
          </Link>
        </div>
        <div className="product-grid">
          {catalog.products
            .filter((x) => x.sku !== p.sku)
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} product={x} preview={catalog.preview} />
            ))}
        </div>
      </section>
    </main>
  );
}

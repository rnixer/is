import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { catalogQuery } from '../lib/queries';
import { ProductCard, PreviewNotice, EmptyState } from '../components/ui';
export const Route = createFileRoute('/shop')({
  validateSearch: z.object({
    q: z.string().catch('').default(''),
    collection: z.string().optional(),
    category: z.string().catch('all').default('all'),
    sort: z.string().catch('newest').default('newest'),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery()),
  head: () => ({ meta: [{ title: 'Shop — igh.ess' }] }),
  component: Shop,
});
function Shop() {
  const { data } = useSuspenseQuery(catalogQuery());
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  const products = data.products
    .filter(
      (p) =>
        (search.category === 'all' || p.category === search.category) &&
        (!search.collection || p.collection === search.collection) &&
        `${p.name} ${p.material || ''} ${Object.values(p.measurements).join(' ')}`
          .toLowerCase()
          .includes(search.q.toLowerCase()),
    )
    .sort((a, b) =>
      search.sort === 'price-low'
        ? (a.priceSatang ?? Infinity) - (b.priceSatang ?? Infinity)
        : b.postedAt.localeCompare(a.postedAt),
    );
  const update = (patch: Partial<typeof search>) =>
    navigate({ search: { ...search, ...patch }, replace: true });
  return (
    <main>
      <PreviewNotice preview={data.preview} />
      <section className="section shop-section">
        <div className="page-heading">
          <span className="eyebrow">THE REWORKED WARDROBE</span>
          <h1>
            All pieces<span className="count">({products.length})</span>
          </h1>
          <p>แต่ละชิ้นมีเพียงตัวเดียว เลือกชิ้นที่เป็นคุณ</p>
        </div>
        <div className="shop-toolbar">
          <div className="tabs">
            {[
              ['all', 'ALL'],
              ['short-sleeve', 'SHORT SLEEVES'],
              ['long-sleeve', 'LONG SLEEVES'],
              ['other', 'THE DETAILS'],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={search.category === key}
                className={search.category === key ? 'selected' : ''}
                onClick={() => update({ category: key })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="shop-controls">
            <label>
              <span className="sr-only">ค้นหาสินค้า</span>
              <input
                placeholder="ค้นหาชิ้นที่ชอบ…"
                type="search"
                value={search.q}
                onChange={(e) => update({ q: e.target.value })}
              />
            </label>
            <label>
              <span className="sr-only">เรียงสินค้า</span>
              <select value={search.sort} onChange={(e) => update({ sort: e.target.value })}>
                <option value="newest">ใหม่ล่าสุด</option>
                <option value="price-low">ราคา: น้อยไปมาก</option>
              </select>
            </label>
          </div>
        </div>
        {products.length ? (
          <div className="product-grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} preview={data.preview} eager={i < 4} />
            ))}
          </div>
        ) : (
          <EmptyState message="ไม่พบสินค้าที่ตรงกับการค้นหา" />
        )}
      </section>
    </main>
  );
}

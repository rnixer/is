import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { catalogQuery } from '../lib/queries';
import { ProductCard, ProductImage, PreviewNotice, Icon, EmptyState } from '../components/ui';
export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery()),
  component: Home,
});
function Home() {
  const { data } = useSuspenseQuery(catalogQuery());
  const hero = data.products[0],
    second = data.products[1];
  return (
    <main>
      <PreviewNotice preview={data.preview} />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">REWORKED / RECONSIDERED</div>
          <h1>
            A second life.
            <br />
            <em>A singular you.</em>
          </h1>
          <p>
            ชิ้นเดิม มุมมองใหม่
            <br />
            เสื้อมือสองรีเมค ที่มีเพียงตัวเดียวในแบบของคุณ
          </p>
          <Link to="/shop" className="button dark">
            EXPLORE THE PIECES <Icon name="arrow" />
          </Link>
          <div className="hero-foot">
            <span>01 / THE REWORKED EDIT</span>
            <span>IGH.ESS — THAILAND</span>
          </div>
        </div>
        <div className="hero-image">
          {hero && <ProductImage product={hero} eager />}
          <span className="image-tag">A NEW PERSPECTIVE ON EVERYDAY WEAR</span>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE LATEST EDIT</span>
            <h2>Fresh perspectives.</h2>
          </div>
          <Link to="/shop" className="text-link">
            SHOP ALL <Icon name="arrow" />
          </Link>
        </div>
        {data.products.length ? (
          <div className="product-grid">
            {data.products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} preview={data.preview} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <section className="editorial">
        <div className="editorial-image">{second && <ProductImage product={second} />}</div>
        <div className="editorial-copy">
          <span className="eyebrow">NOT NEW. SOMETHING MORE.</span>
          <h2>
            Less ordinary.
            <br />
            <em>More you.</em>
          </h2>
          <p>
            เราเลือกเสื้อมือสอง นำมารีเมคเป็นทรงครอป
            <br />
            ซัก อบ รีด และฆ่าเชื้อให้พร้อมใส่
            <br />
            เพื่อให้เสื้อแต่ละตัวได้เริ่มเรื่องราวใหม่
          </p>
          <Link to="/about" className="text-link">
            OUR STORY <Icon name="arrow" />
          </Link>
        </div>
      </section>
      <section className="section categories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR FIT</span>
            <h2>Different sleeves. Same spirit.</h2>
          </div>
        </div>
        <div className="category-grid">
          {[
            { key: 'short-sleeve', label: 'Short sleeves', no: '01' },
            { key: 'long-sleeve', label: 'Long sleeves', no: '02' },
          ].map((c) => (
            <Link
              key={c.key}
              to="/shop"
              search={{ category: c.key, q: '', sort: 'newest' }}
              className="category-tile"
            >
              <div className="category-img">
                {data.products.find((p) => p.category === c.key) && (
                  <ProductImage product={data.products.find((p) => p.category === c.key)!} />
                )}
              </div>
              <span>
                {c.no} / {c.label}
                <Icon name="arrow" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="brand-statement">
        <span className="eyebrow">ONE PIECE. ONE PERSON. A NEW CHAPTER.</span>
        <h2>Yours, and yours only.</h2>
        <a
          href="https://www.instagram.com/igh.ess/"
          className="text-link"
          target="_blank"
          rel="noreferrer"
        >
          FOLLOW @IGH.ESS ↗
        </a>
      </section>
    </main>
  );
}

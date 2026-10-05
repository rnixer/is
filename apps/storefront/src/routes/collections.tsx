import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { catalogQuery } from '../lib/queries';
import { ProductImage } from '../components/ui';
export const Route = createFileRoute('/collections')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery()),
  head: () => ({ meta: [{ title: 'Collections — igh.ess' }] }),
  component: Collections,
});
function Collections() {
  const { data } = useSuspenseQuery(catalogQuery());
  return (
    <main className="section">
      <div className="page-heading">
        <span className="eyebrow">THE EDITS</span>
        <h1>Find your perspective.</h1>
      </div>
      <div className="category-grid">
        {data.collections?.map((c) => (
          <Link key={c.slug} to="/shop" search={{ collection: c.slug }} className="category-tile">
            <div className="category-img">
              {c.image && <img src={c.image} alt={c.name} loading="lazy" />}
            </div>
            <span>{c.name} →</span>
          </Link>
        ))}
        {[
          ['short-sleeve', 'Short sleeves'],
          ['long-sleeve', 'Long sleeves'],
          ['other', 'The details'],
        ]
          .filter(([category]) => data.products.some((x) => x.category === category))
          .map(([category, name]) => {
            const p = data.products.find((x) => x.category === category);
            return (
              <Link
                key={category}
                to="/shop"
                search={{ category, q: '', sort: 'newest' }}
                className="category-tile"
              >
                <div className="category-img">{p && <ProductImage product={p} />}</div>
                <span>{name} →</span>
              </Link>
            );
          })}
      </div>
    </main>
  );
}

import type { Product, Catalog } from '@igh/contracts';
export function productHead(data?: { product: Product; catalog: Catalog }) {
  const p = data?.product;
  const structured =
    p && data && !data.catalog.preview && p.published && p.priceSatang && data.catalog.siteUrl
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: p.description,
          image: p.images.map((i) => i.src),
          sku: p.sku,
          brand: { '@type': 'Brand', name: 'igh.ess' },
          offers: {
            '@type': 'Offer',
            url: `${data.catalog.siteUrl}/products/${p.slug}`,
            priceCurrency: 'THB',
            price: p.priceSatang / 100,
            itemCondition: 'https://schema.org/UsedCondition',
            availability: p.available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }
      : null;
  return {
    meta: [
      { title: p ? `${p.name} — igh.ess` : 'igh.ess' },
      { name: 'description', content: p?.description.slice(0, 155) },
      { property: 'og:title', content: p?.name },
      { property: 'og:type', content: 'product' },
      { property: 'og:image', content: p?.images[0]?.src },
      ...(data?.catalog.preview ? [{ name: 'robots', content: 'noindex,nofollow' }] : []),
    ],
    scripts: structured
      ? [
          {
            type: 'application/ld+json',
            children: JSON.stringify(structured).replaceAll('<', '\\u003c'),
          },
        ]
      : [],
  };
}

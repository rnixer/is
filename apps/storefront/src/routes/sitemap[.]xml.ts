import { createFileRoute } from '@tanstack/react-router';
import { fetchCatalog } from '../lib/api.server';
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const origin = process.env.SITE_URL || 'http://localhost:3000';
        const catalog = await fetchCatalog();
        const urls = catalog.preview
          ? []
          : [
              '/',
              '/shop',
              '/collections',
              '/about',
              '/shipping',
              ...catalog.products
                .filter((p) => p.published)
                .map((p) => '/products/' + encodeURIComponent(p.slug)),
            ];
        const esc = (s: string) =>
          s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(origin + u)}</loc></url>`).join('')}</urlset>`,
          { headers: { 'content-type': 'application/xml' } },
        );
      },
    },
  },
});

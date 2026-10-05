import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          process.env.NODE_ENV !== 'production'
            ? 'User-agent: *\nDisallow: /'
            : 'User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /bag\nDisallow: /order/\nSitemap: ' +
              (process.env.SITE_URL || 'http://localhost:3000') +
              '/sitemap.xml',
          { headers: { 'content-type': 'text/plain' } },
        ),
    },
  },
});

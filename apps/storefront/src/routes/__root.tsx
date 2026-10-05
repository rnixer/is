import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Outlet,
  Link,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CartProvider } from '../lib/cart';
import { Header, Footer } from '../components/ui';
import css from '../styles.css?url';
import { getSiteConfig } from '../lib/api.functions';
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getSiteConfig(),
  head: ({ loaderData, matches }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'igh.ess — Reworked, one of a kind' },
      {
        name: 'description',
        content:
          'เสื้อมือสองรีเมค ทรงครอป แต่ละชิ้นมีเพียงตัวเดียว จาก igh.ess จัดส่งทั่วประเทศไทย 30 บาทต่อออเดอร์',
      },
      { property: 'og:site_name', content: 'igh.ess' },
      ...(loaderData?.preview ? [{ name: 'robots', content: 'noindex,nofollow' }] : []),
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/favicon.png', type: 'image/png' },
      ...(loaderData?.siteUrl
        ? [
            {
              rel: 'canonical',
              href: loaderData.siteUrl.replace(/\/$/, '') + (matches.at(-1)?.pathname || '/'),
            },
          ]
        : []),
    ],
  }),
  component: Outlet,
  shellComponent: Root,
  notFoundComponent: () => (
    <main className="empty">
      <h1>ไม่พบหน้านี้</h1>
      <Link to="/shop">เลือกดูสินค้า</Link>
    </main>
  ),
  errorComponent: ({ error, reset }) => (
    <main className="empty">
      <h1>ยังโหลดข้อมูลร้านค้าไม่ได้</h1>
      <p>{error instanceof Error ? error.message : 'กรุณาลองใหม่'}</p>
      <button className="button dark" onClick={reset}>
        ลองใหม่
      </button>
    </main>
  ),
});
function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main">
          ข้ามไปเนื้อหา
        </a>
        <CartProvider>
          <Header />
          <div id="main">{children}</div>
          <Footer />
        </CartProvider>
        <Scripts />
      </body>
    </html>
  );
}

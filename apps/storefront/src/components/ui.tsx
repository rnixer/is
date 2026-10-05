import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import type { Product } from '@igh/contracts';
import { money } from '@igh/contracts';
import { useCart } from '../lib/cart';
export function Icon({ name }: { name: 'bag' | 'search' | 'arrow' | 'close' | 'menu' }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      {name === 'bag' ? (
        <>
          <path d="M5 7h14l1 14H4L5 7Z" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" />
        </>
      ) : name === 'search' ? (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      ) : name === 'arrow' ? (
        <path d="M3 12h17m-6-6 6 6-6 6" />
      ) : name === 'close' ? (
        <path d="m6 6 12 12M6 18 18 6" />
      ) : (
        <path d="M3 7h18M3 12h18M3 17h18" />
      )}
    </svg>
  );
}
export function Header() {
  const { skus } = useCart();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="announcement">
        ONE OF A KIND. MADE TO BE YOURS. <span>จัดส่งทั่วไทย 30 บาท / ออเดอร์</span>
      </div>
      <header className="header">
        <button
          className="icon-button mobile-menu"
          aria-label="เปิดเมนู"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
        <nav className={open ? 'nav open' : 'nav'} aria-label="เมนูหลัก">
          {[
            ['/shop', 'SHOP'],
            ['/collections', 'COLLECTIONS'],
            ['/about', 'OUR STORY'],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className={path === to ? 'active' : ''}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link to="/" className="brand" aria-label="igh.ess หน้าแรก">
          <img src="/images/brand/logo.webp" width="38" height="38" alt="" />
          <span>igh.ess</span>
        </Link>
        <div className="header-actions">
          <Link
            to="/shop"
            search={{ q: '', category: 'all', sort: 'newest' }}
            aria-label="ค้นหาสินค้า"
            className="icon-button"
          >
            <Icon name="search" />
          </Link>
          <Link to="/bag" className="bag-link" aria-label={`ตะกร้าสินค้า ${skus.length} ชิ้น`}>
            <Icon name="bag" />
            <span>BAG ({skus.length})</span>
          </Link>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div>
        <Link to="/" className="footer-brand">
          igh.ess
        </Link>
        <p>Reworked pieces. A new perspective.</p>
      </div>
      <div>
        <span className="eyebrow">EXPLORE</span>
        <Link to="/shop">Shop all pieces</Link>
        <Link to="/about">Our story</Link>
        <Link to="/shipping">Shipping & returns</Link>
      </div>
      <div>
        <span className="eyebrow">SAY HELLO</span>
        <a href="https://www.instagram.com/igh.ess/" target="_blank" rel="noreferrer">
          Instagram ↗
        </a>
        <a href="https://line.me/R/ti/p/@788yqddr" target="_blank" rel="noreferrer">
          LINE @788yqddr ↗
        </a>
      </div>
      <div className="footer-bottom">
        <span>© 2026 igh.ess</span>
        <span>THAILAND · THB ฿</span>
      </div>
    </footer>
  );
}
export function ProductImage({
  product,
  index = 0,
  eager = false,
}: {
  product: Product;
  index?: number;
  eager?: boolean;
}) {
  const img = product.images[index];
  return img ? (
    <img
      src={img.src}
      srcSet={img.srcSet}
      sizes={eager ? '(max-width:640px) 100vw, 65vw' : '(max-width:640px) 50vw, 25vw'}
      alt={img.alt}
      width={img.width}
      height={img.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  ) : (
    <div className="image-empty">igh.ess</div>
  );
}
export function ProductCard({
  product,
  eager = false,
  preview = false,
}: {
  product: Product;
  eager?: boolean;
  preview?: boolean;
}) {
  return (
    <article className="product-card">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="product-image">
        <ProductImage product={product} eager={eager} />
        <span className="card-arrow">
          <Icon name="arrow" />
        </span>
      </Link>
      <div className="product-caption">
        <Link to="/products/$slug" params={{ slug: product.slug }}>
          {product.name}
        </Link>
        <span>{product.priceSatang ? money(product.priceSatang) : 'รอตรวจราคา'}</span>
      </div>
      <p className="product-note">
        {preview
          ? 'รอเจ้าของร้านตรวจสอบ'
          : product.available
            ? 'ONE UNIQUE PIECE'
            : 'ไม่พร้อมจำหน่าย'}
      </p>
    </article>
  );
}
export function PreviewNotice({ preview }: { preview: boolean }) {
  return preview ? (
    <div className="preview-notice" role="status">
      กำลังดูสินค้าฉบับร่าง · ราคาและสถานะสินค้ารอเจ้าของร้านตรวจสอบ · ยังไม่เปิดขาย
    </div>
  ) : null;
}
export function EmptyState({ message = 'ยังไม่มีสินค้าที่เปิดขาย' }: { message?: string }) {
  return (
    <div className="empty">
      <p>{message}</p>
      <Link to="/" className="text-link">
        กลับหน้าแรก <Icon name="arrow" />
      </Link>
    </div>
  );
}

import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const source = path.resolve(root, '../instagram-igh.ess-2026-10-05-LIWwNEpM');
const manifest = JSON.parse(await readFile('data/catalog.json', 'utf8'));
const target = path.resolve(root, 'apps/storefront/public/images/products');
await mkdir(target, { recursive: true });
for (const product of manifest.products) {
  product.images = [];
  for (const [index, relative] of product.sourceMedia.entries()) {
    const input = path.resolve(source, relative);
    if (!input.startsWith(source + path.sep)) throw new Error('Media path escapes export');
    const basename = `${product.id}-${index}`;
    const metadata = await sharp(input)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(target, `${basename}.webp`));
    await sharp(input)
      .rotate()
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(target, `${basename}-600.webp`));
    product.images.push({
      src: `/images/products/${basename}.webp`,
      width: metadata.width,
      height: metadata.height,
      alt: `${product.name} — ภาพ ${index + 1}`,
    });
  }
}
await mkdir('apps/storefront/public/images/brand', { recursive: true });
await sharp('assets/brand/instagram-profile.jpg')
  .resize(160, 160)
  .webp()
  .toFile('apps/storefront/public/images/brand/logo.webp');
await sharp('assets/brand/instagram-profile.jpg')
  .resize(48, 48)
  .png()
  .toFile('apps/storefront/public/favicon.png');
await writeFile('data/catalog.json', JSON.stringify(manifest, null, 2));
console.log(
  `Prepared optimized images for ${manifest.products.length} draft products. Metadata stripped.`,
);

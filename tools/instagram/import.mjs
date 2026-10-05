import { createRequire } from 'node:module';
const { compileStrapi, createStrapi } = createRequire(import.meta.url)('@strapi/strapi');
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const manifest = JSON.parse(await readFile('data/catalog.json', 'utf8'));
process.chdir(path.join(root, 'apps/cms'));
const appContext = await compileStrapi();
const app = await createStrapi(appContext).load();
let imported = 0,
  skipped = 0;
const refresh = process.argv.includes('--refresh-unreviewed');
try {
  for (const product of manifest.products) {
    const found = await app
      .documents('api::product.product')
      .findMany({ status: 'draft', filters: { sourceId: product.id }, limit: 1 });
    if (found.length) {
      if (refresh && found[0].reviewState === 'NEEDS_REVIEW') {
        await app
          .documents('api::product.product')
          .update({
            documentId: found[0].documentId,
            data: {
              name: product.name,
              priceSatang: product.priceSatang,
              category: product.category,
              sourceSold: product.sourceSold,
            },
          });
        const variants = await app
          .documents('api::variant.variant')
          .findMany({ filters: { sku: product.sku }, limit: 1 });
        if (variants[0] && !variants[0].active)
          await app
            .documents('api::variant.variant')
            .update({
              documentId: variants[0].documentId,
              data: { stock: product.sourceSold ? 0 : 1 },
            });
      }
      skipped++;
      continue;
    }
    const ids = [];
    for (const image of product.images) {
      const filepath = path.join(root, 'apps/storefront/public', image.src);
      const previousUpload = await app.db
        .query('plugin::upload.file')
        .findOne({ where: { name: path.basename(filepath) } });
      if (previousUpload) {
        ids.push(previousUpload.id);
        continue;
      }
      const { size } = await stat(filepath);
      const uploaded = await app
        .plugin('upload')
        .service('upload')
        .upload({
          data: {
            fileInfo: { name: path.basename(filepath), alternativeText: image.alt, caption: '' },
          },
          files: {
            filepath,
            originalFilename: path.basename(filepath),
            mimetype: 'image/webp',
            size,
          },
        });
      ids.push(uploaded[0].id);
    }
    await app
      .documents('api::product.product')
      .create({
        status: 'draft',
        data: {
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description,
          priceSatang: product.priceSatang,
          category: product.category,
          material: product.material,
          measurements: product.measurements,
          images: ids,
          reviewState: 'NEEDS_REVIEW',
          postedAt: product.postedAt,
          sourceCaption: product.sourceCaption,
          sourceId: product.id,
          sourceSold: product.sourceSold,
          reviewNotes: product.reviewNotes,
        },
      });
    const existing = await app
      .documents('api::variant.variant')
      .findMany({ filters: { sku: product.sku }, limit: 1 });
    if (!existing.length)
      await app
        .documents('api::variant.variant')
        .create({
          data: {
            sku: product.sku,
            productSlug: product.slug,
            stock: product.sourceSold ? 0 : 1,
            reserved: 0,
            active: false,
          },
        });
    imported++;
  }
  console.log(
    `Imported ${imported} Strapi drafts; preserved ${skipped} existing records. Nothing published.`,
  );
} finally {
  await app.destroy();
}

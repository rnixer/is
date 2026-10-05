import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const productCount = manifest.products.length;
const browser = await chromium.launch();
await mkdir('artifacts', { recursive: true });
const errors = [];
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  const response = await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  if (response.status() !== 200) throw new Error(`Home returned ${response.status()}`);
  await page.getByRole('heading', { name: /A second life/ }).waitFor();
  await page
    .locator('img')
    .evaluateAll((images) => images.forEach((img) => (img.loading = 'eager')));
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.screenshot({ path: `artifacts/${name}-home.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw new Error(`${name}: horizontal overflow`);
  await page.goto('http://127.0.0.1:3000/shop', { waitUntil: 'networkidle' });
  const count = await page.locator('.product-card').count();
  if (count !== productCount) throw new Error(`Expected ${productCount} products, got ${count}`);
  await page.getByRole('button', { name: 'THE DETAILS', exact: true }).click();
  await page.waitForTimeout(400);
  const filtered = await page.locator('.product-card').count();
  if (filtered >= count) throw new Error('Category filter did not reduce results');
  await page.getByRole('button', { name: 'ALL', exact: true }).click();
  await page.locator('.product-card .product-image').first().click();
  await page.locator('.detail-info').waitFor();
  await page.screenshot({ path: `artifacts/${name}-product.png`, fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    throw new Error(`${name}: product overflow`);
  await page.goto('http://127.0.0.1:3000/bag', { waitUntil: 'networkidle' });
  await page.getByText('ตะกร้ายังว่าง เลือกชิ้นที่เป็นคุณได้เลย').waitFor();
  await page.goto('http://127.0.0.1:3000/shop', { waitUntil: 'networkidle' });
  await page.locator('.product-card .product-image').first().click();
  await page.getByRole('button', { name: 'ADD TO BAG · PREVIEW' }).click();
  await page.goto('http://127.0.0.1:3000/bag', { waitUntil: 'networkidle' });
  await page.locator('.bag-item').waitFor();
  await page.getByRole('link', { name: 'CHECKOUT', exact: false }).click();
  await page.getByRole('heading', { name: 'ข้อมูลจัดส่ง' }).waitFor();
  await page.screenshot({ path: `artifacts/${name}-checkout.png`, fullPage: true });
  console.log(
    `${name}: home, ${productCount} products, filter, product, empty bag, add to bag, checkout form and overflow checks passed (${filtered} detail products).`,
  );
  await page.close();
}
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));

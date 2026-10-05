# Development and payment setup

Requires Node 24, npm, Python with `pip install -r tools/instagram/requirements.txt`, and Docker Desktop running. PostgreSQL is real, persistent and local; do not delete its volume to reset the application.

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run db:up
npm.cmd run dev
```

Storefront: http://localhost:3000 / Strapi Admin: http://localhost:1337/admin. Owner creates their own admin account. `.env` values are local and ignored; setup generates random CMS secrets and the server-to-server token. React 18.3.1 is shared across the workspace because current Strapi's peer dependencies require React 18; mixing React 18 CMS peers with React 19 storefront peers broke SSR during verification.

## Reproduce migration

The raw export sits next to the repo: `../instagram-igh.ess-2026-10-05-LIWwNEpM`. Stop the CMS before import. Public caption/media references and reviewed asset candidates in `data/catalog.json` and storefront public images are committed; Strapi uploads and database data are not.

```powershell
npm.cmd run migrate:extract
npm.cmd run migrate:images
npm.cmd run migrate:import
```

Importer skips existing source IDs and preserves owner edits/deletions unless explicitly rerun to recreate missing source IDs. Repeated import does not duplicate products. `--refresh-unreviewed` updates extracted name/category/price/sourceSold and inactive SKU stock only for NEEDS_REVIEW records; never run that option after manual stock review without inspecting the manifest. Generic repeated product titles are not merged. Caption timestamps lack an explicit offset, so the extractor preserves date and source display text rather than fabricating a precise UTC time.

## Stripe test mode

The supplied publishable test key is saved only in `apps/storefront/.env`; examples and Git contain no user keys. Hosted Checkout is opened from a backend-generated URL, so the publishable key alone does not enable payments.

Set these locally in `apps/cms/.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MODE=test
STOREFRONT_URL=http://localhost:3000
```

Enable PromptPay and cards on the eligible Thai Stripe account. Forward Stripe test events to `http://localhost:1337/api/stripe/webhook` using Stripe CLI, then place the CLI's webhook signing secret in the CMS environment. Restart CMS. Never paste secret keys into source files or commit them. Development preview lets users inspect drafts and the bag; only published products with valid prices and available matching SKUs can enter backend checkout.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
python -m unittest tests/test_migration.py
npm.cmd run build
npx.cmd playwright install chromium
node tools/verify-browser.mjs
```

Commerce tests use a uniquely named temporary schema in local PostgreSQL; they test competing last-unit reservations, idempotent retries, unauthorized client prices/status, duplicate webhook events, amount mismatch rollback, expiration and late-payment exceptions. `TEST_DATABASE_URL` may override the test database connection. Browser verification covers desktop/mobile, images, category filters, product detail, bag and checkout preview; screenshots are ignored in `artifacts/`.

Real PromptPay/card settlement and webhook delivery require test secrets and must be checked before production. Passing local tests does not establish production payment readiness.

For actual Strapi integration verification, stop CMS and run `node --env-file=apps/cms/.env tools/verify-strapi.mjs`. It creates uniquely identified temporary product/SKU/order fixtures, tests publishing/review/payment guards and stock consumption through Strapi's real database, then removes only those fixtures. The original imported catalog remains unchanged.

After building, `npm.cmd run start -w @igh/storefront` serves the generated Start Fetch server through the included Node adapter. It loads storefront `.env`; set `NODE_ENV=production`, configure `SITE_URL` and matching CMS `STOREFRONT_URL`, and configure HTTPS at your reverse proxy. Strapi runs with `npm.cmd run start -w @igh/cms` after its build. Do not build/import while a CMS development watcher is running.

## Production and budget

The confirmed budget is THB 1,000–2,000 per year. Local development has no hosting subscription and is the current delivery. Production infrastructure is intentionally not purchased or deployed. Frontend free hosting alone does not host a persistent Strapi/PostgreSQL commerce backend; sleeping demo tiers are unsuitable for reliable checkout/webhooks. Pick a VPS or managed backend only after calculating domain, backups, database and image costs against the yearly budget.

Default uploads are local for experimentation. Production needs persistent upload storage or a configurable Cloudinary/S3-compatible provider, HTTPS, restrictive network exposure, production-only environment, database/upload backups with a restore test, durable reconciliation monitoring and an actual Stripe end-to-end test. Production must never enable draft preview. Review dependency audit before external deployment; Strapi's transitive dependencies currently include upstream advisories, and `npm audit fix --force` proposing a downgrade to Strapi 4 is not a valid solution.

For paid/refund/exception reconciliation, orders and reservations remain durable. A session-create timeout retains stock until Stripe can be reconciled. If no matching session can be found conclusively, the job logs the order reference and retains the reservation for staff review; it does not guess that a payment cannot exist. Refunds do not automatically restock garments.

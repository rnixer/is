# Deploy storefront to Vercel

The repository is a workspace, not a static website. Deploy only `apps/storefront`
to Vercel. Strapi and PostgreSQL require a separate persistent host.

In Vercel Project Settings → Build and Deployment:

- Root Directory: `apps/storefront`
- Enable access to files outside the Root Directory (workspace contracts).
- Framework Preset: TanStack Start
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: leave the override disabled (Nitro generates `.vercel/output`).
- Node.js: 24.x

Environment Variables (Production and Preview):

- `SITE_URL`: your public storefront HTTPS URL.
- `STRAPI_URL`: the public HTTPS URL of your separately hosted Strapi server.
- `STOREFRONT_TOKEN`: the same server token configured on that Strapi server;
  never use a `VITE_` prefix for this secret.

Commit and push these changes, then redeploy. Do not reuse the old build cache
for the first redeploy. A Ready deployment with a platform 404 can occur when
the repository root is deployed without a frontend/SSR build output.

Local `127.0.0.1:1337` is inaccessible from Vercel. Without hosted Strapi and
the matching token, the storefront cannot load the catalogue or create checkout.
Draft products remain hidden in production until reviewed and published.
Stripe secret and webhook signing keys belong on Strapi, not the storefront.

Local adapter build remains `npm run build -w @igh/storefront`. To inspect the
Vercel output locally in PowerShell:

```powershell
$env:VERCEL = '1'
npm.cmd run build -w @igh/storefront
Remove-Item Env:VERCEL
```

Expected output: `apps/storefront/.vercel/output/config.json`, static assets and
the SSR function. `.vercel/` is generated and must not be committed.

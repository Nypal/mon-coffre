# Deployment

## Production Hosting

The production application is hosted with Cloudflare Workers and served through:

```text
https://moncoffre.org
https://www.moncoffre.org
```

## Supabase Configuration

The frontend should be configured with:

```js
MC_CLOUD = {
  enabled: true,
  url: "https://your-project.supabase.co",
  anonKey: "sb_publishable_your_public_key"
};
```

Only the publishable key belongs in the browser.

## Build Flow

The project uses `frontend/build_mc.py` to rebuild the application bundle from the locked design source and the application logic file.

The original locked design source should remain unchanged.

## Cloudflare

`cloudflare/wrangler.toml` shows the Worker deployment configuration. The generated production bundle is intentionally not committed here.

## GitHub Actions

Production deployment is handled by `.github/workflows/deploy-cloudflare.yml`.

Required secrets:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The workflow patches `MC_CLOUD` only inside the CI workspace, rebuilds the app, packages the Worker, and deploys with Wrangler.

Automatic deployment from `main` requires:

```text
PRODUCTION_DEPLOY_ENABLED=true
```

Without that variable, deployment remains manual.

## Database Changes

Frontend deployments do not automatically alter Supabase production schema.

When a feature adds a table or constraint, first run the matching SQL file from
`database/migrations/` in Supabase SQL Editor, verify it passes, then deploy the
frontend.

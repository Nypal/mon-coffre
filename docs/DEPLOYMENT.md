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

The production Worker is route-only. `workers.dev` is disabled so the app is
served through the owned domains instead of an extra public Worker subdomain.

The Worker also serves the installable web app assets:

```text
/manifest.webmanifest
/sw.js
/apple-touch-icon.png
/icons/icon-192.png
/icons/icon-512.png
```

The installed app name is `Mon Coffre`.

Phone install steps:

```text
iPhone Safari -> Share -> Add to Home Screen
Android Chrome -> menu -> Install app
```

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

The deployment workflow also verifies production hardening after packaging the
Worker. A deployment must fail if security headers, SDK pinning, or
`workers.dev` protection are removed.

Automatic deployment from `main` requires:

```text
PRODUCTION_DEPLOY_ENABLED=true
```

Without that variable, deployment remains manual.

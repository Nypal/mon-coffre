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


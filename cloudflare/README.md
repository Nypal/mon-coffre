# Cloudflare

This folder contains the Cloudflare Workers deployment configuration used as a production deployment reference.

The generated production bundle is not committed to the public repository. Rebuild the application from the locked frontend source and logic file before deploying.

`workers.dev` is disabled for production. The Worker should be reached through
the configured custom domains only.

The Worker build script injects the production security headers. Do not bypass
`scripts/build_cloudflare_worker.py` during deployment.

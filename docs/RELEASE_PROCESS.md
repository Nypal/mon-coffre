# Release Process

This repository is the source of truth for Mon Coffre updates.

## Goals

- Keep production changes traceable.
- Prevent accidental design changes.
- Prevent secrets from entering the repository.
- Rebuild the app from source before deployment.
- Deploy to Cloudflare only after safety checks pass.
- Keep browser hardening and SDK pinning enforced by CI.

## Standard Flow

```text
feature branch
-> pull request
-> GitHub Actions safety checks
-> review
-> merge to main
-> production deployment
```

## Required GitHub Secrets

The deployment workflow expects these repository or environment secrets:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Automatic deployment from `main` is intentionally gated by this repository or
environment variable:

```text
PRODUCTION_DEPLOY_ENABLED=true
```

Until that variable is set, the deployment workflow can still be run manually
with `workflow_dispatch`, but pushes to `main` will not deploy accidentally.

Never add these to source files:

```text
service_role
sb_secret
database password
personal access token
user password
```

## Required Checks

The `Safety Checks` workflow verifies:

- high-confidence secret scan;
- locked design source hash;
- JavaScript syntax;
- Python syntax;
- rebuild from `frontend/build_mc.py`;
- generated bundle sanity;
- Cloudflare Worker package generation;
- production security hardening checks.

## Production Deployment

The deployment workflow:

1. checks that all deployment secrets exist;
2. scans the repository before patching production config;
3. verifies the locked design hash;
4. patches `MC_CLOUD` inside the GitHub Actions workspace only;
5. rebuilds the application bundle;
6. packages the Cloudflare Worker;
7. verifies production security hardening;
8. deploys through Wrangler.

The production Supabase URL and publishable key are injected only during CI. They are not committed.

## Recommended Repository Rules

Configure GitHub so that:

- `main` requires pull requests;
- `Safety Checks` must pass before merge;
- at least one approval is required before merging to `main`;
- force pushes to `main` are blocked;
- deletion of `main` is blocked;
- the `production` environment requires manual approval before deployment.

## Dashboard Follow-Up

After code changes are merged, confirm these provider settings manually:

- Supabase Auth leaked password protection is enabled;
- GitHub `main` branch protection requires review and passing checks;
- GitHub `production` environment has required reviewers;
- Cloudflare serves the site only through `moncoffre.org` and
  `www.moncoffre.org`.

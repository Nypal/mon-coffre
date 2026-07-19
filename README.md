# Mon Coffre

Personal finance web application built to manage accounts, income, expenses, savings goals, purchase funds, debts, loans, and private receipt attachments.

Live production site: https://moncoffre.org

## Project Summary

Mon Coffre is a production-oriented personal finance application with a locked visual design, a Supabase backend, Row Level Security policies, private file storage, and Cloudflare deployment on a custom domain.

The project demonstrates:

- frontend integration on top of a compiled design bundle;
- Supabase Auth integration;
- PostgreSQL schema design with foreign keys, constraints, indexes, and generated values;
- Row Level Security for per-user data isolation;
- private Storage bucket policies for user-owned attachments;
- integer-based money handling to avoid floating point errors;
- Cloudflare Workers deployment with a custom domain.

## Main Features

- Secure account creation and login through Supabase Auth.
- Dashboard for personal finance overview.
- Accounts, income, expenses, savings, purchase funds, debts, and loans.
- Currency-aware financial records.
- Receipt and document attachment support through a private Storage bucket.
- Mandatory first-run onboarding for cloud users.
- Planning modules for lifestyle inflation, debt snowball payoff, sequential goal funding, monthly reviews, planned purchases, and optional real estate projections.
- Desktop and mobile layouts.
- Cloud-ready persistence with local fallback architecture.

## Tech Stack

- Frontend: HTML, JavaScript, compiled design runtime
- Backend: Supabase Auth, PostgreSQL, Row Level Security, Supabase Storage
- Deployment: Cloudflare Workers, custom domain
- Tooling: Python build script, SQL schema, runtime validation scripts

## Repository Layout

```text
.github/workflows/
  ci.yml                           Pull request and main branch safety checks
  deploy-cloudflare.yml            Production deployment workflow

scripts/
  security_scan.py                 High-confidence secret scan
  verify_design_lock.py            Locked design hash check
  configure_cloud.py               CI-only Supabase config patch
  build_cloudflare_worker.py       Cloudflare Worker package builder

frontend/
  Mon Coffre - Application.html   Locked design source
  design-lock.sha256              Locked design source hash
  mc_logic.js                     Application logic and cloud adapter
  build_mc.py                     Rebuild script for the compiled bundle

database/
  supabase_schema.sql             Supabase schema, constraints, RLS, Storage policies
  migrations/                     Production-safe incremental SQL migrations

cloudflare/
  wrangler.toml                   Cloudflare Workers deployment example

docs/
  ARCHITECTURE.md                 Technical architecture
  SECURITY.md                     Security model
  DEPLOYMENT.md                   Deployment notes
  RELEASE_PROCESS.md              Secure GitHub-to-production process
  ONBOARDING_AND_ATTACHMENTS.md   Product specification for onboarding and receipts
  VALIDATION.md                   Validation summary
```

## Security Notes

This public repository intentionally does not include any secret key, password, service role key, or private token.

The frontend sample uses placeholders:

```js
MC_CLOUD = {
  enabled: false,
  url: "https://your-project.supabase.co",
  anonKey: "sb_publishable_your_public_key"
};
```

Production uses only a Supabase publishable key in the browser. Data protection is enforced by RLS and Storage policies.

## Current Production Status

- Production domain: https://moncoffre.org
- HTTPS: active
- Supabase schema validation: passed
- RLS validation: passed
- Storage policy validation: passed
- Production auth/cloud smoke tests: passed
- Mandatory onboarding and planning modules: implemented on feature branch
- Remaining dashboard advisory: leaked password protection can be enabled from Supabase Auth settings

## Update Process

Updates are intended to flow through GitHub:

```text
feature branch -> pull request -> safety checks -> review -> merge to main -> Cloudflare deployment
```

The production workflow requires GitHub Secrets, a `production` environment, and `PRODUCTION_DEPLOY_ENABLED=true` before automatic deployment from `main` is active.

## Portfolio Context

This project was built as a practical full-stack product: design preservation, backend security, cloud deployment, and production readiness were treated as first-class requirements.

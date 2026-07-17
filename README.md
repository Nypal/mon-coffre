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
- Desktop and mobile layouts.
- Cloud-ready persistence with local fallback architecture.

## Tech Stack

- Frontend: HTML, JavaScript, compiled design runtime
- Backend: Supabase Auth, PostgreSQL, Row Level Security, Supabase Storage
- Deployment: Cloudflare Workers, custom domain
- Tooling: Python build script, SQL schema, runtime validation scripts

## Repository Layout

```text
frontend/
  Mon Coffre - Application.html   Locked design source
  mc_logic.js                     Application logic and cloud adapter
  build_mc.py                     Rebuild script for the compiled bundle

database/
  supabase_schema.sql             Supabase schema, constraints, RLS, Storage policies

cloudflare/
  wrangler.toml                   Cloudflare Workers deployment example

docs/
  ARCHITECTURE.md                 Technical architecture
  SECURITY.md                     Security model
  DEPLOYMENT.md                   Deployment notes
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
- Remaining dashboard advisory: leaked password protection can be enabled from Supabase Auth settings

## Portfolio Context

This project was built as a practical full-stack product: design preservation, backend security, cloud deployment, and production readiness were treated as first-class requirements.


# Architecture

Mon Coffre is organized around a locked frontend design bundle and a separate application logic layer.

## Frontend

The design source is treated as locked. The runtime logic lives in `frontend/mc_logic.js`, and the build script injects that logic into the compiled application bundle.

This separation keeps the visual design stable while allowing backend integration to evolve.

## Backend

Supabase provides:

- user authentication;
- PostgreSQL tables for financial records;
- Row Level Security policies;
- private object storage for receipt attachments.

Every user-owned table includes `user_id` where required. Child records reference parent records through composite foreign keys that include `user_id`, and currency-sensitive relations also include `currency`.

## Money Model

Amounts are stored as integers in minor units:

- USD and EUR use cents;
- XOF and XAF use whole units.

The database does not silently convert currencies. Financial reporting must group records by currency.

## Deployment

The production application is deployed with Cloudflare Workers and served through a custom domain.


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
- optional privacy-preserving feature event storage for product evaluation.

Every user-owned table includes `user_id` where required. Child records reference parent records through composite foreign keys that include `user_id`, and currency-sensitive relations also include `currency`.

## Money Model

Amounts are stored as integers in minor units:

- USD and EUR use cents;
- XOF and XAF use whole units.

The database does not silently convert currencies. Financial reporting must group records by currency.

## Product Evaluation

The frontend records a small local event stream for feature usage. When the
Supabase product evaluation migration is installed, authenticated users can also
sync their own event rows through RLS.

The evaluation layer is intentionally separate from financial data. It stores
feature ids, event names, device mode, and sanitized metadata only. Amounts,
emails, names, file references, and free-form financial notes are excluded.

## Deployment

The production application is deployed with Cloudflare Workers and served through a custom domain.

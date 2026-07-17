# Database

`supabase_schema.sql` contains the Supabase database schema, constraints, indexes, Row Level Security policies, and private Storage bucket policies.

The schema is designed to protect user data through:

- per-user ownership columns;
- RLS policies;
- composite foreign keys containing `user_id`;
- currency-aware parent-child references;
- private Storage paths scoped by user id.

Attachment metadata is stored in dedicated tables for expenses, income, debts,
debt payments, loans, and loan repayments. Files remain in the private
Supabase Storage bucket.

Targeted production migrations live in `database/migrations/`. Apply the
relevant migration before deploying frontend code that depends on a new table.

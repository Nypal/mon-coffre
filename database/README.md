# Database

`supabase_schema.sql` contains the Supabase database schema, constraints, indexes, Row Level Security policies, and private Storage bucket policies.

Production updates are stored in:

```text
database/migrations/
```

Run the latest migration in the Supabase SQL Editor before deploying frontend code that depends on new tables.

The schema is designed to protect user data through:

- per-user ownership columns;
- RLS policies;
- composite foreign keys containing `user_id`;
- currency-aware parent-child references;
- private Storage paths scoped by user id.

The onboarding modules add two protected objects:

- `public.user_financial_plans`;
- `public.income_attachments`.


# Security Model

## Authentication

Authentication is handled by Supabase Auth. The browser uses only the publishable key.

The project must never expose:

- `service_role` keys;
- `sb_secret` keys;
- database passwords;
- personal access tokens;
- user passwords.

## Row Level Security

All user-owned tables have RLS enabled. Policies restrict authenticated users to their own rows.

The core policy pattern is:

```sql
(select auth.uid()) = user_id
```

This ensures that users can read, create, update, and delete only their own data.

## Cross-User Protection

Composite foreign keys enforce parent-child ownership. For example:

- an expense cannot reference another user's account;
- a debt payment cannot reference another user's debt;
- a loan repayment cannot reference another user's loan;
- an attachment cannot reference another user's object.

## Currency Protection

Currency-sensitive relations include `currency` in the composite key. This prevents invalid records such as a USD expense being attached to an XOF account.

## Private Attachments

Receipt files are stored in the private `justificatifs` bucket.

Object paths follow this structure:

```text
<user_id>/<unique_file_name>
```

Storage policies verify both:

- `bucket_id = 'justificatifs'`;
- the first path segment matches the authenticated user.


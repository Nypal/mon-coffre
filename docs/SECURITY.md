# Security Model

## Authentication

Authentication is handled by Supabase Auth. The browser uses only the publishable key.

The project must never expose:

- `service_role` keys;
- `sb_secret` keys;
- database passwords;
- personal access tokens;
- user passwords.

The Supabase browser SDK is loaded from an exact pinned version and protected
with Subresource Integrity. Do not replace the pinned URL with a floating
`@2` CDN URL.

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

## Browser Hardening

The Cloudflare Worker adds production security headers for every app response:

- Content Security Policy with `frame-ancestors 'none'`;
- HSTS with `includeSubDomains` and `preload`;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- restrictive Permissions Policy.

The CSP still allows inline scripts and styles because the locked application
bundle is a compiled single-file app. Removing that requirement would need a
larger frontend rebuild, not a small security patch.

## User-Supplied Media

Planned-purchase images are filtered before rendering. The app accepts only
HTTPS image URLs and base64 PNG/JPEG/WEBP data URLs, and renders them with
`referrerpolicy="no-referrer"`.

## Product Evaluation Privacy

The product evaluation engine records feature-level usage only. It is designed
to answer questions such as "which module blocks users?" without collecting
financial content.

Evaluation events must not contain:

- email addresses;
- passwords;
- keys or tokens;
- financial amounts;
- merchant, bank, creditor, borrower, or payee names;
- file paths, file names, or free-form notes.

The frontend sanitizes metadata before storage or cloud sync. The Supabase
schema also rejects sensitive metadata patterns and protects evaluation tables
with per-user RLS policies.

## Dashboard Controls

Two security controls live outside this repository and must be kept enabled in
the provider dashboards:

- Supabase leaked password protection for production Auth;
- GitHub branch protection and production environment reviewers.

## CI Supply Chain

GitHub Actions are pinned to exact commit SHAs instead of floating version tags.
Dependabot monitors the workflows weekly so action updates arrive through
reviewable pull requests.

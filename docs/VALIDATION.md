# Validation Summary

## Supabase Runtime Validation

The corrected schema was executed successfully on a Supabase project.

Validated behavior:

- user A can sign in;
- user B can sign in;
- user A can read their own data;
- user A cannot read, modify, or delete user B data;
- cross-user account references are rejected;
- cross-user debt payment references are rejected;
- cross-user loan repayment references are rejected;
- cross-user attachment references are rejected;
- currency mismatches are rejected;
- nullable account references remain valid when allowed;
- private Storage upload, read, update, and delete work inside the user's folder;
- Storage access outside the user's folder is rejected.

## Advisor Results

Security Advisor:

- 0 errors;
- 1 remaining Auth warning: leaked password protection disabled.

Performance Advisor:

- 0 errors;
- 0 warnings.

## Production Smoke Tests

Production auth and cloud operations were tested with a dedicated test user.

Validated operations:

- sign in;
- read profile through RLS;
- create and update accounts;
- create expenses with and without account references;
- reject invalid currency/account relation;
- create income;
- create savings goals and contributions;
- create purchase goals and contributions;
- create debts and debt payments;
- create loans and repayments;
- upload, read, update, and delete private Storage files.


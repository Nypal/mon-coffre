# Onboarding and Attachments Specification

This document describes the next product milestone for Mon Coffre.

## Objective

New users should not land on an empty dashboard. The app should guide them through the minimum financial setup required to make the dashboard useful immediately.

## Onboarding Flow

The onboarding should run after first sign-in when the user has no meaningful cloud data.

Suggested steps:

1. Profile
   - preferred display name;
   - main currency;
   - optional country/region.

2. Accounts
   - cash balance;
   - bank account balance;
   - mobile money balance;
   - online wallet balances;
   - account currency.

3. Income
   - salary;
   - business income;
   - freelance income;
   - other recurring income;
   - income account and frequency.

4. Expenses
   - rent or mortgage;
   - food;
   - transport;
   - internet and phone;
   - subscriptions;
   - healthcare;
   - other recurring expenses.

5. Savings and goals
   - emergency fund;
   - purchase funds;
   - family or travel goals.

6. Debt and money lent
   - debts to repay;
   - money lent to others;
   - expected repayment dates.

7. Receipts and evidence preference
   - ask whether the user wants to attach receipts by default;
   - explain that files are stored privately.

## Data Rules

- Onboarding should create normal rows in the existing tables.
- It should not create a separate "onboarding data" format.
- Amounts must use integer minor units.
- Currency mismatches must remain impossible.
- Users must be able to skip optional steps.
- Users must be able to edit created rows afterward.

## Attachment Requirements

The current application already supports private attachments for expenses, debts, debt payments, loans, and loan repayments.

The next schema change should add income attachments:

```text
income_attachments
```

Minimum columns:

```text
id
user_id
income_id
file_path
file_name
file_type
file_size
created_at
```

Security requirements:

- `income_id` must reference an income row owned by the same user;
- RLS must restrict rows to their owner;
- files must remain in the private `justificatifs` bucket;
- object paths must use `<user_id>/<unique_file_name>`;
- Storage policies must continue to reject access outside the user's folder.

## UX Requirements

The onboarding should match the existing Mon Coffre visual language:

- same cards, colors, radius, spacing, and typography;
- no marketing page;
- short questions;
- progress indicator;
- skip and back controls;
- final review before saving;
- success state that sends the user to the dashboard.

## Acceptance Criteria

- A brand-new confirmed user can complete onboarding without leaving the app.
- The dashboard is populated from the onboarding answers.
- Refreshing the page keeps the data through Supabase.
- Income and expense evidence files can be uploaded.
- Uploaded files are private and scoped to the authenticated user.
- Existing users are not forced through onboarding if they already have data.


# Mandatory Onboarding and Planning Modules

This document describes the first production onboarding release for Mon Coffre.

## Product Rule

A signed-in cloud user must complete onboarding before using the application modules.

The onboarding has six screens maximum. Each screen requires an answer. If a section does not apply, the user must explicitly write `Aucun` instead of leaving it blank. This keeps the flow complete without forcing fake data.

## Onboarding Screens

1. Income
   - display name;
   - main currency;
   - previous monthly income;
   - current monthly income;
   - monthly spending baseline;
   - date of income change;
   - income sources, one per line.

2. Accounts
   - account name;
   - current balance;
   - role or usage of the account.

3. Fixed Expenses
   - rent or mortgage;
   - subscriptions;
   - family transfers;
   - recurring bills;
   - payment day and category.

4. Debts
   - creditor or debt name;
   - balance;
   - minimum monthly payment;
   - interest rate;
   - due day.

5. Goals
   - emergency fund target;
   - savings goals;
   - planned purchases;
   - optional real estate status: `Oui`, `Pas encore`, or `Non`.

6. Risk Habits
   - spending leaks;
   - dangerous payday;
   - lifestyle inflation alert threshold;
   - monthly review preference.

## Implemented Modules

### Lifestyle Inflation Guard

The app stores a baseline monthly spending amount and compares current spending against it.

Example alert:

```text
Tes dépenses ont augmenté de 22% depuis ton nouveau job.
```

This module is based on integer minor units. It does not mix currencies or convert amounts silently.

### Debt Snowball Projection

Debts are sorted from smallest remaining balance to largest remaining balance. The planning panel projects payoff timing from the monthly debt budget and minimum payments.

The goal is motivational clarity:

```text
CC1 can be paid off in September if you keep paying X/month.
```

### Sequential Funding Mode

Funding can run in sequential mode:

```text
Emergency fund first -> next savings goal -> next planned purchase
```

This avoids spreading small amounts across too many goals at once.

### Monthly Review

The planning panel summarizes:

- income by source;
- spending by category;
- income minus spending;
- spending delta versus the previous month.

### Real Estate Project

The real estate module is optional. If the user chooses `Non`, it remains hidden.

The module reuses existing app data:

- monthly income from income rows;
- monthly debt payments from debt minimums;
- down payment from the linked savings goal.

It displays three core values:

- maximum housing payment using the 28/36 ratio model;
- estimated maximum purchase price;
- down payment progress.

It also includes what-if sliders:

- additional monthly income;
- monthly debt payment freed by paying off a debt;
- estimated mortgage interest rate.

The investor mode settings are stored in the plan object but advanced investor UI remains intentionally minimal in this release.

Disclaimer shown in-app:

```text
Estimation basée sur les ratios 28/36 couramment utilisés par les prêteurs américains. Chaque banque a ses propres critères. Ceci n’est pas un conseil financier.
```

### Planned Purchase Anti-Klarna

The user can define a planned purchase with:

- item name;
- price;
- target date or weekly/monthly contribution;
- priority;
- optional product image URL.

The app calculates the missing variable:

- target date -> required weekly contribution;
- weekly/monthly contribution -> projected availability date.

The panel compares cash saving against an estimated financing range, so the user sees the cost of buying with debt.

## Attachments

The application supports private receipt/document attachments for:

- expenses;
- income;
- debts;
- debt payments;
- loans given;
- loan repayments.

Files are stored in the private Supabase Storage bucket:

```text
justificatifs
```

Object paths must follow:

```text
<user_id>/<unique_file_name>
```

The frontend never writes a `service_role` key or secret key. It uses only the publishable key, and RLS/Storage policies enforce ownership.

## Database Objects

This release adds:

```text
public.user_financial_plans
public.income_attachments
```

`user_financial_plans` stores onboarding completion status and the planning configuration JSON for one user.

`income_attachments` stores metadata for income receipts and references `public.income` through a composite foreign key containing `user_id`.

Production migration:

```text
database/migrations/20260719_onboarding_modules_v1.sql
```

## Acceptance Criteria

- A new confirmed cloud user cannot enter the application until onboarding is complete.
- All six onboarding screens require an answer.
- Writing `Aucun` is accepted for a non-applicable section.
- Onboarding creates normal app rows for accounts, income, expenses, debts, savings goals, and planned purchases.
- The financial plan persists through Supabase.
- The planning panel is available after onboarding.
- Lifestyle inflation, debt snowball, sequential funding, monthly review, real estate projection, and planned purchase views are available.
- Income and expense attachments can be added from their creation flow or from row attachment management.
- Attachment metadata cannot point to another user's parent row.
- Storage files remain private and scoped to the authenticated user's folder.

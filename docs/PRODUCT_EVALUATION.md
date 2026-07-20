# Product Evaluation Engine

Mon Coffre includes a privacy-preserving evaluation layer that helps decide what
to improve next based on real application usage.

## Goals

- identify which modules are actually used;
- detect flows that users start but do not finish;
- surface high-priority update recommendations inside the financial plan panel;
- keep product learning separate from financial records;
- avoid external marketing analytics for sensitive personal finance usage.

## Tracked Events

The app records structured feature events only:

- `feature_viewed`
- `feature_started`
- `feature_completed`
- `feature_skipped`
- `feature_failed`
- `feature_feedback`

Events are attached to a `feature_id`, a session id, the current page id, the
device mode, and a small sanitized metadata object.

## Privacy Rules

Product events must never include:

- email addresses;
- passwords;
- Supabase keys or tokens;
- financial amounts;
- merchant names;
- bank names;
- creditor or borrower names;
- file paths or file names;
- free-form notes.

The frontend filters event metadata before local storage or cloud sync. The
database also rejects metadata containing sensitive key patterns.

## Local And Cloud Behavior

The engine always works locally. It keeps only the last 500 product events for
the current user/device.

When the Supabase migration is present, authenticated users also sync their own
events to `public.feature_events` through Row Level Security. If the table is
missing, the app disables cloud event sync quietly and continues locally.

## Supabase Migration

Apply this migration in production before relying on cloud-synced evaluation:

```text
database/migrations/20260720_product_evaluation_v1.sql
```

The migration creates:

- `public.feature_events`
- `public.feature_feedback`

Both tables have RLS enabled. Users can select, insert, and delete only their
own evaluation rows. No browser update grant is provided.

## In-App Report

The report appears inside the `Plan financier` panel under:

```text
Évaluation automatique du projet
```

It shows:

- a score per core feature;
- the number of collected usage signals;
- prioritized recommendations for future updates.

The recommendations intentionally favor practical product work:

- fix features with recorded failures;
- simplify flows that start but do not complete;
- make valuable but unseen modules more visible;
- add clearer actions to pages that are viewed but not used.

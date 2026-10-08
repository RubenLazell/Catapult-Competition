# Catapult Control

Team site for the Six Sigma catapult competition.

- **Predict** (`/`): enter a target distance and get draw angle, front pin and stop pin settings. Placeholder output until the model is fitted (`lib/model.ts`).
- **Training** (`/training`): planned regression model, trial-shot entry, per-setting summary stats, CSV export. Trials are stored in Supabase.

## Setup

1. **Supabase**: create a project, open *SQL Editor*, and run `supabase/schema.sql`.
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Project Settings → API).
3. `npm install` then `npm run dev` and open http://localhost:3000.

## Deploy

Push to GitHub, import the repo in Vercel, and add the same two environment variables in the Vercel project settings.

## Fitting the model later

Export trials as CSV from the Training page, fit the regression, then put the coefficients and back-solve logic into `predictSettings()` in `lib/model.ts`. The Predict page already renders `status: "ok"` results.

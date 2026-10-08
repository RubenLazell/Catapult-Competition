# Catapult Control

Team site for the Six Sigma catapult competition.

- **Predict** (`/`): enter a target distance and get draw angle, front pin and stop pin settings. Placeholder output until the model is fitted (`lib/model.ts`).
- **Training** (`/training`): planned regression model, trial-shot entry, per-setting summary stats, CSV export. Trials are stored in Postgres (Neon, free tier).

## Setup

1. **GitHub**: push this repo.
2. **Vercel**: *Add New → Project*, import the repo, deploy.
3. **Database**: in the Vercel project open *Storage → Create Database → Neon* (free), connect it to the project, then redeploy. This sets `DATABASE_URL`; the `trials` table is created automatically on first use (schema in `db/schema.sql`).

### Local dev

Copy `.env.example` to `.env.local`, paste the `DATABASE_URL` from Neon (or run `vercel env pull`), then `npm install` and `npm run dev`.

## Fitting the model later

Export trials as CSV from the Training page, fit the regression, then put the coefficients and back-solve logic into `predictSettings()` in `lib/model.ts`. The Predict page already renders `status: "ok"` results.

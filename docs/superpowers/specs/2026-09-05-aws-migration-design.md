# DonorTrack AWS Migration Design

## Context

DonorTrack's backend (Railway) is dead — its URL returns Railway's own
"Application not found" edge error, meaning the service/project was
deprovisioned (most likely the free trial credit ran out), not that the app
crashed. The frontend (Vercel) still works fine since it's a static SPA.

There are no real users and no data worth preserving, so downtime during
migration is fine and there's no data-migration step. The goal is to move
the whole app (frontend, backend, database) onto AWS, for two reasons: (1)
consistency — the portfolio site already runs on AWS, and Jacob wants one
AWS story rather than several scattered platforms, and (2) it's genuinely
free, forever, at this app's traffic level (zero to near-zero) — not just
during a 12-month new-account window.

The domain (donortrackapp.com) already exists; DNS for it is believed to
live on Cloudflare (not confirmed with certainty). The registrar/DNS
provider itself is **not** changing as part of this work — Cloudflare stays
the DNS host, and a small number of records get pointed at the new AWS
endpoints. No Cloudflare API integration is added; this one step is called
out in the plan as a manual action.

## Goals

- Get DonorTrack fully working again, end to end (auth, donor/donation CRUD,
  reports, tax letters, Stripe billing, trial reminder emails).
- Host it entirely on AWS except the database, which needs a provider with
  a real forever-free tier (AWS RDS's free tier expires after 12 months and
  then costs real money).
- $0 recurring infrastructure cost, indefinitely. The domain registration
  itself is the only ongoing cost, and it isn't part of this migration.
- Minimize rewrite risk — reuse the existing Express app, Prisma schema,
  and business logic as close to unchanged as possible.

## Non-Goals

- Migrating any data from the old Railway Postgres database (there is none
  worth keeping; the new Neon database starts empty and Prisma's own
  migrations create the schema).
- Changing Stripe products/prices, the Resend account, or Sentry project —
  these stay exactly as configured; only where their env vars/webhook URLs
  point changes.
- Automating Cloudflare DNS changes via API/CDK. DNS record changes are a
  manual, documented step.
- A custom domain on API Gateway. The API is reached through CloudFront's
  own path-based routing (see Architecture), not a separate API subdomain.

## Architecture

```
                         Cloudflare (DNS, unchanged)
                                    |
                     donortrackapp.com / www.donortrackapp.com
                                    |
                                    v
                    ┌───────────────────────────────┐
                    │   CloudFront distribution      │
                    │  (ACM cert, us-east-1)         │
                    ├───────────────┬─────────────────┤
                    │ default (/*)  │  /api/* behavior │
                    └───────┬───────┴─────────┬───────┘
                            v                 v
                  ┌──────────────────┐  ┌─────────────────────┐
                  │  S3 (private,    │  │  API Gateway HTTP    │
                  │  OAC) — frontend │  │  API                 │
                  │  static build    │  └──────────┬───────────┘
                  └──────────────────┘             v
                                        ┌────────────────────────┐
                                        │  Lambda (Node 22.x)     │
                                        │  serverless-http(app)  │
                                        │  — the existing Express │
                                        │    app, unchanged       │
                                        └────────────┬────────────┘
                                                     v
                                        ┌────────────────────────┐
                                        │  Neon Postgres          │
                                        │  (pooled connection)    │
                                        └────────────────────────┘

              ┌─────────────────────────┐
              │  EventBridge Scheduler   │──> Lambda (cron handler)
              │  (daily, 9am UTC)        │    same trial-reminder logic,
              └─────────────────────────┘    extracted from server.ts

  Unchanged externally: Stripe (checkout + webhooks), Resend (email),
  Sentry (error monitoring). Only the webhook/callback URLs and env vars
  pointing at DonorTrack's own backend change.
```

This mirrors the portfolio site's own S3+CloudFront+Lambda+API Gateway
pattern, with one deliberate difference: the database is Neon, not RDS,
specifically because RDS's free tier expires after 12 months and Neon's
does not.

## Components

### 1. Frontend — S3 + CloudFront

Identical pattern to the portfolio site: a private S3 bucket (no public
access) serves the Vite build output, fronted by CloudFront using Origin
Access Control. No frontend code changes — it already calls relative
`/api/*` paths (see `frontend/vite.config.ts`'s dev proxy and the absence
of any `VITE_API_URL`), so nothing about how it reaches the backend needs
to change; only where those paths physically resolve to (CloudFront's
`/api/*` behavior instead of Vercel's rewrite rule).

CloudFront's error responses need the same 403/404 → `/index.html` fallback
the portfolio uses, so client-side routing survives a hard refresh on a
nested path (e.g. `/dashboard`).

### 2. Backend — Lambda + API Gateway

`backend/src/app.ts` already exports a plain configured Express app
(`export default app`) with no side effects at import time — this is
exactly the shape `serverless-http` wraps. A new file,
`backend/src/lambda.ts`, becomes the Lambda entry point:

```ts
import serverlessHttp from "serverless-http";
import app from "./app";

export const handler = serverlessHttp(app);
```

`server.ts` (which currently does both `app.listen()` and schedules the
cron job) is no longer the entry point for the Lambda deployment, but it
stays in the repo unchanged for local development (`npm run dev` still
works exactly as today, listening on a real port).

**Known integration risk — Stripe webhook raw body:** `app.ts` mounts
`express.raw({ type: "application/json" })` on `/api/stripe/webhook`
specifically so `stripe.webhooks.constructEvent(req.body, ...)`
(`backend/src/routes/stripe.ts`) gets the exact raw bytes Stripe signed.
Through API Gateway's Lambda proxy integration, the body arrives inside the
Lambda event as a string (base64-encoded when `isBase64Encoded` is true),
and `serverless-http` has to reconstruct that back into the same Buffer
Express would have produced locally, or signature verification fails with
a generic 400 from Stripe's SDK. This needs an explicit test — send a
locally-constructed, correctly-signed webhook payload at the deployed
endpoint and confirm `constructEvent` doesn't throw — not just "the
endpoint returns 200 for a probe," which could pass while the raw-body path
is silently broken (e.g. because a corner code path bypasses signature
checking).

### 3. Cron — EventBridge Scheduler

The daily trial-reminder job (lines 30-88 of the current `server.ts`) moves
into its own Lambda entry point, `backend/src/cron.ts`, containing the same
logic (the 3-day/1-day reminder queries and `sendTrialReminderEmail` calls)
with the `cron.schedule(...)` wrapper removed — the function body becomes
the Lambda handler directly, invoked once per run rather than staying
resident:

```ts
export const handler = async () => {
  // the existing trial-reminder logic, unchanged
};
```

An EventBridge Scheduler rule (`rate` or `cron` schedule expression
matching the current `"0 9 * * *"`, i.e. daily at 9am UTC) invokes it. This
is the one real logic-relocation in the whole migration; everything else is
either unchanged code behind a thin wrapper, or a hosting/config change.

### 4. Database — Neon Postgres

A new Neon project, database starts empty. `npx prisma migrate deploy`
(not `db push`, since production should apply committed migrations, not
dev-mode schema sync) runs once against it to create the schema from
`backend/prisma/migrations/`.

`backend/src/prisma.ts` already uses `@prisma/adapter-pg` — a plain `pg`
TCP connection — which works against Neon exactly as it does against any
Postgres today; no driver/adapter change needed. The `DATABASE_URL`
pointed at it should be Neon's **pooled** connection string (the one
routed through Neon's built-in PgBouncer), not the direct one — Lambda's
per-invocation-connection model can otherwise exhaust Neon's connection
limit under concurrent invocations, and Neon's pooled endpoint exists
specifically for this serverless-compute pattern.

`backend/prisma/schema.prisma`'s `generator client` block has no
`binaryTargets` set today (defaults to whatever platform runs `prisma
generate`, i.e. Jacob's Windows dev machine). It needs
`binaryTargets = ["native", "rhel-openssl-3.0.x"]` added so the engine
binary bundled into the Lambda deployment package actually matches
Lambda's Amazon Linux runtime, and `prisma generate` needs to run as a
build step in CI (not rely on a binary committed from a dev machine).

### 5. Secrets — SSM Parameter Store

Same pattern as the portfolio's Gemini key: every backend secret
(`DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`RESEND_API_KEY`, `SENTRY_DSN`) is stored as an SSM SecureString parameter
(standard tier, no extra cost) and granted to the Lambda's execution role
via a scoped `ssm:GetParameter` policy, rather than being plain Lambda
environment variables in the CDK source.

### 6. IaC & CI/CD

AWS CDK (Python), matching the portfolio's own stack for a consistent
tooling story, lives in a new `infra/` directory in this repo. GitHub
Actions deploys via OIDC-federated role assumption (no stored AWS access
keys), same as the portfolio: one workflow builds and pushes the frontend
to S3 + invalidates CloudFront on push to `main`; a separate
`workflow_dispatch` (or `infra/**`-path-filtered) job runs `cdk deploy` for
infrastructure changes, so those aren't applied on every push.

### 7. DNS — Cloudflare (manual step)

CDK creates the ACM certificate (us-east-1, required for CloudFront) and
outputs the DNS validation CNAME record it needs — this gets added manually
in the Cloudflare dashboard (DNS validation can't be automated without a
Cloudflare API integration, which is out of scope here). Once the
CloudFront distribution exists, `donortrackapp.com` and
`www.donortrackapp.com`'s existing records get repointed from Vercel to the
CloudFront distribution's domain name, also manually in Cloudflare. If
Cloudflare's proxy ("orange cloud") is enabled on these records, it should
be set to DNS-only for the CloudFront target, since CloudFront is already a
CDN and double-proxying through Cloudflare in front of it is unnecessary
and can interfere with ACM/CloudFront's own TLS handling.

## Migration & Cutover Plan

Because there's no data to preserve and downtime is acceptable, this
doesn't need a careful blue-green cutover — it's a straightforward
build-then-switch:

1. Provision Neon database, backend Lambda + API Gateway, EventBridge cron
   rule, and the S3+CloudFront frontend stack via CDK — all reachable at
   their own AWS-generated URLs, with DonorTrack's real domain not yet
   pointed at any of it. Vercel/the dead Railway URL keep being what
   `donortrackapp.com` resolves to during this whole phase.
2. Run `prisma migrate deploy` against the new Neon database.
3. Update Stripe's webhook endpoint URL (in the Stripe dashboard) to point
   at the new domain's `/api/stripe/webhook` path — this only takes effect
   once DNS cuts over in step 5, but is easiest to update once during this
   phase rather than juggling two live endpoints.
4. Smoke-test the new stack end to end using its AWS-generated URLs
   directly (CloudFront's default domain, before DNS points at it) —
   signup, login, creating a donor/donation, the Stripe webhook test above,
   and the cron Lambda invoked manually once.
5. Update DNS in Cloudflare: point `donortrackapp.com` /
   `www.donortrackapp.com` at the new CloudFront distribution.
6. Confirm the live domain now serves the new stack; decommission the
   Vercel project once satisfied (not before — Vercel costs nothing extra
   to leave stopped, and keeping it a few days as a fallback is free
   insurance).

## Testing

Neither half of the repo has any test harness today (no test files, no
`test` script in either `package.json`). Retroactively testing the entire
pre-existing Express app is its own separate undertaking and out of scope
here. This migration adds Vitest (matching the portfolio site's own choice,
for a consistent toolchain) to the backend, scoped to covering the new code
this migration introduces:

- A test exercising the Lambda entry point (`lambda.ts`) with a
  representative API Gateway v2 proxy event, asserting the response shape
  round-trips correctly (status code, headers, body) for at least one
  simple route (e.g. `/api/health`).
- The Stripe webhook raw-body test described above — this is the single
  highest-risk integration point in the whole migration and gets explicit,
  deliberate coverage rather than being assumed to work.
- The extracted cron handler (`cron.ts`) gets a unit test asserting it
  still sends 3-day/1-day reminders under the same conditions the original
  inline logic did (mocking Prisma and the email send).
- CDK: `cdk synth` succeeds; new `pytest` infra tests (in the new `infra/`
  directory) cover at minimum that the stack synthesizes the expected
  S3/CloudFront/Lambda/API Gateway/EventBridge resources.

## Cost

At this app's traffic level (effectively zero real users):

| Component | Cost |
|---|---|
| S3 (frontend build, a few MB) | ~$0 (well under free tier, and cheap even outside it) |
| CloudFront | $0 — 1TB/month + 10M requests is AWS's permanent Always Free tier |
| Lambda (API + cron) | $0 — 1M requests + 400,000 GB-seconds/month, permanently free |
| API Gateway | ~$0 — 12-month free tier covers it now; after that, ~$1 per million requests, i.e. fractions of a cent/month at this traffic |
| EventBridge Scheduler | $0 — one rule invoked once daily is well within its free tier |
| SSM Parameter Store (SecureString, standard tier) | $0 |
| Neon (database) | $0 — free tier, no time limit |
| Route 53 / ACM | $0 — ACM certificates are free; DNS stays on Cloudflare (not Route 53), so no hosted-zone cost either |

Only the domain registration itself (already owned, unaffected by this
migration) is a real recurring cost.

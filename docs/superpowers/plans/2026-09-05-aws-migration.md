# DonorTrack AWS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move DonorTrack's dead Railway backend and its database onto AWS (Lambda + API Gateway + Neon Postgres) and its Vercel frontend onto S3 + CloudFront, at $0 recurring cost, with the existing Express/Prisma app kept as close to unchanged as possible.

**Architecture:** CloudFront routes `/*` to a private S3 bucket (the built frontend) and `/api/*` to an API Gateway HTTP API backed by a Lambda running the existing Express app via `serverless-http`. A second Lambda holds the daily trial-reminder job, invoked by an EventBridge rule instead of the in-process `node-cron` it replaces. The database is Neon Postgres (external, reached over its pooled connection string) rather than RDS, specifically because RDS's free tier expires after 12 months and this must stay free indefinitely.

**Tech Stack:** Node.js 22.x (Lambda runtime), Express 5, Prisma 7 with `@prisma/adapter-pg`, `serverless-http`, Vitest (new backend tests), AWS CDK (Python), GitHub Actions (OIDC-federated deploys).

**Spec:** `docs/superpowers/specs/2026-09-05-aws-migration-design.md`

## Global Constraints

- $0 recurring AWS cost at this app's traffic level: no RDS, no NAT Gateway, no ALB, no Cloudflare API integration.
- Database is Neon Postgres, reached via its **pooled** connection string, not the direct one.
- Lambda runtime is Node.js 22.x.
- `backend/prisma/schema.prisma`'s `generator client` block gets `binaryTargets = ["native", "rhel-openssl-3.0.x"]`.
- No data migration — the Neon database starts empty; schema comes from `npx prisma db push` (this project has no `prisma/migrations/` history — it has always used the schema-push workflow, matching its own README's documented setup).
- CDK is Python, in a new `infra/` directory at the repo root, matching the portfolio site's own stack for a consistent toolchain.
- GitHub Actions deploys via OIDC role assumption — no long-lived AWS access keys stored as repo secrets.
- DNS stays on Cloudflare. No record changes are automated; they're a documented manual step.
- New backend tests use Vitest. Do not retrofit tests onto the pre-existing Express app's untested routes — only new migration code gets covered.
- `backend/src/server.ts` keeps working for local dev (`npm run dev`) exactly as it does today; it is not the Lambda entry point.

## Amendment (mid-migration): Stripe/paywall removed; Lambda is a container image, not a zip

Two changes made after Tasks 1-9 were already underway, both reflected in the task text below and superseding anything in Tasks 10-14 that still refers to the old state:

1. **Stripe and the whole trial/subscription system were removed from the application itself** (a separate, explicitly-approved change — DonorTrack is now free to use, no paywall, no plans). This means:
   - `backend/src/cron.ts` (Task 2's extraction) no longer exists — there's no more trial-reminder job to run, so it was deleted rather than deployed.
   - **Task 10 (cron Lambda + EventBridge rule) is void.** There is nothing left to schedule. Do not execute it if resuming this plan from a stale checkpoint.
   - `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` are gone from the SSM parameter list, the Lambda's environment variables, and Task 14's runbook.
2. **The Lambda is a container image (`DockerImageFunction`), not a zip package (`Function` + `Code.from_asset`).** Reason: `@prisma/client` (v7.4.0) unconditionally bundles WASM query compilers for every database Prisma supports (Postgres, MySQL, SQLite, SQL Server, CockroachDB) — roughly 45MB+ on its own, regardless of `schema.prisma`'s `binaryTargets` setting, which turned out to have no effect on this at all (Prisma's WASM-based architecture doesn't use the native per-platform binaries that setting used to control). A production-only zip build still measured 386MB — over Lambda's 250MB *unzipped* limit for zip packages. Container images have a 10GB limit instead, which this comfortably fits.
   - `backend/Dockerfile` (multi-stage: full deps to compile TypeScript, then a production-only-deps final stage) replaces the old `build:lambda` npm script and the `dist-lambda`/`dist-lambda-install` two-step copy dance entirely — Docker's own layer caching handles the prod/dev dependency split cleanly, which also sidesteps the disk-space fragility the manual copy approach had.
   - `backend/package.json`'s `build:lambda` script was removed — there's nothing left to build outside of `cdk deploy` itself, which builds the Docker image as part of asset bundling.
   - **This needs Docker.** `cdk deploy`/`cdk synth` on a machine without Docker installed will fail when it reaches the `DockerImageFunction`'s asset bundling step. GitHub Actions' `ubuntu-latest` runners have Docker pre-installed, so CI is unaffected. For *local* CDK unit tests specifically (`pytest` in `infra/`), the test file sets the `aws:cdk:bundling-stacks` context to an empty list — CDK's documented escape hatch to skip asset bundling (Docker build included) entirely, so `pytest` passes with or without Docker installed locally. Real `cdk deploy` still needs real Docker, on whatever machine/CI runs it.
   - Minor ongoing-cost note: CDK pushes the built image to its own bootstrap-managed ECR asset repository. A single image here is small enough (comfortably under ECR's Always Free 500MB/month tier) that this doesn't cost anything at the traffic/deploy-frequency this app sees, but if deploys become very frequent over a long period, an ECR lifecycle policy trimming old image versions would be a reasonable future hardening — not needed now.

---

### Task 1: Backend test harness (Vitest)

**Files:**
- Modify: `backend/package.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (from `backend/`) runs Vitest once and exits — every later backend task's tests run through this.

- [ ] **Step 1: Install Vitest**

```bash
cd backend
npm install -D vitest
```

- [ ] **Step 2: Add the test script**

In `backend/package.json`'s `"scripts"` block, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Add a minimal Vitest config**

Create `backend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Write a smoke test to confirm the harness works**

Create `backend/src/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test` (from `backend/`)
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/vitest.config.ts backend/src/smoke.test.ts
git commit -m "Add Vitest test harness to the backend"
```

---

### Task 2: Extract the cron job into its own Lambda-shaped handler

**Files:**
- Create: `backend/src/cron.ts`
- Create: `backend/src/cron.test.ts`
- Modify: `backend/src/server.ts:1-88` (remove the `cron.schedule(...)` block; `app.listen` stays)

**Interfaces:**
- Consumes: `sendTrialReminderEmail(email: string, orgName: string, trialEndsAt: Date, daysLeft: number): Promise<void>` from `backend/src/routes/stripe.ts` (already exported, unchanged). `prisma` default export from `backend/src/prisma.ts` (unchanged).
- Produces: `export const handler = async (): Promise<void>` in `backend/src/cron.ts` — Task 10's EventBridge rule invokes this directly by name (`cron.handler`).

- [ ] **Step 1: Write the failing test**

Create `backend/src/cron.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
const updateMock = vi.fn();
const sendTrialReminderEmailMock = vi.fn();

vi.mock("./prisma", () => ({
  default: {
    organization: {
      findMany: findManyMock,
      update: updateMock,
    },
  },
}));

vi.mock("./routes/stripe", () => ({
  sendTrialReminderEmail: sendTrialReminderEmailMock,
}));

describe("cron handler", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset();
    sendTrialReminderEmailMock.mockReset();
  });

  it("sends a 3-day reminder and marks it sent", async () => {
    const trialEndsAt = new Date();
    findManyMock
      .mockResolvedValueOnce([
        {
          id: "org-1",
          name: "Test Org",
          trialEndsAt,
          user: { email: "owner@example.com" },
        },
      ])
      .mockResolvedValueOnce([]); // 1-day query returns none

    const { handler } = await import("./cron");
    await handler();

    expect(sendTrialReminderEmailMock).toHaveBeenCalledWith(
      "owner@example.com",
      "Test Org",
      trialEndsAt,
      3,
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { trialReminder3Sent: true },
    });
  });

  it("sends a 1-day reminder and marks it sent", async () => {
    const trialEndsAt = new Date();
    findManyMock
      .mockResolvedValueOnce([]) // 3-day query returns none
      .mockResolvedValueOnce([
        {
          id: "org-2",
          name: "Other Org",
          trialEndsAt,
          user: { email: "owner2@example.com" },
        },
      ]);

    const { handler } = await import("./cron");
    await handler();

    expect(sendTrialReminderEmailMock).toHaveBeenCalledWith(
      "owner2@example.com",
      "Other Org",
      trialEndsAt,
      1,
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "org-2" },
      data: { trialReminder1Sent: true },
    });
  });

  it("does not throw when an individual org's email send fails", async () => {
    findManyMock
      .mockResolvedValueOnce([
        {
          id: "org-3",
          name: "Failing Org",
          trialEndsAt: new Date(),
          user: { email: "fails@example.com" },
        },
      ])
      .mockResolvedValueOnce([]);
    sendTrialReminderEmailMock.mockRejectedValueOnce(new Error("send failed"));

    const { handler } = await import("./cron");
    await expect(handler()).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- cron.test.ts` (from `backend/`)
Expected: FAIL — `backend/src/cron.ts` doesn't exist yet.

- [ ] **Step 3: Create the handler**

Create `backend/src/cron.ts` — this is the exact body of the `cron.schedule` callback from `server.ts`, with the schedule wrapper removed and exported directly as `handler`:

```ts
import prisma from "./prisma";
import { sendTrialReminderEmail } from "./routes/stripe";

// window: N days from now (±30 min to handle timing drift), same as the
// original node-cron job this replaces.
function window(days: number) {
  const now = new Date();
  return {
    gte: new Date(now.getTime() + (days - 1) * 24 * 60 * 60 * 1000),
    lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

export const handler = async (): Promise<void> => {
  console.log("[cron] Running trial reminder check...");

  try {
    const orgs3 = await prisma.organization.findMany({
      where: {
        subscriptionStatus: "TRIALING",
        trialEndsAt: window(3),
        trialReminder3Sent: false,
      },
      include: { user: { select: { email: true } } },
    });

    for (const org of orgs3) {
      if (!org.trialEndsAt || !org.user?.email) continue;
      try {
        await sendTrialReminderEmail(org.user.email, org.name, org.trialEndsAt, 3);
        await prisma.organization.update({ where: { id: org.id }, data: { trialReminder3Sent: true } });
        console.log(`[cron] Sent 3-day reminder to ${org.user.email}`);
      } catch (err) {
        console.error(`[cron] Failed 3-day reminder for org ${org.id}:`, err);
      }
    }

    const orgs1 = await prisma.organization.findMany({
      where: {
        subscriptionStatus: "TRIALING",
        trialEndsAt: window(1),
        trialReminder1Sent: false,
      },
      include: { user: { select: { email: true } } },
    });

    for (const org of orgs1) {
      if (!org.trialEndsAt || !org.user?.email) continue;
      try {
        await sendTrialReminderEmail(org.user.email, org.name, org.trialEndsAt, 1);
        await prisma.organization.update({ where: { id: org.id }, data: { trialReminder1Sent: true } });
        console.log(`[cron] Sent 1-day reminder to ${org.user.email}`);
      } catch (err) {
        console.error(`[cron] Failed 1-day reminder for org ${org.id}:`, err);
      }
    }

    console.log(`[cron] Done. Sent ${orgs3.length} 3-day and ${orgs1.length} 1-day reminders.`);
  } catch (err) {
    console.error("[cron] Trial reminder job failed:", err);
  }
};
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- cron.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Remove the now-duplicated logic from server.ts**

In `backend/src/server.ts`, delete the `import cron from "node-cron";`, `import { sendTrialReminderEmail } from "./routes/stripe";`, and the entire `cron.schedule("0 9 * * *", async () => { ... });` block (everything from that line to the end of the file). `server.ts` should end right after the `app.listen(...)` block:

```ts
import dotenv from "dotenv";

dotenv.config();

import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
});

import app from "./app";
import { validateEnv, config } from "./config/env";

validateEnv();

app.listen(config.server.port, () => {
  console.log(`DonorTrack API running on http://localhost:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
});
```

- [ ] **Step 6: Confirm local dev still starts cleanly**

Run: `npm run dev` (from `backend/`, with a valid `.env`)
Expected: starts and logs "DonorTrack API running..." with no cron-related errors. Stop it (Ctrl+C) once confirmed.

- [ ] **Step 7: Commit**

```bash
git add backend/src/cron.ts backend/src/cron.test.ts backend/src/server.ts
git commit -m "Extract the trial-reminder cron job into its own handler"
```

---

### Task 3: Lambda entry point for the API (serverless-http)

**Files:**
- Modify: `backend/package.json` (add `serverless-http` dependency)
- Create: `backend/src/lambda.ts`
- Create: `backend/src/lambda.test.ts`

**Interfaces:**
- Consumes: the default-exported Express `app` from `backend/src/app.ts` (unchanged).
- Produces: `export const handler` in `backend/src/lambda.ts`, an AWS Lambda handler function — Task 9's CDK Lambda resource points at `lambda.handler`.

- [ ] **Step 1: Install serverless-http**

```bash
cd backend
npm install serverless-http
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/lambda.test.ts`. This constructs a minimal API Gateway HTTP API (payload format 2.0) proxy event by hand — the same shape API Gateway actually sends — and asserts the health-check route round-trips correctly through the full Lambda wrapper:

```ts
import { describe, expect, it } from "vitest";
import { handler } from "./lambda";

function apiGatewayEvent(overrides: Partial<any> = {}) {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/health",
    rawQueryString: "",
    headers: { host: "example.com" },
    requestContext: {
      http: {
        method: "GET",
        path: "/api/health",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
      },
      requestId: "test-request-id",
      routeKey: "$default",
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    ...overrides,
  };
}

describe("lambda handler", () => {
  it("round-trips a plain GET route through API Gateway's v2 proxy shape", async () => {
    const result: any = await handler(apiGatewayEvent(), {} as any, () => {});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe("ok");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test -- lambda.test.ts`
Expected: FAIL — `backend/src/lambda.ts` doesn't exist yet.

- [ ] **Step 4: Create the handler**

Create `backend/src/lambda.ts`. Deliberately does **not** call `validateEnv()` — that function calls `process.exit(1)` on a missing var, which is safe in a long-running server process but would abruptly kill a live Lambda execution environment instead of returning a clean error:

```ts
import serverlessHttp from "serverless-http";
import app from "./app";

export const handler = serverlessHttp(app);
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- lambda.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/lambda.ts backend/src/lambda.test.ts
git commit -m "Add a Lambda entry point wrapping the Express app"
```

---

### Task 4: Stripe webhook raw-body signature test through the Lambda wrapper

This is the highest-risk integration point in the whole migration (see spec) — API Gateway's proxy event carries the body as a string (or base64), and it has to reach `stripe.webhooks.constructEvent` as the exact bytes Stripe signed, or every webhook fails signature verification in production without a matching local failure to catch it first.

**Files:**
- Create: `backend/src/stripeWebhook.lambda.test.ts`

**Interfaces:**
- Consumes: `handler` from `backend/src/lambda.ts` (Task 3). `STRIPE_WEBHOOK_SECRET` env var (test sets its own value).

- [ ] **Step 1: Write the test**

This test builds a real Stripe-signed payload using Stripe's own test helper (`stripe.webhooks.generateTestHeaderString`, available in the `stripe` package already installed), sends it through `handler` exactly as API Gateway would (raw string body, `isBase64Encoded: false`, and again as a base64 string with `isBase64Encoded: true`, since real API Gateway base64-encodes certain content depending on binary media type configuration — both must work), and asserts the webhook is accepted rather than rejected for a bad signature.

Create `backend/src/stripeWebhook.lambda.test.ts`:

```ts
import { describe, expect, it, beforeAll } from "vitest";
import Stripe from "stripe";

const WEBHOOK_SECRET = "whsec_test_secret_for_lambda_raw_body_check";

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

function signedEvent(payload: string) {
  const stripe = new Stripe("sk_test_dummy_key_not_used_for_signing");
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return header;
}

function apiGatewayWebhookEvent(rawBody: string, base64Encode: boolean) {
  const payload = base64Encode ? Buffer.from(rawBody).toString("base64") : rawBody;
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/stripe/webhook",
    rawQueryString: "",
    headers: {
      host: "example.com",
      "content-type": "application/json",
      "stripe-signature": signedEvent(rawBody),
    },
    requestContext: {
      http: { method: "POST", path: "/api/stripe/webhook", protocol: "HTTP/1.1", sourceIp: "127.0.0.1" },
      requestId: "test-request-id",
      routeKey: "$default",
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: payload,
    isBase64Encoded: base64Encode,
  };
}

describe("Stripe webhook raw body through the Lambda wrapper", () => {
  const rawBody = JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test", metadata: {}, customer: null, subscription: null } },
  });

  it("accepts a correctly-signed webhook sent as a plain string body", async () => {
    const { handler } = await import("./lambda");
    const result: any = await handler(apiGatewayWebhookEvent(rawBody, false), {} as any, () => {});

    // A signature failure returns 400 with "Webhook Error" text from Stripe's
    // SDK; a real handler error (e.g. no matching organization) returns 500.
    // Either is fine here — what this test guards is specifically that the
    // signature check itself did not fail.
    expect(result.statusCode).not.toBe(400);
  });

  it("accepts a correctly-signed webhook sent as a base64-encoded body", async () => {
    const { handler } = await import("./lambda");
    const result: any = await handler(apiGatewayWebhookEvent(rawBody, true), {} as any, () => {});

    expect(result.statusCode).not.toBe(400);
  });

  it("still rejects a genuinely bad signature (the test isn't accepting everything)", async () => {
    const event = apiGatewayWebhookEvent(rawBody, false);
    event.headers["stripe-signature"] = "t=1,v1=deadbeef";

    const { handler } = await import("./lambda");
    const result: any = await handler(event, {} as any, () => {});

    expect(result.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm test -- stripeWebhook.lambda.test.ts`
Expected: initially likely FAIL on the base64 case (the exact failure mode this task exists to catch) — if `serverless-http` isn't reconstructing the base64 body into the raw bytes `express.raw()` expects, the signature check fails and the first two assertions see `statusCode === 400`.

- [ ] **Step 3: Fix the raw-body handling if the base64 case fails**

If Step 2 fails on the base64-encoded case, configure `serverless-http` to treat the Stripe webhook content type as binary so it decodes the body to a `Buffer` before Express sees it, rather than leaving it as a string. Update `backend/src/lambda.ts`:

```ts
import serverlessHttp from "serverless-http";
import app from "./app";

export const handler = serverlessHttp(app, {
  binary: ["application/json"],
});
```

If the plain-string (non-base64) case fails instead, the issue is that `serverless-http` is handing Express a JS string rather than a `Buffer` for `express.raw()` — in that case, keep the `binary` option above regardless, since it also fixes this case by making `serverless-http` treat matching content types as binary uniformly for both encodings.

**What actually happened when this task ran:** neither case failed for this reason — both initially failed for an unrelated cause (a missing `STRIPE_SECRET_KEY` in the test environment), and once that was fixed, all three assertions passed with `lambda.ts` completely unchanged. The `binary` option above was tried and found to break `serverless-http@4.0.0`'s outgoing response encoding (it base64-encodes every JSON response, not just the webhook's), so it was **not** applied. `lambda.ts` stays exactly as Task 3 left it. Task 11 (later) must not reintroduce this option.

- [ ] **Step 4: Re-run to confirm all three tests pass**

Run: `npm test -- stripeWebhook.lambda.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Re-run Task 3's test too, to confirm the binary option didn't break plain JSON routes**

Run: `npm test -- lambda.test.ts`
Expected: still PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lambda.ts backend/src/stripeWebhook.lambda.test.ts
git commit -m "Fix and test Stripe webhook raw-body handling through API Gateway"
```

---

### Task 5: Prisma binary target for the Lambda runtime

**Files:**
- Modify: `backend/prisma/schema.prisma:1-3`

**Interfaces:**
- Produces: a `prisma generate` run from a normal dev machine now also emits an `rhel-openssl-3.0.x`-targeted query engine binary alongside the native one — Task 12's build step relies on this binary being present in the folder it zips for Lambda.

- [ ] **Step 1: Add the binary target**

In `backend/prisma/schema.prisma`, change:

```prisma
generator client {
  provider = "prisma-client-js"
}
```

to:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

- [ ] **Step 2: Regenerate the client and confirm both binaries are produced**

```bash
cd backend
npx prisma generate
```

Expected output includes a line for each target, e.g. `Generated Prisma Client ... to ./node_modules/@prisma/client` with no errors, and `node_modules/.prisma/client/` contains a `libquery_engine-rhel-openssl-3.0.x.so.node` file in addition to the native one.

- [ ] **Step 3: Confirm the existing test suite still passes**

Run: `npm test` (from `backend/`)
Expected: all tests from Tasks 1-4 still PASS — this change doesn't touch runtime code, only what `prisma generate` emits.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "Add the Lambda-compatible Prisma binary target"
```

---

### Task 6: Point the backend at Neon

This task is mostly manual (creating an external account/resource), plus one small code note.

**Files:**
- None (env-var only; `backend/src/prisma.ts` already reads `DATABASE_URL` generically and needs no code change).

- [ ] **Step 1: Create a Neon project**

At https://neon.tech, sign in (or sign up — no card required for the free tier) and create a new project named `donortrack`. Neon provisions a default database and branch automatically.

- [ ] **Step 2: Get the pooled connection string**

In the Neon project's dashboard, find the connection string and make sure **"Pooled connection"** is toggled on (Neon's UI has this as a switch or a separate "Pooler" tab) before copying it — this routes through Neon's built-in PgBouncer, which is what a Lambda-invoked backend (many short-lived connections) needs; the direct (unpooled) string will exhaust Neon's connection limit under concurrent invocations. It looks like `postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require`.

- [ ] **Step 3: Run migrations against it**

```bash
cd backend
DATABASE_URL="<pooled connection string from step 2>" npx prisma db push
```

(Note: this project has no `prisma/migrations/` directory — it has always used `db push`, not migration files, matching its own README's setup instructions. `prisma migrate deploy` reports "No migration found in prisma/migrations" and does nothing, which looks like success but isn't — use `db push`.)

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 4: Sanity-check the schema landed**

```bash
DATABASE_URL="<pooled connection string>" npx prisma db pull --print
```

Expected: prints a schema matching `backend/prisma/schema.prisma`'s models (User, Organization, Donor, Donation, Fund, TaxLetter, etc.) — confirms the tables actually exist on Neon, not just that the migrate command exited 0.

- [ ] **Step 5: Note the connection string for Task 9**

Keep the pooled connection string on hand (e.g. in a password manager) — Task 9 stores it in SSM Parameter Store as `DATABASE_URL`. Do not commit it anywhere in the repo.

---

### Task 7: CDK project scaffold

**Files:**
- Create: `infra/app.py`
- Create: `infra/cdk.json`
- Create: `infra/requirements.txt`
- Create: `infra/infra/__init__.py`
- Create: `infra/infra/infra_stack.py`
- Create: `infra/tests/__init__.py`
- Create: `infra/tests/unit/__init__.py`
- Create: `infra/tests/unit/test_infra_stack.py`

**Interfaces:**
- Produces: a synthesizable, empty `DonortrackStack` in `infra/infra/infra_stack.py` — Tasks 8-10 each add resources to this same stack.

- [ ] **Step 1: Scaffold with the CDK CLI**

```bash
mkdir infra
cd infra
cdk init app --language python
```

- [ ] **Step 2: Rename the stack to match this project**

`cdk init` names things after the directory (likely `InfraStack` in `infra_stack.py`). Rename the class to `DonortrackStack` in `infra/infra/infra_stack.py`, and update `infra/app.py` to match:

```python
#!/usr/bin/env python3
import aws_cdk as cdk

from infra.infra_stack import DonortrackStack

app = cdk.App()
DonortrackStack(
    app,
    "DonortrackStack",
    env=cdk.Environment(
        account=app.node.try_get_context("account"),
        region="us-east-1",  # CloudFront's ACM cert must be us-east-1
    ),
)
app.synth()
```

```python
# infra/infra/infra_stack.py
from aws_cdk import Stack
from constructs import Construct


class DonortrackStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
```

- [ ] **Step 3: Install Python dependencies**

```bash
cd infra
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install pytest
pip freeze > requirements-dev.txt
```

- [ ] **Step 4: Write a trivial synth test**

Create `infra/tests/unit/test_infra_stack.py`:

```python
import aws_cdk as cdk
from aws_cdk.assertions import Template

from infra.infra_stack import DonortrackStack


def test_stack_synthesizes():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    assert template is not None
```

- [ ] **Step 5: Run it**

Run: `pytest` (from `infra/`, with `.venv` activated)
Expected: 1 passed.

- [ ] **Step 6: Confirm synth works via the CLI too**

Run: `cdk synth` (from `infra/`)
Expected: prints a CloudFormation template with no resources yet, no errors.

- [ ] **Step 7: Commit**

```bash
git add infra/
git commit -m "Scaffold the CDK infra project"
```

---

### Task 8: Frontend stack — S3 + CloudFront

**Files:**
- Modify: `infra/infra/infra_stack.py`
- Modify: `infra/tests/unit/test_infra_stack.py`

**Interfaces:**
- Produces: `self.frontend_bucket` (an `s3.Bucket`) and `self.distribution` (a `cloudfront.Distribution`) as attributes on `DonortrackStack` — Task 9 adds the `/api/*` behavior to `self.distribution`, and Task 13's GitHub Actions workflow reads the bucket name and distribution ID from CDK's stack outputs.

- [ ] **Step 1: Write the failing test**

Add to `infra/tests/unit/test_infra_stack.py`:

```python
def test_frontend_bucket_blocks_public_access():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            }
        },
    )


def test_cloudfront_distribution_exists():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.resource_count_is("AWS::CloudFront::Distribution", 1)
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest` (from `infra/`)
Expected: FAIL — no S3 bucket or CloudFront distribution exists yet.

- [ ] **Step 3: Add the resources**

In `infra/infra/infra_stack.py`:

```python
from aws_cdk import Stack, RemovalPolicy, Duration
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from constructs import Construct


class DonortrackStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.frontend_bucket = s3.Bucket(
            self,
            "FrontendBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    self.frontend_bucket
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
            ],
        )
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pytest` (from `infra/`)
Expected: PASS (3 tests: the Task 7 synth test plus these two).

- [ ] **Step 5: Commit**

```bash
git add infra/infra/infra_stack.py infra/tests/unit/test_infra_stack.py
git commit -m "Add the S3+CloudFront frontend stack"
```

---

### Task 9: Backend stack — Lambda + API Gateway + SSM secrets

**Files:**
- Modify: `infra/infra/infra_stack.py`
- Modify: `infra/tests/unit/test_infra_stack.py`

**Interfaces:**
- Consumes: `backend/src/lambda.ts`'s exported `handler` (Task 3) via a pre-built deployment folder at `backend/dist-lambda/` (Task 12 defines the build script that produces it; Task 13's CI workflow runs that script before `cdk deploy`). It doesn't exist yet locally and that's fine for `cdk synth`/tests, which only reference the *path*, not its contents.
- Consumes: `self.distribution` from Task 8.
- Produces: `self.api_lambda` (an `lambda_.Function`) and an API Gateway HTTP API wired to CloudFront's `/api/*` behavior.

- [ ] **Step 1: Write the failing test**

Add to `infra/tests/unit/test_infra_stack.py`:

```python
def test_api_lambda_uses_node_22_runtime():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "nodejs22.x", "Handler": "lambda.handler"},
    )


def test_ssm_parameters_granted_to_lambda_role():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": Match.array_with(
                    [
                        Match.object_like(
                            {
                                "Action": "ssm:GetParameter",
                            }
                        )
                    ]
                )
            }
        },
    )
```

Add the `Match` import at the top of the test file:

```python
from aws_cdk.assertions import Template, Match
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest` (from `infra/`)
Expected: FAIL — no Lambda function exists yet.

- [ ] **Step 3: Add the SSM parameters, Lambda, and API Gateway**

In `infra/infra/infra_stack.py`, add these imports:

```python
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_apigatewayv2_integrations as apigwv2_integrations
from aws_cdk import aws_iam as iam
```

Add, inside `__init__` after the CloudFront block:

```python
        # Secrets, referenced by name at deploy time — the actual values are
        # populated once, manually, via `aws ssm put-parameter` (see the
        # runbook in Task 13). CDK only needs to know the names exist so it
        # can grant the Lambda read access; it never sees the values.
        secret_param_names = [
            "/donortrack/database-url",
            "/donortrack/jwt-secret",
            "/donortrack/stripe-secret-key",
            "/donortrack/stripe-webhook-secret",
            "/donortrack/resend-api-key",
            "/donortrack/sentry-dsn",
        ]

        self.api_lambda = lambda_.Function(
            self,
            "ApiFunction",
            runtime=lambda_.Runtime.NODEJS_22_X,
            handler="lambda.handler",
            code=lambda_.Code.from_asset("../backend/dist-lambda"),
            timeout=Duration.seconds(28),
            memory_size=512,
            environment={
                "NODE_ENV": "production",
                "PORT": "3000",
                "JWT_EXPIRES_IN": "7d",
                "FRONTEND_URL": "https://www.donortrackapp.com",
                "DATABASE_URL_PARAM": "/donortrack/database-url",
                "JWT_SECRET_PARAM": "/donortrack/jwt-secret",
                "STRIPE_SECRET_KEY_PARAM": "/donortrack/stripe-secret-key",
                "STRIPE_WEBHOOK_SECRET_PARAM": "/donortrack/stripe-webhook-secret",
                "RESEND_API_KEY_PARAM": "/donortrack/resend-api-key",
                "SENTRY_DSN_PARAM": "/donortrack/sentry-dsn",
            },
        )

        # Granting `ssm:GetParameter` directly by constructed ARN, rather than
        # via `StringParameter.from_secure_string_parameter_attributes` (which
        # in some CDK versions requires pinning a `version` number just to
        # grant read access, not only to resolve the value at synth time) —
        # this way needs no version and works purely from the parameter name.
        self.api_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter{name}"
                    for name in secret_param_names
                ],
            )
        )

        http_api = apigwv2.HttpApi(
            self,
            "HttpApi",
            default_integration=apigwv2_integrations.HttpLambdaIntegration(
                "ApiIntegration", self.api_lambda
            ),
        )

        self.distribution.add_behavior(
            "/api/*",
            origins.HttpOrigin(
                f"{http_api.http_api_id}.execute-api.{self.region}.amazonaws.com"
            ),
            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
            cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
            origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        )
```

Note on the `environment` block: it stores SSM *parameter names*, not secret values — `backend/src/lambda.ts`'s cold-start path (Task 11) fetches and caches the actual values from SSM at runtime, the same pattern the portfolio's assistant Lambda already uses for its Gemini key.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pytest` (from `infra/`)
Expected: PASS (5 tests total).

- [ ] **Step 5: Confirm synth still works end to end**

Run: `cdk synth` (from `infra/`)
Expected: succeeds even though `../backend/dist-lambda` doesn't exist on disk yet — `Code.from_asset` only needs the path to exist at **deploy** time, not synth time, as long as the directory itself is present. If synth fails with a "not found" error, create an empty placeholder directory for now: `mkdir -p ../backend/dist-lambda && touch ../backend/dist-lambda/.gitkeep`.

- [ ] **Step 6: Commit**

```bash
git add infra/infra/infra_stack.py infra/tests/unit/test_infra_stack.py
git commit -m "Add the Lambda + API Gateway backend stack"
```

---

### Task 10: Cron Lambda + EventBridge rule — VOID, do not execute

See the Amendment above: Stripe/trials were removed from the app entirely, so there is no more trial-reminder job to schedule. `backend/src/cron.ts` was deleted rather than deployed. Skip straight to Task 11.

<details>
<summary>Original task text (kept for history only)</summary>



**Files:**
- Modify: `infra/infra/infra_stack.py`
- Modify: `infra/tests/unit/test_infra_stack.py`

**Interfaces:**
- Consumes: `backend/src/cron.ts`'s exported `handler` (Task 2), via the same `backend/dist-lambda/` build output as Task 9 (both Lambdas package from the same built backend folder — the API Lambda's handler is `lambda.handler`, the cron Lambda's is `cron.handler`).

- [ ] **Step 1: Write the failing test**

Add to `infra/tests/unit/test_infra_stack.py`:

```python
def test_cron_rule_runs_daily_at_9am_utc():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::Events::Rule",
        {"ScheduleExpression": "cron(0 9 * * ? *)"},
    )
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest` (from `infra/`)
Expected: FAIL — no EventBridge rule exists yet.

- [ ] **Step 3: Add the cron Lambda and rule**

Add these imports to `infra/infra/infra_stack.py`:

```python
from aws_cdk import aws_events as events
from aws_cdk import aws_events_targets as events_targets
```

Add, inside `__init__`, after the API Gateway block:

```python
        self.cron_lambda = lambda_.Function(
            self,
            "CronFunction",
            runtime=lambda_.Runtime.NODEJS_22_X,
            handler="cron.handler",
            code=lambda_.Code.from_asset("../backend/dist-lambda"),
            timeout=Duration.seconds(60),
            memory_size=512,
            environment={
                "NODE_ENV": "production",
                "DATABASE_URL_PARAM": "/donortrack/database-url",
                "RESEND_API_KEY_PARAM": "/donortrack/resend-api-key",
                "FRONTEND_URL": "https://www.donortrackapp.com",
            },
        )

        self.cron_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter{name}"
                    for name in ["/donortrack/database-url", "/donortrack/resend-api-key"]
                ],
            )
        )

        events.Rule(
            self,
            "TrialReminderSchedule",
            schedule=events.Schedule.cron(minute="0", hour="9"),
            targets=[events_targets.LambdaFunction(self.cron_lambda)],
        )
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pytest` (from `infra/`)
Expected: PASS (6 tests total).

- [ ] **Step 5: Confirm synth still works**

Run: `cdk synth` (from `infra/`)
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add infra/infra/infra_stack.py infra/tests/unit/test_infra_stack.py
git commit -m "Add the cron Lambda and its daily EventBridge schedule"
```


</details>

---

### Task 11: SSM-backed secrets loading at Lambda runtime

Task 9 wired SSM *parameter names* into the Lambda's environment variables. This task makes the Lambda code actually read the real values from those parameters at cold start and populate `process.env` before `app.ts` (which reads `process.env.DATABASE_URL` etc. directly) is imported.

**Files:**
- Modify: `backend/src/lambda.ts`
- Modify: `backend/src/cron.ts`
- Create: `backend/src/loadSecrets.ts`
- Create: `backend/src/loadSecrets.test.ts`
- Modify: `backend/package.json` (add `@aws-sdk/client-ssm`)

**Interfaces:**
- Produces: `export async function loadSecrets(): Promise<void>` in `backend/src/loadSecrets.ts` — fetches each `*_PARAM`-named env var's target SSM parameter and assigns the plain env var (`DATABASE_URL`, `JWT_SECRET`, etc.) that the rest of the app already reads unchanged.

- [ ] **Step 1: Install the SSM SDK**

```bash
cd backend
npm install @aws-sdk/client-ssm
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/loadSecrets.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: vi.fn(() => ({ send: sendMock })),
  GetParameterCommand: vi.fn((input) => input),
}));

describe("loadSecrets", () => {
  beforeEach(() => {
    sendMock.mockReset();
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL_PARAM = "/donortrack/database-url";
    process.env.JWT_SECRET_PARAM = "/donortrack/jwt-secret";
  });

  afterEach(() => {
    // Without this, these _PARAM env vars can leak into another test file's
    // run (depending on Vitest's pool/isolation mode) — cron.test.ts's
    // handler() also calls loadSecrets(), and cron.test.ts does not mock
    // @aws-sdk/client-ssm, so a leaked *_PARAM var there would make it
    // attempt a real, unmocked AWS SSM network call during tests.
    delete process.env.DATABASE_URL_PARAM;
    delete process.env.JWT_SECRET_PARAM;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
  });

  it("populates plain env vars from their _PARAM-named SSM parameters", async () => {
    sendMock.mockImplementation(async (input: any) => {
      const values: Record<string, string> = {
        "/donortrack/database-url": "postgresql://fake",
        "/donortrack/jwt-secret": "fake-secret",
      };
      return { Parameter: { Value: values[input.Name] } };
    });

    const { loadSecrets } = await import("./loadSecrets");
    await loadSecrets();

    expect(process.env.DATABASE_URL).toBe("postgresql://fake");
    expect(process.env.JWT_SECRET).toBe("fake-secret");
  });

  it("fetches each distinct parameter only once even if loadSecrets is called twice (cold-start cache)", async () => {
    sendMock.mockResolvedValue({ Parameter: { Value: "x" } });

    const { loadSecrets } = await import("./loadSecrets");
    await loadSecrets();
    await loadSecrets();

    expect(sendMock).toHaveBeenCalledTimes(2); // 2 params, not 4
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test -- loadSecrets.test.ts`
Expected: FAIL — `backend/src/loadSecrets.ts` doesn't exist yet.

- [ ] **Step 4: Implement it**

Create `backend/src/loadSecrets.ts`:

```ts
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({});

// Maps the *_PARAM env var (holding an SSM parameter name, set by CDK) to
// the plain env var the rest of the app already reads.
const SECRET_ENV_MAP: Record<string, string> = {
  DATABASE_URL_PARAM: "DATABASE_URL",
  JWT_SECRET_PARAM: "JWT_SECRET",
  STRIPE_SECRET_KEY_PARAM: "STRIPE_SECRET_KEY",
  STRIPE_WEBHOOK_SECRET_PARAM: "STRIPE_WEBHOOK_SECRET",
  RESEND_API_KEY_PARAM: "RESEND_API_KEY",
  SENTRY_DSN_PARAM: "SENTRY_DSN",
};

let loaded = false;

/**
 * Fetches each configured secret from SSM Parameter Store once per Lambda
 * execution environment (cached across warm invocations via the `loaded`
 * flag at module scope), and assigns it to the plain env var name the rest
 * of the app reads. Only parameters whose *_PARAM env var is actually set
 * are fetched, so this is a no-op for anything not wired up in CDK yet.
 */
export async function loadSecrets(): Promise<void> {
  if (loaded) return;

  const entries = Object.entries(SECRET_ENV_MAP).filter(
    ([paramEnvVar]) => process.env[paramEnvVar],
  );

  await Promise.all(
    entries.map(async ([paramEnvVar, targetEnvVar]) => {
      const parameterName = process.env[paramEnvVar]!;
      const result = await client.send(
        new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
      );
      if (result.Parameter?.Value) {
        process.env[targetEnvVar] = result.Parameter.Value;
      }
    }),
  );

  loaded = true;
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- loadSecrets.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire it into both Lambda entry points**

Modify `backend/src/lambda.ts` so secrets are loaded before each invocation (the `loaded` flag inside `loadSecrets` makes every call after the first a no-op, so this costs nothing on warm invocations). **Do not add a `binary: [...]` option to `serverlessHttp(app, ...)`** — Task 4 already established, and its review independently verified from the installed `serverless-http@4.0.0` source, that this option is unneeded for the Stripe raw-body path (it's handled correctly either way) and, worse, that adding it makes `serverless-http` base64-encode every outgoing JSON response, which would break every API endpoint, not just the webhook. Task 4 confirmed `lambda.ts` should stay exactly as Task 3 left it, with no `binary` option:

```ts
import serverlessHttp from "serverless-http";
import app from "./app";
import { loadSecrets } from "./loadSecrets";

const serverlessApp = serverlessHttp(app);

export const handler = async (event: any, context: any) => {
  await loadSecrets();
  return serverlessApp(event, context);
};
```

Modify `backend/src/cron.ts`'s exported `handler` the same way — wrap the existing body so `loadSecrets()` runs first:

```ts
import prisma from "./prisma";
import { sendTrialReminderEmail } from "./routes/stripe";
import { loadSecrets } from "./loadSecrets";

function window(days: number) {
  const now = new Date();
  return {
    gte: new Date(now.getTime() + (days - 1) * 24 * 60 * 60 * 1000),
    lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

export const handler = async (): Promise<void> => {
  await loadSecrets();
  console.log("[cron] Running trial reminder check...");

  try {
    const orgs3 = await prisma.organization.findMany({
      where: {
        subscriptionStatus: "TRIALING",
        trialEndsAt: window(3),
        trialReminder3Sent: false,
      },
      include: { user: { select: { email: true } } },
    });

    for (const org of orgs3) {
      if (!org.trialEndsAt || !org.user?.email) continue;
      try {
        await sendTrialReminderEmail(org.user.email, org.name, org.trialEndsAt, 3);
        await prisma.organization.update({ where: { id: org.id }, data: { trialReminder3Sent: true } });
        console.log(`[cron] Sent 3-day reminder to ${org.user.email}`);
      } catch (err) {
        console.error(`[cron] Failed 3-day reminder for org ${org.id}:`, err);
      }
    }

    const orgs1 = await prisma.organization.findMany({
      where: {
        subscriptionStatus: "TRIALING",
        trialEndsAt: window(1),
        trialReminder1Sent: false,
      },
      include: { user: { select: { email: true } } },
    });

    for (const org of orgs1) {
      if (!org.trialEndsAt || !org.user?.email) continue;
      try {
        await sendTrialReminderEmail(org.user.email, org.name, org.trialEndsAt, 1);
        await prisma.organization.update({ where: { id: org.id }, data: { trialReminder1Sent: true } });
        console.log(`[cron] Sent 1-day reminder to ${org.user.email}`);
      } catch (err) {
        console.error(`[cron] Failed 1-day reminder for org ${org.id}:`, err);
      }
    }

    console.log(`[cron] Done. Sent ${orgs3.length} 3-day and ${orgs1.length} 1-day reminders.`);
  } catch (err) {
    console.error("[cron] Trial reminder job failed:", err);
  }
};
```

**Important — a Prisma wrinkle this introduces:** `backend/src/prisma.ts` constructs its `PrismaClient` (reading `process.env.DATABASE_URL`) at **module import time**, which happens before `loadSecrets()` ever runs inside the handler body. Fix `backend/src/prisma.ts` to construct the client lazily instead, so it isn't built until first use (by which point `loadSecrets()` has already populated `DATABASE_URL`):

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!client) {
    const adapter = new PrismaPg({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/donortrack",
    });
    client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    } as any);
  }
  return client;
}

export default new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});
```

This `Proxy` means every existing call site (`prisma.organization.findMany(...)`, etc., across every route file) keeps working completely unchanged — they're all still just calling `prisma.<model>.<method>(...)` on what looks like a plain client instance, but the real client isn't constructed until the very first property access.

- [ ] **Step 7: Re-run the full backend test suite**

Run: `npm test` (from `backend/`)
Expected: all tests from Tasks 1-4 and this task's own two new tests still PASS. (The `Proxy` change to `prisma.ts` is behavior-preserving for every mocked-`prisma` test from Task 2, since those tests mock the whole `./prisma` module rather than relying on its internal construction timing.)

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/loadSecrets.ts backend/src/loadSecrets.test.ts backend/src/lambda.ts backend/src/cron.ts backend/src/prisma.ts
git commit -m "Load secrets from SSM at Lambda cold start; make the Prisma client lazy"
```

---

### Task 12: Backend Lambda build step — SUPERSEDED by the Docker pivot

See the Amendment above: the Lambda is now a container image built from `backend/Dockerfile` as part of `cdk deploy`'s own asset bundling. There is no separate `dist-lambda`/`build:lambda` step anymore — Docker's own multi-stage build handles compiling TypeScript and installing production-only dependencies. `backend/package.json`'s `build:lambda` script was removed. Nothing here needs executing.

<details>
<summary>Original task text (kept for history only)</summary>



**Files:**
- Modify: `backend/package.json` (add a `build:lambda` script)

**Interfaces:**
- Produces: `backend/dist-lambda/` — a self-contained folder (compiled JS + production `node_modules` + the generated Prisma client) that Tasks 9 and 10's CDK `Code.from_asset("../backend/dist-lambda")` zips up as-is. Task 13's CI workflow runs this script before `cdk deploy`.

- [ ] **Step 1: Add the build script**

In `backend/package.json`'s `"scripts"` block:

```json
"build:lambda": "rm -rf dist-lambda dist-lambda-install && tsc --outDir dist-lambda && mkdir dist-lambda-install && cp package.json package-lock.json dist-lambda-install/ && cd dist-lambda-install && npm ci --omit=dev && PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x npx prisma generate --schema=../prisma/schema.prisma && cd .. && cp -r dist-lambda-install/node_modules dist-lambda/node_modules && cp package.json dist-lambda/package.json && rm -rf dist-lambda-install"
```

**Why not just `cp -r node_modules dist-lambda/node_modules` (the obvious approach)?** Measured directly: copying the full dev-oriented `node_modules` produced a 518MB package — over double Lambda's 250MB unzipped deployment limit, which makes `cdk deploy` fail outright, not just run slower. The bloat is devDependencies that have no business in a deployed Lambda (the `prisma` CLI, `typescript`, and a large chunk pulled in transitively by Vitest) plus an unnecessary second Prisma engine binary for whatever platform ran `npm install` locally. The corrected script installs into an isolated `dist-lambda-install/` directory with `npm ci --omit=dev` (production dependencies only, from the lockfile) and regenerates the Prisma client scoped to only the `rhel-openssl-3.0.x` engine via `PRISMA_CLI_BINARY_TARGETS` — schema.prisma's own `binaryTargets = ["native", "rhel-openssl-3.0.x"]` is unchanged and still serves local dev's own separate `prisma generate` runs.

(On Windows locally, `rm -rf`/`cp -r`/`&&` chains work fine in Git Bash, which is what this environment's shell tool actually runs — no WSL needed here.)

- [ ] **Step 2: Build the deployment package once, from a machine/shell with `rm`/`cp` (or WSL/Git Bash)**

```bash
cd backend
npx prisma generate
npm run build:lambda
```

- [ ] **Step 3: Confirm the package is complete and correctly shaped**

```bash
ls backend/dist-lambda/lambda.js backend/dist-lambda/cron.js
ls backend/dist-lambda/node_modules/.prisma/client/ | grep rhel
du -sh backend/dist-lambda
```

Expected: both compiled entry files exist, the `rhel-openssl-3.0.x` Prisma engine binary (from Task 5) is present in the bundled `node_modules`, and the total size is well under Lambda's 250MB unzipped limit (a clean production-only install with a single Prisma engine target should land well under 200MB for this app — if it's still close to or over the limit, something is still pulling in unnecessary weight and needs investigating before moving on).

- [ ] **Step 4: Re-point CDK's placeholder if Task 9 created one**

If Task 9's Step 5 created `backend/dist-lambda/.gitkeep` as a placeholder, delete it now that a real build exists:

```bash
rm -f backend/dist-lambda/.gitkeep
```

- [ ] **Step 5: Ensure the build output isn't committed**

Add to `backend/.gitignore` (create the file if it doesn't already ignore this):

```
dist-lambda/
```

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/.gitignore
git commit -m "Add the Lambda deployment build script"
```


</details>

---

### Task 13: GitHub Actions — OIDC role, frontend deploy, infra deploy

**Files:**
- Modify: `infra/infra/infra_stack.py` (add the GitHub OIDC IAM role + S3/CloudFront/Lambda deploy permissions)
- Modify: `infra/tests/unit/test_infra_stack.py`
- Create: `.github/workflows/deploy-frontend.yml`
- Create: `.github/workflows/deploy-infra.yml`

**Interfaces:**
- Produces: an IAM role assumable by GitHub Actions via OIDC, whose ARN both workflows reference (via a repo variable, set manually once — see Task 14).

- [ ] **Step 1: Write the failing test**

Add to `infra/tests/unit/test_infra_stack.py`:

```python
def test_github_oidc_role_exists():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::IAM::Role",
        {
            "AssumeRolePolicyDocument": {
                "Statement": Match.array_with(
                    [
                        Match.object_like(
                            {
                                "Action": "sts:AssumeRoleWithWebIdentity",
                            }
                        )
                    ]
                )
            }
        },
    )
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest` (from `infra/`)
Expected: FAIL — no such role exists yet.

- [ ] **Step 3: Add the OIDC provider and role**

`aws_iam` is already imported as `iam` (from Task 9's SSM permission grants) — no new import needed.

Add, inside `__init__`, near the end (after the cron/EventBridge block):

```python
        github_oidc_provider = iam.OpenIdConnectProvider(
            self,
            "GithubOidcProvider",
            url="https://token.actions.githubusercontent.com",
            client_ids=["sts.amazonaws.com"],
        )

        # Replace "jacobotero/DonorTrack" if the repo is ever renamed/moved.
        github_deploy_role = iam.Role(
            self,
            "GithubDeployRole",
            assumed_by=iam.WebIdentityPrincipal(
                github_oidc_provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": "repo:jacobotero/DonorTrack:*"
                    },
                },
            ),
        )

        self.frontend_bucket.grant_read_write(github_deploy_role)
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["cloudfront:CreateInvalidation"],
                resources=["*"],
            )
        )
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "cloudformation:*",
                    "lambda:*",
                    "apigateway:*",
                    "events:*",
                    "iam:*",
                    "ssm:GetParameter*",
                    "s3:*",
                    "cloudfront:*",
                ],
                resources=["*"],
            )
        )

        from aws_cdk import CfnOutput

        CfnOutput(self, "GithubDeployRoleArn", value=github_deploy_role.role_arn)
        CfnOutput(self, "FrontendBucketName", value=self.frontend_bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=self.distribution.distribution_id)
```

The broad `cloudformation:*`/`lambda:*`/etc. grant on the deploy role is intentionally wide (it needs to manage whatever `cdk deploy` touches, which changes as the stack grows) — acceptable here since this role is scoped to being assumable only from this one GitHub repo's Actions runs, not to any human or other service.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pytest` (from `infra/`)
Expected: PASS (8 tests total).

- [ ] **Step 5: Write the frontend deploy workflow**

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy frontend

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install and build
        working-directory: frontend
        run: |
          npm ci
          npm run build

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Sync to S3
        run: aws s3 sync frontend/dist s3://${{ vars.FRONTEND_BUCKET_NAME }} --delete

      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

- [ ] **Step 6: Write the infra deploy workflow**

Create `.github/workflows/deploy-infra.yml`:

```yaml
name: Deploy infra

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "infra/**"
      - "backend/**"

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Test backend
        working-directory: backend
        run: |
          npm ci
          npx prisma generate
          npm test

      - uses: docker/setup-buildx-action@v3

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install CDK
        run: npm install -g aws-cdk

      - name: Install infra dependencies
        working-directory: infra
        run: |
          python -m pip install -r requirements.txt
          python -m pip install -r requirements-dev.txt
          pytest

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy
        working-directory: infra
        run: cdk deploy --require-approval never
```

- [ ] **Step 7: Commit**

```bash
git add infra/infra/infra_stack.py infra/tests/unit/test_infra_stack.py .github/workflows/deploy-frontend.yml .github/workflows/deploy-infra.yml
git commit -m "Add GitHub OIDC deploy role and CI workflows"
```

---

### Task 14: Manual runbook — first real deploy, secrets, DNS

Everything up to here is code. This task is the actual cutover — a checklist of manual actions, run once.

- [ ] **Step 1: Bootstrap CDK in the target AWS account/region (one-time, if not already done for the portfolio)**

```bash
cd infra
cdk bootstrap
```

- [ ] **Step 2: Deploy the stack for the first time, manually, to get real resource names/ARNs**

Docker must be running locally for this (the Lambda is a container image — see the Amendment above):

```bash
cd infra
cdk deploy --require-approval never
```

Note the `GithubDeployRoleArn`, `FrontendBucketName`, and `DistributionId` values CDK prints as stack outputs.

- [ ] **Step 3: Set the GitHub Actions repo variables**

In the repo's GitHub Settings → Secrets and variables → Actions → Variables, add:
- `AWS_DEPLOY_ROLE_ARN` = the `GithubDeployRoleArn` output from Step 2
- `FRONTEND_BUCKET_NAME` = the `FrontendBucketName` output
- `CLOUDFRONT_DISTRIBUTION_ID` = the `DistributionId` output

- [ ] **Step 4: Populate the real secrets in SSM**

Run once per parameter, filling in real values (the Neon pooled connection string from Task 6, and the existing Resend/Sentry credentials from wherever they're currently recorded — the dead Railway project's environment variables, if still visible in the Railway dashboard, or wherever else they were originally generated):

```bash
aws ssm put-parameter --name "/donortrack/database-url" --type SecureString --value "<neon pooled connection string>"
aws ssm put-parameter --name "/donortrack/jwt-secret" --type SecureString --value "<a new random 32+ char secret — do not reuse the old one>"
aws ssm put-parameter --name "/donortrack/resend-api-key" --type SecureString --value "<from Resend dashboard>"
aws ssm put-parameter --name "/donortrack/sentry-dsn" --type SecureString --value "<from Sentry project settings>"
```

- [ ] **Step 5: Deploy the frontend build**

```bash
cd frontend
npm ci
npm run build
aws s3 sync dist s3://<FrontendBucketName from Step 2> --delete
aws cloudfront create-invalidation --distribution-id <DistributionId from Step 2> --paths "/*"
```

- [ ] **Step 6: Smoke-test against CloudFront's own domain, before touching DNS**

CDK's output (or the CloudFront console) gives a domain like `d123abc.cloudfront.net`. Visit it and confirm the frontend loads. Then:
- Sign up for a new test account through the UI, confirm it works end to end (this exercises the database connection, JWT auth, and Resend email).
- Create a donor and a donation.
- Generate a tax letter — every account has access to this now (no plan gating).
- Check CloudWatch Logs for the API Lambda if anything looks off.

- [ ] **Step 7: Cut over DNS in Cloudflare**

In the Cloudflare dashboard for donortrackapp.com, update the `donortrackapp.com` and `www` DNS records to point at the CloudFront distribution's domain name (as a CNAME for `www`; the apex/root record may need Cloudflare's "CNAME flattening," which Cloudflare supports automatically for proxied apex records — if using an A/ALIAS record instead, use Cloudflare's flattening option rather than a raw IP, since CloudFront's IPs aren't static). If Cloudflare's proxy ("orange cloud") is on for these records, switch it to "DNS only" (grey cloud) for the CloudFront target, per the spec's reasoning (avoids double-proxying two CDNs).

- [ ] **Step 8: Confirm the live domain**

Visit `https://www.donortrackapp.com` and repeat the Step 6 smoke tests against the real domain.

- [ ] **Step 9: Leave Vercel and the old Railway project alone for a few days as a fallback**

No action needed — they cost nothing extra to leave stopped/unused. Decommission both once satisfied the new stack is stable.

---

## Self-Review Notes

- **Spec coverage:** every spec section (frontend, backend, cron, database, secrets, IaC/CI, DNS, testing, cost) has a corresponding task above.
- **Type/interface consistency:** `cron.ts`'s `handler` signature (`() => Promise<void>`) is referenced identically in Task 2 (created), Task 9/10 (CDK `handler="cron.handler"`), and Task 11 (wrapped with `loadSecrets()`) — Task 11's final code block is the one that lands in the repo; Task 2's version is what Task 11 edits.
- **Known open risk carried into the runbook, not hidden:** Task 13's `cdk synth` for the OIDC role assumes this AWS account has no pre-existing GitHub OIDC provider (only one is allowed per account across *all* repos/projects using it). If the portfolio site's own CDK stack already created one, `cdk deploy` will fail with an "already exists" error on `AWS::IAM::OIDCProvider`. If that happens, remove the `github_oidc_provider = iam.OpenIdConnectProvider(...)` block from Task 13 and instead reference the existing one: `github_oidc_provider = iam.OpenIdConnectProvider.from_open_id_connect_provider_arn(self, "GithubOidcProvider", "<existing provider ARN>")`.

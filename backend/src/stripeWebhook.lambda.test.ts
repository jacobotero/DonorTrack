import { describe, expect, it, beforeAll } from "vitest";
import Stripe from "stripe";

const WEBHOOK_SECRET = "whsec_test_secret_for_lambda_raw_body_check";

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  // stripe.webhooks.constructEvent is reached through a lazily-initialized
  // Stripe client (backend/src/config/stripe.ts) that throws if
  // STRIPE_SECRET_KEY is unset, before signature verification ever runs.
  // Set a dummy value so the test actually exercises the raw-body/signature
  // path instead of failing earlier for an unrelated reason.
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_not_used_for_signing";
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

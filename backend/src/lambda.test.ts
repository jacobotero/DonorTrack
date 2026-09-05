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
    const bodyText = result.isBase64Encoded
      ? Buffer.from(result.body, "base64").toString("utf-8")
      : result.body;
    const body = JSON.parse(bodyText);
    expect(body.status).toBe("ok");
  });
});

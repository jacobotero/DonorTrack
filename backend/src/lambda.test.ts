import { describe, expect, it } from "vitest";
import express from "express";
import serverlessHttp from "serverless-http";
import { handler, binaryContentTypes } from "./lambda";

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
    const result: any = await handler(apiGatewayEvent(), {} as any);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe("ok");
  });

  it("base64-encodes binary content types (PDF/ZIP downloads) instead of mangling them as UTF-8", async () => {
    // Regression test for a real production bug: serverless-http's default
    // binary-content-type list is empty, so without the `binary` option
    // configured in lambda.ts, every PDF/ZIP response (tax letters, report
    // exports) came back corrupted. Wraps a throwaway app with the *actual*
    // exported list from lambda.ts, so this fails if that list is ever
    // emptied or the option removed, not just if this test's own copy drifts.
    const testApp = express();
    const pdfBytes = Buffer.from("%PDF-1.4 fake pdf bytes", "utf-8");
    testApp.get("/binary", (_req, res) => {
      res.setHeader("Content-Type", "application/pdf");
      res.end(pdfBytes);
    });
    const wrapped = serverlessHttp(testApp, { binary: binaryContentTypes });

    const result: any = await wrapped(
      apiGatewayEvent({ rawPath: "/binary", requestContext: { http: { method: "GET", path: "/binary" } } }),
      {} as any,
    );

    expect(result.isBase64Encoded).toBe(true);
    expect(Buffer.from(result.body, "base64").equals(pdfBytes)).toBe(true);
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: vi.fn(function () {
    return { send: sendMock };
  }),
  GetParameterCommand: vi.fn(function (input) {
    return input;
  }),
}));

describe("loadSecrets", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL_PARAM = "/donortrack/database-url";
    process.env.JWT_SECRET_PARAM = "/donortrack/jwt-secret";
  });

  afterEach(() => {
    // Without this, these _PARAM env vars can leak into another test file's
    // run (depending on Vitest's pool/isolation mode) and make some other,
    // unrelated test attempt a real, unmocked AWS SSM network call.
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

  it("populates the other secrets even when one parameter fetch fails", async () => {
    // Regression test: this is the load-bearing part of the production fix
    // (loadSecrets used to await all fetches in one Promise.all, so one
    // missing/inaccessible parameter — e.g. an intentionally-unpopulated
    // Resend key — took every other secret down with it, and every API
    // request, since this runs before anything else in the Lambda handler).
    sendMock.mockImplementation(async (input: any) => {
      if (input.Name === "/donortrack/database-url") {
        throw new Error("ParameterNotFound");
      }
      return { Parameter: { Value: "fake-secret" } };
    });

    const { loadSecrets } = await import("./loadSecrets");
    await expect(loadSecrets()).resolves.toBeUndefined();

    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.JWT_SECRET).toBe("fake-secret");
  });
});

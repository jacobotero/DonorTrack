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

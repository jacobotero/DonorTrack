import dotenv from "dotenv";

// Load environment variables FIRST, before any other imports
dotenv.config();

// Sentry must be initialized before any other imports so it can instrument them
import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
});

import app from "./app";
import { validateEnv, config } from "./config/env";
import cron from "node-cron";
import prisma from "./prisma";
import { sendTrialReminderEmail } from "./routes/stripe";

// Validate environment variables before starting server
validateEnv();

app.listen(config.server.port, () => {
  console.log(`DonorTrack API running on http://localhost:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
});

// Daily cron job at 9am UTC — sends trial expiry reminder emails
cron.schedule("0 9 * * *", async () => {
  console.log("[cron] Running trial reminder check...");

  const now = new Date();

  // Helper: window for N days from now (±30 min to handle timing drift)
  const window = (days: number) => ({
    gte: new Date(now.getTime() + (days - 1) * 24 * 60 * 60 * 1000),
    lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
  });

  try {
    // 3-day reminder
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

    // 1-day reminder
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
});

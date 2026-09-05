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

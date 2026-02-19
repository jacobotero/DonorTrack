import { Router, Request, Response } from "express";
import { stripe, STRIPE_PLANS } from "../config/stripe";
import { authenticate } from "../middleware/auth";
import prisma from "../prisma";
import { emailService } from "../utils/email";

const router = Router();

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PLUS: "Plus",
};

async function sendPurchaseConfirmationEmail(email: string, orgName: string, plan: string, amount: number) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const planLabel = PLAN_LABELS[plan] || plan;

  await emailService.sendEmail({
    to: email,
    subject: `You're subscribed to DonorTrack ${planLabel}!`,
    text: `Thank you, ${orgName}! Your DonorTrack ${planLabel} plan ($${amount}/month) is now active. Access your dashboard at ${frontendUrl}/app`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #059669;">Subscription Confirmed</h2>
        <p>Thank you, <strong>${orgName}</strong>! Your subscription is now active.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 16px;font-size:14px;color:#6b7280;">Plan</td>
            <td style="padding:10px 16px;font-size:14px;font-weight:600;">DonorTrack ${planLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;font-size:14px;color:#6b7280;">Billing</td>
            <td style="padding:10px 16px;font-size:14px;font-weight:600;">$${amount}/month</td>
          </tr>
        </table>
        <a href="${frontendUrl}/app" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0;">Go to Dashboard</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">You can manage or cancel your subscription at any time from Settings.</p>
      </div>
    `,
  });
}

async function sendCancellationEmail(email: string, orgName: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  await emailService.sendEmail({
    to: email,
    subject: "Your DonorTrack subscription has been canceled",
    text: `Hi ${orgName}, your DonorTrack subscription has been canceled. All your data is safely preserved. You can resubscribe at any time at ${frontendUrl}/upgrade`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #059669;">Subscription Canceled</h2>
        <p>Hi <strong>${orgName}</strong>, your DonorTrack subscription has been canceled.</p>
        <p>Here's what that means:</p>
        <ul style="padding-left:20px;line-height:2;color:#374151;">
          <li>Your account access has ended</li>
          <li><strong>All your data is safely preserved</strong> — donors, donations, tax letters</li>
          <li>You can resubscribe at any time to regain access instantly</li>
        </ul>
        <a href="${frontendUrl}/upgrade" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Resubscribe</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">If you canceled by mistake or have any questions, just resubscribe above — your data will be right where you left it.</p>
      </div>
    `,
  });
}

export async function sendTrialReminderEmail(email: string, orgName: string, trialEndsAt: Date, daysLeft: number) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const endDate = trialEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const urgency = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

  await emailService.sendEmail({
    to: email,
    subject: `Your DonorTrack trial ends ${urgency} — upgrade to keep access`,
    text: `Hi ${orgName}, your free trial ends on ${endDate}. Upgrade now to keep your donors, donations, and tax letters. ${frontendUrl}/app/upgrade`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Your trial ends ${urgency}</h2>
        <p>Hi <strong>${orgName}</strong>, your free trial ends on <strong>${endDate}</strong>.</p>
        <p>After that, you'll lose access to your account — but all your data will be safely preserved the moment you upgrade.</p>
        <p>Choose a plan that fits your organization:</p>
        <ul style="padding-left:20px;line-height:2;color:#374151;">
          <li><strong>Starter — $29/mo</strong> · Up to 100 donors, all core features</li>
          <li><strong>Growth — $59/mo</strong> · Up to 500 donors, tax letter generation</li>
          <li><strong>Plus — $99/mo</strong> · Unlimited donors, all features</li>
        </ul>
        <a href="${frontendUrl}/app/upgrade" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Upgrade Now</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">No credit card was required during your trial. You only pay when you choose a plan.</p>
      </div>
    `,
  });
}

// POST /api/stripe/create-checkout-session
router.post(
  "/create-checkout-session",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { plan } = req.body;

      if (!plan || !["STARTER", "GROWTH", "PLUS"].includes(plan)) {
        res.status(400).json({ error: "Invalid plan selected" });
        return;
      }

      // Get organization
      const org = await prisma.organization.findFirst({
        where: { userId: req.user!.userId },
        select: { id: true, subscriptionTier: true, subscriptionStatus: true },
      });

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      // Don't allow same plan — unless subscription is canceled (resubscribing is allowed)
      if (org.subscriptionTier === plan && org.subscriptionStatus !== "CANCELED") {
        res.status(400).json({ error: "You are already on this plan" });
        return;
      }

      const planConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `DonorTrack ${plan} Plan`,
                description: `${plan} tier subscription - $${planConfig.amount}/month`,
              },
              unit_amount: planConfig.amount * 100, // Stripe uses cents
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/app/upgrade?canceled=true`,
        client_reference_id: org.id, // Store org ID to update subscription later
        metadata: {
          organizationId: org.id,
          plan: plan,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// POST /api/stripe/webhook
// This endpoint handles Stripe webhook events
router.post(
  "/webhook",
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      res.status(400).send("Missing stripe-signature header");
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );

      // Handle the checkout.session.completed event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        const organizationId = session.metadata?.organizationId;
        const plan = session.metadata?.plan;
        const validPlans = ["STARTER", "GROWTH", "PLUS"];

        if (organizationId && plan && validPlans.includes(plan)) {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              subscriptionTier: plan as "STARTER" | "GROWTH" | "PLUS",
              subscriptionStatus: "ACTIVE",
              trialEndsAt: null,
              stripeCustomerId: session.customer as string || null,
              stripeSubscriptionId: session.subscription as string || null,
            },
          });

          console.log(`✅ Upgraded organization ${organizationId} to ${plan} plan`);

          // Send purchase confirmation email
          const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: { user: { select: { email: true } } },
          });
          if (org?.user?.email) {
            sendPurchaseConfirmationEmail(org.user.email, org.name, plan, STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS].amount).catch((err) => {
              console.error("Failed to send purchase confirmation email:", err);
            });
          }
        } else {
          console.error("Webhook: missing or invalid metadata on checkout.session.completed", { organizationId, plan });
        }
      }

      // Handle subscription canceled by Stripe (e.g. payment failure)
      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as any;
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          include: { user: { select: { email: true } } },
        });
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { subscriptionStatus: "CANCELED", stripeSubscriptionId: null },
          });
          console.log(`✅ Marked organization ${org.id} as CANCELED via Stripe webhook`);

          // Send cancellation email
          if (org.user?.email) {
            sendCancellationEmail(org.user.email, org.name).catch((err) => {
              console.error("Failed to send cancellation email:", err);
            });
          }
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// POST /api/stripe/cancel-subscription
router.post(
  "/cancel-subscription",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const org = await prisma.organization.findFirst({
        where: { userId: req.user!.userId },
        select: { id: true, stripeSubscriptionId: true, subscriptionTier: true, subscriptionStatus: true, name: true },
      });

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      if (org.subscriptionStatus === "CANCELED") {
        res.status(400).json({ error: "Subscription is already canceled" });
        return;
      }

      if (org.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(org.stripeSubscriptionId);
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: "CANCELED",
          stripeSubscriptionId: null,
        },
      });

      console.log(`✅ Canceled subscription for organization ${org.id}`);

      // Send cancellation confirmation email
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { email: true },
      });
      if (user?.email) {
        sendCancellationEmail(user.email, org.name).catch((err) => {
          console.error("Failed to send cancellation email:", err);
        });
      }

      res.json({ message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  }
);

// GET /api/stripe/config
// Returns Stripe publishable key for frontend
router.get("/config", (req: Request, res: Response): void => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  });
});

// GET /api/stripe/verify-session/:sessionId
// Verifies a checkout session and returns subscription details
router.get(
  "/verify-session/:sessionId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session || session.payment_status !== "paid") {
        res.status(400).json({ error: "Invalid or unpaid session" });
        return;
      }

      // Get plan from metadata
      const plan = session.metadata?.plan || "STARTER";
      const planConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];

      res.json({
        plan: plan,
        amount: planConfig.amount,
        status: session.payment_status,
      });
    } catch (error) {
      console.error("Session verification error:", error);
      res.status(500).json({ error: "Failed to verify session" });
    }
  }
);

export default router;

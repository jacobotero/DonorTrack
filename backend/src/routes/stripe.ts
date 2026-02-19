import { Router, Request, Response } from "express";
import { stripe, STRIPE_PLANS } from "../config/stripe";
import { authenticate } from "../middleware/auth";
import prisma from "../prisma";

const router = Router();

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

        // Update organization subscription
        const organizationId = session.metadata.organizationId;
        const plan = session.metadata.plan;

        if (organizationId && plan) {
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

          console.log(
            `✅ Upgraded organization ${organizationId} to ${plan} plan`
          );
        }
      }

      // Handle subscription cancellation
      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as any;
        // Handle subscription cancellation if needed
        console.log("Subscription canceled:", subscription.id);
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
        select: { id: true, stripeSubscriptionId: true, subscriptionTier: true, subscriptionStatus: true },
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

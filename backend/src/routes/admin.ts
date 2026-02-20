import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// Middleware: only allow the admin email
function requireAdmin(req: Request, res: Response, next: () => void) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    res.status(403).json({ error: "Admin not configured" });
    return;
  }
  if (req.user?.email !== adminEmail) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

// GET /api/admin/stats
router.get("/stats", authenticate, requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const [total, trialing, active, canceled, orgs] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count({ where: { subscriptionStatus: "TRIALING" } }),
      prisma.organization.count({ where: { subscriptionStatus: "ACTIVE" } }),
      prisma.organization.count({ where: { subscriptionStatus: "CANCELED" } }),
      prisma.organization.findMany({
        where: { subscriptionStatus: "ACTIVE" },
        select: { subscriptionTier: true },
      }),
    ]);

    const PLAN_PRICES: Record<string, number> = { STARTER: 29, GROWTH: 59, PLUS: 99 };
    const mrr = orgs.reduce((sum, o) => sum + (PLAN_PRICES[o.subscriptionTier] || 0), 0);

    res.json({ total, trialing, active, canceled, mrr });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /api/admin/users
router.get("/users", authenticate, requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionStatus: true,
            subscriptionTier: true,
            trialEndsAt: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            _count: {
              select: { donors: true, donations: true },
            },
          },
        },
      },
    });
    res.json({ users });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// PATCH /api/admin/orgs/:orgId/extend-trial
router.patch("/orgs/:orgId/extend-trial", authenticate, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const days = parseInt(req.body.days) || 14;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) { res.status(404).json({ error: "Org not found" }); return; }

    const base = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
    const newTrialEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        trialEndsAt: newTrialEnd,
        subscriptionStatus: "TRIALING",
      },
    });

    res.json({ message: `Trial extended by ${days} days`, newTrialEnd });
  } catch (error) {
    console.error("Admin extend trial error:", error);
    res.status(500).json({ error: "Failed to extend trial" });
  }
});

// PATCH /api/admin/orgs/:orgId/activate
router.patch("/orgs/:orgId/activate", authenticate, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const tier = req.body.tier || "PLUS";

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionTier: tier,
        trialEndsAt: null,
      },
    });

    res.json({ message: "Account activated" });
  } catch (error) {
    console.error("Admin activate error:", error);
    res.status(500).json({ error: "Failed to activate account" });
  }
});

// PATCH /api/admin/orgs/:orgId/cancel
router.patch("/orgs/:orgId/cancel", authenticate, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    await prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: "CANCELED", stripeSubscriptionId: null },
    });

    res.json({ message: "Account canceled" });
  } catch (error) {
    console.error("Admin cancel error:", error);
    res.status(500).json({ error: "Failed to cancel account" });
  }
});

// DELETE /api/admin/orgs/:orgId
router.delete("/orgs/:orgId", authenticate, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { userId: true, user: { select: { email: true } } },
    });
    if (!org) { res.status(404).json({ error: "Org not found" }); return; }

    // Delete trial_used record too
    await prisma.trialUsed.deleteMany({ where: { email: org.user.email } });
    // Delete user cascades to org → donors, donations, funds, taxLetters
    await prisma.user.delete({ where: { id: org.userId } });

    res.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Admin delete error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;

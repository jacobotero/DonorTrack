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
    const total = await prisma.user.count();
    res.json({ total });
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

// PATCH /api/admin/users/:userId/verify
router.patch("/users/:userId/verify", authenticate, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    res.json({ message: "Email verified" });
  } catch (error) {
    console.error("Admin verify error:", error);
    res.status(500).json({ error: "Failed to verify email" });
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

    // Delete user cascades to org → donors, donations, funds, taxLetters
    await prisma.user.delete({ where: { id: org.userId } });

    res.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Admin delete error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;

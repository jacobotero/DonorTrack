import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

async function getOrgId(userId: string): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: { userId },
    select: { id: true },
  });
  return org?.id || null;
}

// GET /api/funds
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const funds = await prisma.fund.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      });

      res.json({ funds });
    } catch (error) {
      console.error("List funds error:", error);
      res.status(500).json({ error: "Failed to list funds" });
    }
  }
);

// POST /api/funds
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const { name, description } = req.body;
      if (!name) {
        res.status(400).json({ error: "Fund name is required" });
        return;
      }

      const fund = await prisma.fund.create({
        data: {
          organizationId: orgId,
          name,
          description: description || null,
        },
      });

      res.status(201).json({ fund });
    } catch (error) {
      console.error("Create fund error:", error);
      res.status(500).json({ error: "Failed to create fund" });
    }
  }
);

// PUT /api/funds/:id
router.put(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const existing = await prisma.fund.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Fund not found" });
        return;
      }

      const fund = await prisma.fund.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ fund });
    } catch (error) {
      console.error("Update fund error:", error);
      res.status(500).json({ error: "Failed to update fund" });
    }
  }
);

// DELETE /api/funds/:id/permanent (hard delete)
router.delete(
  "/:id/permanent",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const existing = await prisma.fund.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Fund not found" });
        return;
      }

      // Clear fund name from all donations referencing this fund
      await prisma.donation.updateMany({
        where: { organizationId: orgId, fund: existing.name },
        data: { fund: null },
      });

      await prisma.fund.delete({ where: { id: req.params.id } });

      res.json({ message: "Fund permanently deleted" });
    } catch (error) {
      console.error("Permanent delete fund error:", error);
      res.status(500).json({ error: "Failed to permanently delete fund" });
    }
  }
);

// DELETE /api/funds/:id (deactivate)
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const existing = await prisma.fund.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Fund not found" });
        return;
      }

      await prisma.fund.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json({ message: "Fund deactivated successfully" });
    } catch (error) {
      console.error("Delete fund error:", error);
      res.status(500).json({ error: "Failed to deactivate fund" });
    }
  }
);

export default router;

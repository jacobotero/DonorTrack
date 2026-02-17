import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /api/organization
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const org = await prisma.organization.findFirst({
        where: { userId: req.user!.userId },
      });

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      res.json({ organization: org });
    } catch (error) {
      console.error("Get organization error:", error);
      res.status(500).json({ error: "Failed to get organization" });
    }
  }
);

// PUT /api/organization
router.put(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const org = await prisma.organization.findFirst({
        where: { userId: req.user!.userId },
      });

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        phone,
        email,
        ein,
        taxExemptStatus,
      } = req.body;

      const updated = await prisma.organization.update({
        where: { id: org.id },
        data: {
          ...(name !== undefined && { name }),
          ...(addressLine1 !== undefined && { addressLine1 }),
          ...(addressLine2 !== undefined && { addressLine2 }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(zip !== undefined && { zip }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(ein !== undefined && { ein }),
          ...(taxExemptStatus !== undefined && { taxExemptStatus }),
        },
      });

      res.json({ organization: updated });
    } catch (error) {
      console.error("Update organization error:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  }
);

export default router;

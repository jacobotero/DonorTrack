import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";
import { emailService } from "../utils/email";

const router = Router();

// Strip smtpPass from org before sending to frontend
function sanitizeOrg(org: any) {
  const { smtpPass, ...rest } = org;
  return {
    ...rest,
    smtpConfigured: !!(org.smtpHost && org.smtpUser && org.smtpPass),
  };
}

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

      res.json({ organization: sanitizeOrg(org) });
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
        name, addressLine1, addressLine2, city, state, zip,
        phone, email, ein, taxExemptStatus,
        smtpHost, smtpPort, smtpUser, smtpPass, smtpFromName,
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
          ...(smtpHost !== undefined && { smtpHost: smtpHost || null }),
          ...(smtpPort !== undefined && { smtpPort: smtpPort ? parseInt(smtpPort) : null }),
          ...(smtpUser !== undefined && { smtpUser: smtpUser || null }),
          // Only update password if a new one is provided (non-empty string)
          ...(smtpPass && smtpPass.trim() && { smtpPass: smtpPass.trim() }),
          ...(smtpFromName !== undefined && { smtpFromName: smtpFromName || null }),
        },
      });

      res.json({ organization: sanitizeOrg(updated) });
    } catch (error) {
      console.error("Update organization error:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  }
);

// POST /api/organization/test-email - Test SMTP credentials
router.post(
  "/test-email",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFromName } = req.body;

      if (!smtpHost || !smtpUser) {
        res.status(400).json({ error: "SMTP host and username are required" });
        return;
      }

      // Get user's email and the saved org password (fallback when no new password is provided)
      const [user, org] = await Promise.all([
        prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { email: true },
        }),
        prisma.organization.findFirst({
          where: { userId: req.user!.userId },
          select: { name: true, smtpPass: true },
        }),
      ]);

      const resolvedPass = smtpPass?.trim() || org?.smtpPass;
      if (!resolvedPass) {
        res.status(400).json({ error: "SMTP password is required" });
        return;
      }

      await emailService.testOrgSmtp({
        host: smtpHost,
        port: smtpPort ? parseInt(smtpPort) : 587,
        user: smtpUser,
        pass: resolvedPass,
        fromName: smtpFromName || org?.name || "DonorTrack",
        fromEmail: user?.email || smtpUser,
      });

      res.json({ success: true, message: "SMTP connection successful" });
    } catch (error: any) {
      console.error("SMTP test error:", error);
      res.status(400).json({
        error: "SMTP connection failed",
        message: error.message || "Could not connect. Check your credentials.",
      });
    }
  }
);

export default router;

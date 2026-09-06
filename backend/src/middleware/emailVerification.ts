import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";

/**
 * Unused — no route mounts this anymore (see app.ts). There's no email
 * provider configured, so `emailVerified` can never actually become true;
 * gating on it would lock out every user with no way to unlock. Left in
 * place, dormant, in case an email provider comes back later.
 */
export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const org = await prisma.organization.findFirst({
      where: { userId: req.user.userId },
      select: {
        user: { select: { emailVerified: true } },
      },
    });

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    if (!org.user?.emailVerified) {
      res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email address before using DonorTrack.",
        emailNotVerified: true,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Email verification check error:", error);
    res.status(500).json({ error: "Failed to verify account status" });
  }
};

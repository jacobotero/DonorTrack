import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";

/**
 * DonorTrack is free to use — this middleware no longer gates on
 * subscription/trial status, only on having a verified email (an
 * anti-abuse check, not a paywall).
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

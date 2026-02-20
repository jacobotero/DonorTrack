import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";

/**
 * Middleware to check subscription status before allowing access
 */
export const checkTrialStatus = async (
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
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        user: { select: { emailVerified: true } },
      },
    });

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    // Email must be verified before accessing the app
    if (!org.user?.emailVerified) {
      res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email address before using DonorTrack.",
        emailNotVerified: true,
      });
      return;
    }

    // Canceled subscription — lock out completely
    if (org.subscriptionStatus === "CANCELED") {
      res.status(402).json({
        error: "Subscription canceled",
        message: "Your subscription has been canceled. Please resubscribe to continue using DonorTrack.",
        subscriptionCanceled: true,
      });
      return;
    }

    // Active paid subscription — allow
    if (org.subscriptionStatus === "ACTIVE") {
      next();
      return;
    }

    // TRIALING — check if trial has expired
    if (org.trialEndsAt && new Date() > org.trialEndsAt) {
      res.status(402).json({
        error: "Trial expired",
        message: "Your 14-day trial has ended. Please upgrade to continue using DonorTrack.",
        trialExpired: true,
      });
      return;
    }

    // Trial still active
    next();
  } catch (error) {
    console.error("Trial check error:", error);
    res.status(500).json({ error: "Failed to verify subscription status" });
  }
};

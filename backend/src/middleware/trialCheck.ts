import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";

/**
 * Middleware to check if user's trial has expired
 * Blocks access if trial ended and still on STARTER tier
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
        trialEndsAt: true,
      },
    });

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    // If user is on a paid plan (GROWTH or PLUS), allow access
    if (org.subscriptionTier !== "STARTER") {
      next();
      return;
    }

    // If user is on STARTER and trial has expired, block access
    if (org.trialEndsAt && new Date() > org.trialEndsAt) {
      res.status(402).json({
        error: "Trial expired",
        message: "Your 14-day trial has ended. Please upgrade to continue using DonorTrack.",
        trialExpired: true,
      });
      return;
    }

    // Trial is still active or user is on paid plan
    next();
  } catch (error) {
    console.error("Trial check error:", error);
    next(); // Don't block on error, just log it
  }
};

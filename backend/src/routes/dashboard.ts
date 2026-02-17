import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/stats
router.get(
  "/stats",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const org = await prisma.organization.findFirst({
        where: { userId: req.user!.userId },
        select: { id: true },
      });

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [
        monthlyDonations,
        yearlyDonations,
        totalDonors,
        recentDonations,
      ] = await Promise.all([
        prisma.donation.aggregate({
          where: {
            organizationId: org.id,
            isDeleted: false,
            donationDate: { gte: startOfMonth },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.donation.aggregate({
          where: {
            organizationId: org.id,
            isDeleted: false,
            donationDate: { gte: startOfYear },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.donor.count({
          where: { organizationId: org.id },
        }),
        prisma.donation.findMany({
          where: { organizationId: org.id, isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            donor: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
      ]);

      res.json({
        stats: {
          monthlyTotal: Number(monthlyDonations._sum.amount || 0),
          monthlyCount: monthlyDonations._count,
          yearlyTotal: Number(yearlyDonations._sum.amount || 0),
          yearlyCount: yearlyDonations._count,
          totalDonors,
        },
        recentDonations,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  }
);

export default router;

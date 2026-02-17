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

      // Build date filter based on query params
      const dateFilter: { gte?: Date; lte?: Date } = {};
      const { startDate, endDate } = req.query;

      if (startDate && typeof startDate === "string") {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === "string") {
        dateFilter.lte = new Date(endDate);
      }

      const filteredWhere = {
        organizationId: org.id,
        isDeleted: false,
        ...(Object.keys(dateFilter).length > 0 && { donationDate: dateFilter }),
      };

      const allTimeWhere = {
        organizationId: org.id,
        isDeleted: false,
      };

      const [filteredDonations, allTimeDonations, totalDonors, recentDonations] =
        await Promise.all([
          prisma.donation.aggregate({
            where: filteredWhere,
            _sum: { amount: true },
            _count: true,
          }),
          prisma.donation.aggregate({
            where: allTimeWhere,
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
          monthlyTotal: Number(filteredDonations._sum.amount || 0),
          monthlyCount: filteredDonations._count,
          yearlyTotal: Number(allTimeDonations._sum.amount || 0),
          yearlyCount: allTimeDonations._count,
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

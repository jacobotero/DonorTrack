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

function parseDateRange(startDate?: string, endDate?: string) {
  const where: any = {};
  if (startDate || endDate) {
    where.donationDate = {};
    if (startDate) where.donationDate.gte = new Date(startDate);
    if (endDate) where.donationDate.lte = new Date(endDate);
  }
  return where;
}

// GET /api/reports/summary
router.get(
  "/summary",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateFilter = parseDateRange(
        startDate as string,
        endDate as string
      );

      const donations = await prisma.donation.findMany({
        where: {
          organizationId: orgId,
          isDeleted: false,
          ...dateFilter,
        },
        select: {
          amount: true,
          fund: true,
          paymentMethod: true,
          donorId: true,
        },
      });

      const totalAmount = donations.reduce(
        (sum, d) => sum + Number(d.amount),
        0
      );
      const donorIds = new Set(donations.map((d) => d.donorId));

      // Breakdown by fund
      const fundBreakdown: Record<string, number> = {};
      donations.forEach((d) => {
        const key = d.fund || "Undesignated";
        fundBreakdown[key] = (fundBreakdown[key] || 0) + Number(d.amount);
      });

      // Breakdown by payment method
      const methodBreakdown: Record<string, number> = {};
      donations.forEach((d) => {
        const key = d.paymentMethod || "Not specified";
        methodBreakdown[key] = (methodBreakdown[key] || 0) + Number(d.amount);
      });

      res.json({
        summary: {
          totalAmount,
          totalDonations: donations.length,
          uniqueDonors: donorIds.size,
          averageGift: donations.length > 0 ? totalAmount / donations.length : 0,
          byFund: Object.entries(fundBreakdown).map(([name, amount]) => ({
            name,
            amount,
          })),
          byPaymentMethod: Object.entries(methodBreakdown).map(
            ([name, amount]) => ({ name, amount })
          ),
        },
      });
    } catch (error) {
      console.error("Summary report error:", error);
      res.status(500).json({ error: "Failed to generate summary report" });
    }
  }
);

// GET /api/reports/donor-history/:donorId
router.get(
  "/donor-history/:donorId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const donor = await prisma.donor.findFirst({
        where: { id: req.params.donorId, organizationId: orgId },
      });

      if (!donor) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      const donations = await prisma.donation.findMany({
        where: {
          donorId: req.params.donorId,
          organizationId: orgId,
          isDeleted: false,
        },
        orderBy: { donationDate: "desc" },
      });

      const totalGiving = donations.reduce(
        (sum, d) => sum + Number(d.amount),
        0
      );
      const firstGift = donations.length > 0
        ? donations[donations.length - 1].donationDate
        : null;
      const lastGift = donations.length > 0 ? donations[0].donationDate : null;

      res.json({
        donor: {
          id: donor.id,
          firstName: donor.firstName,
          lastName: donor.lastName,
          email: donor.email,
        },
        history: {
          totalGiving,
          totalDonations: donations.length,
          firstGift,
          lastGift,
          donations,
        },
      });
    } catch (error) {
      console.error("Donor history error:", error);
      res.status(500).json({ error: "Failed to generate donor history" });
    }
  }
);

// GET /api/reports/funds
router.get(
  "/funds",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateFilter = parseDateRange(
        startDate as string,
        endDate as string
      );

      const donations = await prisma.donation.findMany({
        where: {
          organizationId: orgId,
          isDeleted: false,
          ...dateFilter,
        },
        select: { amount: true, fund: true, donorId: true },
      });

      const fundMap = new Map<
        string,
        { amount: number; donors: Set<string> }
      >();

      donations.forEach((d) => {
        const key = d.fund || "Undesignated";
        if (!fundMap.has(key)) {
          fundMap.set(key, { amount: 0, donors: new Set() });
        }
        const entry = fundMap.get(key)!;
        entry.amount += Number(d.amount);
        entry.donors.add(d.donorId);
      });

      const funds = Array.from(fundMap.entries()).map(([name, data]) => ({
        name,
        totalAmount: data.amount,
        donorCount: data.donors.size,
      }));

      res.json({ funds });
    } catch (error) {
      console.error("Fund report error:", error);
      res.status(500).json({ error: "Failed to generate fund report" });
    }
  }
);

// GET /api/reports/top-donors
router.get(
  "/top-donors",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const { startDate, endDate, limit = "25" } = req.query;
      const dateFilter = parseDateRange(
        startDate as string,
        endDate as string
      );
      const limitNum = Math.min(100, parseInt(limit as string, 10) || 25);

      const donations = await prisma.donation.findMany({
        where: {
          organizationId: orgId,
          isDeleted: false,
          ...dateFilter,
        },
        select: { amount: true, donorId: true },
      });

      const donorTotals = new Map<string, number>();
      donations.forEach((d) => {
        const current = donorTotals.get(d.donorId) || 0;
        donorTotals.set(d.donorId, current + Number(d.amount));
      });

      const sortedDonorIds = Array.from(donorTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limitNum);

      const donors = await prisma.donor.findMany({
        where: {
          id: { in: sortedDonorIds.map(([id]) => id) },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          donorType: true,
        },
      });

      const donorMap = new Map(donors.map((d) => [d.id, d]));

      const topDonors = sortedDonorIds.map(([id, total], index) => ({
        rank: index + 1,
        donor: donorMap.get(id),
        totalGiving: total,
      }));

      res.json({ topDonors });
    } catch (error) {
      console.error("Top donors error:", error);
      res.status(500).json({ error: "Failed to generate top donors report" });
    }
  }
);

export default router;

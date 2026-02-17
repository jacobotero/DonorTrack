import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify/sync";
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

      const { startDate, endDate, format = "json" } = req.query;
      const dateFilter = parseDateRange(
        startDate as string,
        endDate as string
      );

      const [org, donations] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true },
        }),
        prisma.donation.findMany({
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
        }),
      ]);

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

      const reportData = {
        summary: {
          totalAmount,
          totalDonations: donations.length,
          uniqueDonors: donorIds.size,
          averageGift:
            donations.length > 0 ? totalAmount / donations.length : 0,
          byFund: Object.entries(fundBreakdown).map(([name, amount]) => ({
            name,
            amount,
          })),
          byPaymentMethod: Object.entries(methodBreakdown).map(
            ([name, amount]) => ({ name, amount })
          ),
        },
      };

      if (format === "csv") {
        const csvData = [
          ["Donation Summary Report"],
          ["Organization:", org?.name || ""],
          [
            "Date Range:",
            `${startDate || "All Time"} to ${endDate || "Present"}`,
          ],
          [],
          ["Total Amount:", `$${totalAmount.toFixed(2)}`],
          ["Total Donations:", donations.length],
          ["Unique Donors:", donorIds.size],
          [
            "Average Gift:",
            `$${reportData.summary.averageGift.toFixed(2)}`,
          ],
          [],
          ["Fund Breakdown"],
          ["Fund", "Amount"],
          ...reportData.summary.byFund.map((f) => [
            f.name,
            `$${f.amount.toFixed(2)}`,
          ]),
          [],
          ["Payment Method Breakdown"],
          ["Payment Method", "Amount"],
          ...reportData.summary.byPaymentMethod.map((p) => [
            p.name,
            `$${p.amount.toFixed(2)}`,
          ]),
        ];

        const csv = stringify(csvData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="donation-summary-report.csv"'
        );
        res.send(csv);
      } else if (format === "pdf") {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="donation-summary-report.pdf"'
        );
        doc.pipe(res);

        // Title
        doc.fontSize(20).text("Donation Summary Report", { align: "center" });
        doc.moveDown();

        // Organization and Date Range
        doc.fontSize(12);
        doc.text(`Organization: ${org?.name || ""}`);
        doc.text(
          `Date Range: ${startDate || "All Time"} to ${endDate || "Present"}`
        );
        doc.moveDown();

        // Summary Stats
        doc.fontSize(14).text("Summary", { underline: true });
        doc.fontSize(12);
        doc.text(`Total Amount: $${totalAmount.toFixed(2)}`);
        doc.text(`Total Donations: ${donations.length}`);
        doc.text(`Unique Donors: ${donorIds.size}`);
        doc.text(
          `Average Gift: $${reportData.summary.averageGift.toFixed(2)}`
        );
        doc.moveDown();

        // Fund Breakdown
        doc.fontSize(14).text("Fund Breakdown", { underline: true });
        doc.fontSize(12);
        reportData.summary.byFund.forEach((f) => {
          doc.text(`${f.name}: $${f.amount.toFixed(2)}`);
        });
        doc.moveDown();

        // Payment Method Breakdown
        doc.fontSize(14).text("Payment Method Breakdown", { underline: true });
        doc.fontSize(12);
        reportData.summary.byPaymentMethod.forEach((p) => {
          doc.text(`${p.name}: $${p.amount.toFixed(2)}`);
        });

        doc.end();
      } else {
        res.json(reportData);
      }
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

      const { startDate, endDate, format = "json" } = req.query;
      const dateFilter = parseDateRange(
        startDate as string,
        endDate as string
      );

      const [org, donations] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true },
        }),
        prisma.donation.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            ...dateFilter,
          },
          select: { amount: true, fund: true, donorId: true },
        }),
      ]);

      const fundMap = new Map<
        string,
        { amount: number; donors: Set<string>; count: number }
      >();

      donations.forEach((d) => {
        const key = d.fund || "Undesignated";
        if (!fundMap.has(key)) {
          fundMap.set(key, { amount: 0, donors: new Set(), count: 0 });
        }
        const entry = fundMap.get(key)!;
        entry.amount += Number(d.amount);
        entry.donors.add(d.donorId);
        entry.count++;
      });

      const funds = Array.from(fundMap.entries())
        .map(([name, data]) => ({
          name,
          totalAmount: data.amount,
          donorCount: data.donors.size,
          donationCount: data.count,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      if (format === "csv") {
        const csvData = [
          ["Fund Breakdown Report"],
          ["Organization:", org?.name || ""],
          [
            "Date Range:",
            `${startDate || "All Time"} to ${endDate || "Present"}`,
          ],
          [],
          ["Fund Name", "Total Amount", "Donor Count", "Donation Count"],
          ...funds.map((f) => [
            f.name,
            `$${f.totalAmount.toFixed(2)}`,
            f.donorCount,
            f.donationCount,
          ]),
        ];

        const csv = stringify(csvData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="fund-breakdown-report.csv"'
        );
        res.send(csv);
      } else if (format === "pdf") {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="fund-breakdown-report.pdf"'
        );
        doc.pipe(res);

        // Title
        doc.fontSize(20).text("Fund Breakdown Report", { align: "center" });
        doc.moveDown();

        // Organization and Date Range
        doc.fontSize(12);
        doc.text(`Organization: ${org?.name || ""}`);
        doc.text(
          `Date Range: ${startDate || "All Time"} to ${endDate || "Present"}`
        );
        doc.moveDown();

        // Funds
        doc.fontSize(14).text("Funds", { underline: true });
        doc.fontSize(12);
        funds.forEach((f, idx) => {
          doc.text(
            `${idx + 1}. ${f.name}: $${f.totalAmount.toFixed(2)} (${f.donorCount} donors, ${f.donationCount} donations)`
          );
        });

        doc.end();
      } else {
        res.json({ funds });
      }
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

      const { startDate, endDate, limit = "25", format = "json" } = req.query;
      const dateFilter = parseDateRange(
        startDate as string,
        endDate as string
      );
      const limitNum = Math.min(100, parseInt(limit as string, 10) || 25);

      const [org, donations] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true },
        }),
        prisma.donation.findMany({
          where: {
            organizationId: orgId,
            isDeleted: false,
            ...dateFilter,
          },
          select: { amount: true, donorId: true },
        }),
      ]);

      const donorTotals = new Map<string, { total: number; count: number }>();
      donations.forEach((d) => {
        const current = donorTotals.get(d.donorId) || { total: 0, count: 0 };
        donorTotals.set(d.donorId, {
          total: current.total + Number(d.amount),
          count: current.count + 1,
        });
      });

      const sortedDonorIds = Array.from(donorTotals.entries())
        .sort((a, b) => b[1].total - a[1].total)
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

      const topDonors = sortedDonorIds.map(([id, data], index) => ({
        rank: index + 1,
        donor: donorMap.get(id),
        totalGiving: data.total,
        donationCount: data.count,
      }));

      if (format === "csv") {
        const csvData = [
          ["Top Donors Report"],
          ["Organization:", org?.name || ""],
          [
            "Date Range:",
            `${startDate || "All Time"} to ${endDate || "Present"}`,
          ],
          [],
          [
            "Rank",
            "Donor Name",
            "Email",
            "Type",
            "Total Giving",
            "Donation Count",
          ],
          ...topDonors.map((t) => [
            t.rank,
            t.donor
              ? `${t.donor.firstName} ${t.donor.lastName}`
              : "Unknown",
            t.donor?.email || "",
            t.donor?.donorType || "",
            `$${t.totalGiving.toFixed(2)}`,
            t.donationCount,
          ]),
        ];

        const csv = stringify(csvData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="top-donors-report.csv"'
        );
        res.send(csv);
      } else if (format === "pdf") {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="top-donors-report.pdf"'
        );
        doc.pipe(res);

        // Title
        doc.fontSize(20).text("Top Donors Report", { align: "center" });
        doc.moveDown();

        // Organization and Date Range
        doc.fontSize(12);
        doc.text(`Organization: ${org?.name || ""}`);
        doc.text(
          `Date Range: ${startDate || "All Time"} to ${endDate || "Present"}`
        );
        doc.moveDown();

        // Top Donors
        doc.fontSize(14).text(`Top ${topDonors.length} Donors`, {
          underline: true,
        });
        doc.fontSize(12);
        topDonors.forEach((t) => {
          const donorName = t.donor
            ? `${t.donor.firstName} ${t.donor.lastName}`
            : "Unknown";
          doc.text(
            `${t.rank}. ${donorName} - $${t.totalGiving.toFixed(2)} (${t.donationCount} donations)`
          );
          if (t.donor?.email) {
            doc.fontSize(10).text(`   ${t.donor.email}`).fontSize(12);
          }
        });

        doc.end();
      } else {
        res.json({ topDonors });
      }
    } catch (error) {
      console.error("Top donors error:", error);
      res.status(500).json({ error: "Failed to generate top donors report" });
    }
  }
);

export default router;

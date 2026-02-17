import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";
import { Prisma } from "../generated/prisma/client";

const router = Router();

async function getOrgId(userId: string): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: { userId },
    select: { id: true },
  });
  return org?.id || null;
}

// GET /api/donations
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const {
        donorId,
        fund,
        startDate,
        endDate,
        page = "1",
        limit = "25",
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.DonationWhereInput = {
        organizationId: orgId,
        isDeleted: false,
      };

      if (donorId) where.donorId = donorId as string;
      if (fund) where.fund = fund as string;

      if (startDate || endDate) {
        where.donationDate = {};
        if (startDate) where.donationDate.gte = new Date(startDate as string);
        if (endDate) where.donationDate.lte = new Date(endDate as string);
      }

      const [donations, total] = await Promise.all([
        prisma.donation.findMany({
          where,
          orderBy: { donationDate: "desc" },
          skip,
          take: limitNum,
          include: {
            donor: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        }),
        prisma.donation.count({ where }),
      ]);

      res.json({
        donations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("List donations error:", error);
      res.status(500).json({ error: "Failed to list donations" });
    }
  }
);

// GET /api/donations/donor/:donorId
router.get(
  "/donor/:donorId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const donations = await prisma.donation.findMany({
        where: {
          organizationId: orgId,
          donorId: req.params.donorId,
          isDeleted: false,
        },
        orderBy: { donationDate: "desc" },
      });

      res.json({ donations });
    } catch (error) {
      console.error("Get donor donations error:", error);
      res.status(500).json({ error: "Failed to get donations" });
    }
  }
);

// GET /api/donations/:id
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const donation = await prisma.donation.findFirst({
        where: { id: req.params.id, organizationId: orgId, isDeleted: false },
        include: {
          donor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!donation) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      res.json({ donation });
    } catch (error) {
      console.error("Get donation error:", error);
      res.status(500).json({ error: "Failed to get donation" });
    }
  }
);

// POST /api/donations
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const {
        donorId,
        amount,
        donationDate,
        paymentMethod,
        checkNumber,
        fund,
        campaign,
        notes,
      } = req.body;

      if (!donorId || !amount || !donationDate) {
        res
          .status(400)
          .json({ error: "Donor, amount, and date are required" });
        return;
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ error: "Amount must be a positive number" });
        return;
      }

      const date = new Date(donationDate);
      if (date > new Date()) {
        res.status(400).json({ error: "Donation date cannot be in the future" });
        return;
      }

      // Verify donor belongs to this org
      const donor = await prisma.donor.findFirst({
        where: { id: donorId, organizationId: orgId },
      });
      if (!donor) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      const donation = await prisma.donation.create({
        data: {
          organizationId: orgId,
          donorId,
          amount: numAmount,
          donationDate: date,
          paymentMethod: paymentMethod || null,
          checkNumber: checkNumber || null,
          fund: fund || null,
          campaign: campaign || null,
          notes: notes || null,
        },
        include: {
          donor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      res.status(201).json({ donation });
    } catch (error) {
      console.error("Create donation error:", error);
      res.status(500).json({ error: "Failed to create donation" });
    }
  }
);

// PUT /api/donations/:id
router.put(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const existing = await prisma.donation.findFirst({
        where: { id: req.params.id, organizationId: orgId, isDeleted: false },
      });

      if (!existing) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      if (req.body.amount !== undefined) {
        const numAmount = parseFloat(req.body.amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          res.status(400).json({ error: "Amount must be a positive number" });
          return;
        }
        req.body.amount = numAmount;
      }

      if (req.body.donationDate !== undefined) {
        const date = new Date(req.body.donationDate);
        if (date > new Date()) {
          res.status(400).json({ error: "Donation date cannot be in the future" });
          return;
        }
        req.body.donationDate = date;
      }

      const donation = await prisma.donation.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ donation });
    } catch (error) {
      console.error("Update donation error:", error);
      res.status(500).json({ error: "Failed to update donation" });
    }
  }
);

// DELETE /api/donations/:id (soft delete)
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const existing = await prisma.donation.findFirst({
        where: { id: req.params.id, organizationId: orgId, isDeleted: false },
      });

      if (!existing) {
        res.status(404).json({ error: "Donation not found" });
        return;
      }

      await prisma.donation.update({
        where: { id: req.params.id },
        data: { isDeleted: true },
      });

      res.json({ message: "Donation deleted successfully" });
    } catch (error) {
      console.error("Delete donation error:", error);
      res.status(500).json({ error: "Failed to delete donation" });
    }
  }
);

export default router;

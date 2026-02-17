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

// GET /api/donors
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
        search,
        donorType,
        tag,
        sortBy = "lastName",
        sortOrder = "asc",
        page = "1",
        limit = "25",
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.DonorWhereInput = {
        organizationId: orgId,
      };

      if (search) {
        const s = search as string;
        where.OR = [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName: { contains: s, mode: "insensitive" } },
          { email: { contains: s, mode: "insensitive" } },
        ];
      }

      if (donorType) {
        where.donorType = donorType as string;
      }

      if (tag) {
        where.tags = { has: tag as string };
      }

      const allowedSorts = ["firstName", "lastName", "createdAt", "email"];
      const orderField = allowedSorts.includes(sortBy as string)
        ? (sortBy as string)
        : "lastName";
      const order = sortOrder === "desc" ? "desc" : "asc";

      const [donors, total] = await Promise.all([
        prisma.donor.findMany({
          where,
          orderBy: { [orderField]: order },
          skip,
          take: limitNum,
          include: {
            _count: { select: { donations: true } },
            donations: {
              where: { isDeleted: false },
              select: { amount: true },
            },
          },
        }),
        prisma.donor.count({ where }),
      ]);

      const donorsWithTotals = donors.map((donor) => {
        const totalGiving = donor.donations.reduce(
          (sum, d) => sum + Number(d.amount),
          0
        );
        const { donations: _, ...donorData } = donor;
        return {
          ...donorData,
          totalGiving,
          donationCount: donor._count.donations,
        };
      });

      res.json({
        donors: donorsWithTotals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("List donors error:", error);
      res.status(500).json({ error: "Failed to list donors" });
    }
  }
);

// GET /api/donors/:id
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

      const donor = await prisma.donor.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: {
          donations: {
            where: { isDeleted: false },
            orderBy: { donationDate: "desc" },
          },
        },
      });

      if (!donor) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      const totalGiving = donor.donations.reduce(
        (sum, d) => sum + Number(d.amount),
        0
      );

      res.json({ donor: { ...donor, totalGiving } });
    } catch (error) {
      console.error("Get donor error:", error);
      res.status(500).json({ error: "Failed to get donor" });
    }
  }
);

// POST /api/donors
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
        firstName,
        lastName,
        email,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        donorType,
        tags,
        notes,
      } = req.body;

      if (!firstName || !lastName) {
        res.status(400).json({ error: "First name and last name are required" });
        return;
      }

      const donor = await prisma.donor.create({
        data: {
          organizationId: orgId,
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          donorType: donorType || null,
          tags: tags || [],
          notes: notes || null,
        },
      });

      res.status(201).json({ donor });
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(409).json({ error: "A donor with this email already exists" });
        return;
      }
      console.error("Create donor error:", error);
      res.status(500).json({ error: "Failed to create donor" });
    }
  }
);

// PUT /api/donors/:id
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

      const existing = await prisma.donor.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      const donor = await prisma.donor.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ donor });
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(409).json({ error: "A donor with this email already exists" });
        return;
      }
      console.error("Update donor error:", error);
      res.status(500).json({ error: "Failed to update donor" });
    }
  }
);

// DELETE /api/donors/:id
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

      const existing = await prisma.donor.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Donor not found" });
        return;
      }

      await prisma.donor.delete({ where: { id: req.params.id } });
      res.json({ message: "Donor deleted successfully" });
    } catch (error) {
      console.error("Delete donor error:", error);
      res.status(500).json({ error: "Failed to delete donor" });
    }
  }
);

export default router;

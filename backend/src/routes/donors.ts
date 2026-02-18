import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";
import { Prisma } from "@prisma/client";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import multer from "multer";

const router = Router();

// Configure multer for CSV uploads
const upload = multer({ storage: multer.memoryStorage() });

async function getOrgId(userId: string): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: { userId },
    select: { id: true },
  });
  return org?.id || null;
}

// Helper function to check if adding donors would exceed plan limit
async function checkDonorLimit(
  orgId: string,
  additionalDonors: number = 1
): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionTier: true,
      _count: { select: { donors: true } },
    },
  });

  if (!org) {
    return { allowed: false, message: "Organization not found" };
  }

  const currentCount = org._count.donors;
  const newTotal = currentCount + additionalDonors;

  // Determine limit based on subscription tier
  let limit: number | null = null;
  switch (org.subscriptionTier) {
    case "STARTER":
      limit = 100;
      break;
    case "GROWTH":
      limit = 500;
      break;
    case "PLUS":
      limit = null; // Unlimited
      break;
  }

  // If unlimited (PLUS tier), allow
  if (limit === null) {
    return { allowed: true };
  }

  // Check if would exceed limit
  if (newTotal > limit) {
    return {
      allowed: false,
      message: `Donor limit exceeded. Your ${org.subscriptionTier} plan allows ${limit} donors. You currently have ${currentCount} donors.`,
      currentCount,
      limit,
    };
  }

  return { allowed: true, currentCount, limit };
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
        all,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      // Allow fetching all donors if all=true, otherwise cap at 100
      const limitNum = all === "true"
        ? 999999
        : Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
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

// GET /api/donors/tags - Get all unique tags
router.get(
  "/tags",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const donors = await prisma.donor.findMany({
        where: { organizationId: orgId },
        select: { tags: true },
      });

      const tagsSet = new Set<string>();
      donors.forEach((donor) => {
        if (donor.tags && Array.isArray(donor.tags)) {
          donor.tags.forEach((tag: string) => tagsSet.add(tag));
        }
      });

      res.json({ tags: Array.from(tagsSet).sort() });
    } catch (error) {
      console.error("Get tags error:", error);
      res.status(500).json({ error: "Failed to get tags" });
    }
  }
);

// GET /api/donors/export - Export donors as CSV
router.get(
  "/export",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const donors = await prisma.donor.findMany({
        where: { organizationId: orgId },
        orderBy: { lastName: "asc" },
      });

      // Convert donors to CSV format
      const csvData = donors.map((donor) => ({
        firstName: donor.firstName,
        lastName: donor.lastName,
        email: donor.email || "",
        phone: donor.phone || "",
        addressLine1: donor.addressLine1 || "",
        addressLine2: donor.addressLine2 || "",
        city: donor.city || "",
        state: donor.state || "",
        zip: donor.zip || "",
        donorType: donor.donorType || "",
        tags: donor.tags.join(";"),
        notes: donor.notes || "",
      }));

      const csv = stringify(csvData, {
        header: true,
        columns: [
          "firstName",
          "lastName",
          "email",
          "phone",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "zip",
          "donorType",
          "tags",
          "notes",
        ],
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="donors.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Export donors error:", error);
      res.status(500).json({ error: "Failed to export donors" });
    }
  }
);

// POST /api/donors/import - Import donors from CSV
router.post(
  "/import",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const csvContent = req.file.buffer.toString("utf-8");
      const records: any[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const imported: any[] = [];
      const errors: any[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          // Validate required fields
          if (!row.firstName || !row.lastName) {
            errors.push({
              row: i + 1,
              error: "First name and last name are required",
            });
            continue;
          }

          // Check donor limit before creating each new donor
          const limitCheck = await checkDonorLimit(orgId, 1);
          if (!limitCheck.allowed) {
            errors.push({
              row: i + 1,
              error: `${limitCheck.message} Remaining rows were not imported.`,
              upgradeRequired: true,
            });
            // Stop importing further rows if limit is reached
            break;
          }

          // Parse tags from semicolon-separated string
          const tags = row.tags
            ? row.tags.split(";").map((t: string) => t.trim()).filter(Boolean)
            : [];

          const donor = await prisma.donor.create({
            data: {
              organizationId: orgId,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email || null,
              phone: row.phone || null,
              addressLine1: row.addressLine1 || null,
              addressLine2: row.addressLine2 || null,
              city: row.city || null,
              state: row.state || null,
              zip: row.zip || null,
              donorType: row.donorType || null,
              tags,
              notes: row.notes || null,
            },
          });

          imported.push(donor);
        } catch (error: any) {
          errors.push({
            row: i + 1,
            error: error.message || "Failed to import donor",
          });
        }
      }

      res.json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        errorDetails: errors,
      });
    } catch (error) {
      console.error("Import donors error:", error);
      res.status(500).json({ error: "Failed to import donors" });
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

      // Check donor limit
      const limitCheck = await checkDonorLimit(orgId, 1);
      if (!limitCheck.allowed) {
        res.status(403).json({
          error: limitCheck.message,
          upgradeRequired: true,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
        });
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

      // Whitelist allowed fields to prevent mass assignment
      const allowedFields = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip,
        donorType: req.body.donorType,
        tags: req.body.tags,
        notes: req.body.notes,
      };

      // Remove undefined fields
      Object.keys(allowedFields).forEach(key =>
        allowedFields[key as keyof typeof allowedFields] === undefined &&
        delete allowedFields[key as keyof typeof allowedFields]
      );

      const donor = await prisma.donor.update({
        where: { id: req.params.id },
        data: allowedFields,
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

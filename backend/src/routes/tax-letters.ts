import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";
import { emailService, OrgSmtpConfig } from "../utils/email";

const router = Router();

async function getOrgId(userId: string): Promise<string | null> {
  const org = await prisma.organization.findFirst({
    where: { userId },
    select: { id: true },
  });
  return org?.id || null;
}

// Generate IRS-compliant tax letter PDF
function generateTaxLetterPDF(
  doc: InstanceType<typeof PDFDocument>,
  orgData: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    ein?: string | null;
  },
  donorData: {
    firstName: string;
    lastName: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  },
  donations: Array<{ donationDate: Date; amount: number }>,
  year: number,
  totalAmount: number
) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Organization Header
  doc.fontSize(12).text(orgData.name, { align: "center" });
  if (orgData.addressLine1) {
    doc.text(orgData.addressLine1, { align: "center" });
  }
  if (orgData.addressLine2) {
    doc.text(orgData.addressLine2, { align: "center" });
  }
  const cityStateZip = [orgData.city, orgData.state, orgData.zip]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) {
    doc.text(cityStateZip, { align: "center" });
  }
  if (orgData.ein) {
    doc.text(`EIN: ${orgData.ein}`, { align: "center" });
  }
  doc.moveDown(2);

  // Date
  doc.fontSize(11).text(today, { align: "right" });
  doc.moveDown();

  // Donor Address
  doc.fontSize(11).text(`${donorData.firstName} ${donorData.lastName}`);
  if (donorData.addressLine1) doc.text(donorData.addressLine1);
  if (donorData.addressLine2) doc.text(donorData.addressLine2);
  const donorCityStateZip = [donorData.city, donorData.state, donorData.zip]
    .filter(Boolean)
    .join(", ");
  if (donorCityStateZip) doc.text(donorCityStateZip);
  doc.moveDown(2);

  // Salutation
  doc.text(`Dear ${donorData.firstName} ${donorData.lastName},`);
  doc.moveDown();

  // Letter Body
  doc
    .fontSize(11)
    .text(
      `Thank you for your generous support of ${orgData.name} during ${year}. This letter serves as an official record of your charitable contributions for tax purposes.`,
      { align: "left" }
    );
  doc.moveDown();

  // Tax-exempt statement (IRS requirement)
  doc.text(
    `${orgData.name} is a 501(c)(3) tax-exempt organization${
      orgData.ein ? ` (EIN: ${orgData.ein})` : ""
    }. No goods or services were provided in exchange for your donations, except for intangible religious benefits.`,
    { align: "left" }
  );
  doc.moveDown(1.5);

  // Donation Summary
  doc.fontSize(12).text("Donation Summary:", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);

  // Check if there are any donations over $250
  const hasLargeDonation = donations.some((d) => d.amount >= 250);

  if (hasLargeDonation) {
    doc.text(
      "The IRS requires a contemporaneous written acknowledgment for any single donation of $250 or more. This letter serves as that acknowledgment.",
      { align: "left" }
    );
    doc.moveDown();
  }

  // Donation table
  doc.fontSize(10);
  const tableTop = doc.y;
  const colDate = 80;
  const colAmount = 350;

  // Table headers
  doc.font("Helvetica-Bold");
  doc.text("Date", colDate, tableTop);
  doc.text("Amount", colAmount, tableTop);
  doc.font("Helvetica");

  let yPosition = tableTop + 20;

  // Sort donations by date
  const sortedDonations = donations.sort(
    (a, b) =>
      new Date(a.donationDate).getTime() - new Date(b.donationDate).getTime()
  );

  sortedDonations.forEach((donation) => {
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    const date = new Date(donation.donationDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    doc.text(date, colDate, yPosition);
    doc.text(`$${donation.amount.toFixed(2)}`, colAmount, yPosition);

    yPosition += 20;
  });

  // Total line
  yPosition += 10;
  doc
    .moveDown()
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(
      `Total Contributions for ${year}: $${totalAmount.toFixed(2)}`,
      colDate,
      yPosition
    );
  doc.font("Helvetica");

  // Footer
  doc.moveDown(2);
  doc
    .fontSize(11)
    .text(
      "Please retain this letter for your tax records. If you have any questions, please contact us.",
      { align: "left" }
    );
  doc.moveDown(2);
  doc.text("Sincerely,");
  doc.moveDown(2);
  doc.text(orgData.name);
  doc.text("Authorized Representative");
}

// POST /api/tax-letters/generate - Generate tax letters
router.post(
  "/generate",
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

      const orgId = org.id;
      const { year, donorIds = [] } = req.body;

      if (!year || typeof year !== "number") {
        res.status(400).json({ error: "Year is required" });
        return;
      }

      const [orgData, allDonors] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
        }),
        prisma.donor.findMany({
          where: {
            organizationId: orgId,
            ...(donorIds.length > 0 && { id: { in: donorIds } }),
          },
          include: {
            donations: {
              where: {
                isDeleted: false,
                donationDate: {
                  gte: new Date(`${year}-01-01`),
                  lte: new Date(`${year}-12-31`),
                },
              },
              select: {
                donationDate: true,
                amount: true,
              },
            },
          },
        }),
      ]);

      if (!orgData) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      // Filter donors who have donations in the selected year
      const donorsWithDonations = allDonors.filter(
        (d) => d.donations.length > 0
      );

      if (donorsWithDonations.length === 0) {
        res
          .status(400)
          .json({ error: "No donors with donations found for this year" });
        return;
      }

      // Generate tax letters and track them
      const letters = await Promise.all(
        donorsWithDonations.map(async (donor) => {
          const totalAmount = donor.donations.reduce(
            (sum, d) => sum + Number(d.amount),
            0
          );

          // Create or update tax letter record
          const letter = await prisma.taxLetter.upsert({
            where: {
              tax_letter_unique: {
                organizationId: orgId,
                donorId: donor.id,
                year,
              },
            },
            create: {
              organizationId: orgId,
              donorId: donor.id,
              year,
              totalAmount,
              letterDate: new Date(),
            },
            update: {
              totalAmount,
              letterDate: new Date(),
            },
          });

          return {
            letterId: letter.id,
            donorId: donor.id,
            donorName: `${donor.firstName} ${donor.lastName}`,
            totalAmount,
            donationCount: donor.donations.length,
          };
        })
      );

      res.json({
        message: `Generated ${letters.length} tax letter(s)`,
        letters,
      });
    } catch (error) {
      console.error("Tax letter generation error:", error);
      res.status(500).json({ error: "Failed to generate tax letters" });
    }
  }
);

// GET /api/tax-letters/:id/pdf - Download individual tax letter PDF
router.get(
  "/:id/pdf",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const letter = await prisma.taxLetter.findFirst({
        where: {
          id: req.params.id,
          organizationId: orgId,
        },
        include: {
          organization: true,
          donor: true,
        },
      });

      if (!letter) {
        res.status(404).json({ error: "Tax letter not found" });
        return;
      }

      // Fetch donations for the letter year
      const donations = await prisma.donation.findMany({
        where: {
          donorId: letter.donor.id,
          isDeleted: false,
          donationDate: {
            gte: new Date(`${letter.year}-01-01`),
            lte: new Date(`${letter.year}-12-31`),
          },
        },
        select: {
          donationDate: true,
          amount: true,
        },
      });

      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tax-letter-${letter.year}-${letter.donor.firstName}-${letter.donor.lastName}.pdf"`
      );

      doc.pipe(res);

      generateTaxLetterPDF(
        doc,
        letter.organization,
        letter.donor,
        donations.map((d) => ({
          donationDate: d.donationDate,
          amount: Number(d.amount),
        })),
        letter.year,
        Number(letter.totalAmount)
      );

      doc.end();
    } catch (error) {
      console.error("PDF download error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }
);

// GET /api/tax-letters/batch/zip - Download batch of letters as ZIP
router.get(
  "/batch/zip",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const { year, donorIds } = req.query;

      if (!year) {
        res.status(400).json({ error: "Year is required" });
        return;
      }

      const yearNum = parseInt(year as string, 10);

      const letters = await prisma.taxLetter.findMany({
        where: {
          organizationId: orgId,
          year: yearNum,
          ...(donorIds && {
            donorId: { in: (donorIds as string).split(",") },
          }),
        },
        include: {
          organization: true,
          donor: true,
        },
      });

      if (letters.length === 0) {
        res.status(404).json({ error: "No tax letters found" });
        return;
      }

      // Create ZIP archive
      const archive = archiver("zip", { zlib: { level: 9 } });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tax-letters-${yearNum}.zip"`
      );

      archive.pipe(res);

      // Generate PDFs and add to archive
      for (const letter of letters) {
        const donations = await prisma.donation.findMany({
          where: {
            donorId: letter.donor.id,
            isDeleted: false,
            donationDate: {
              gte: new Date(`${yearNum}-01-01`),
              lte: new Date(`${yearNum}-12-31`),
            },
          },
          select: {
            donationDate: true,
            amount: true,
          },
        });

        const doc = new PDFDocument({ margin: 50 });

        generateTaxLetterPDF(
          doc,
          letter.organization,
          letter.donor,
          donations.map((d) => ({
            donationDate: d.donationDate,
            amount: Number(d.amount),
          })),
          yearNum,
          Number(letter.totalAmount)
        );

        const fileName = `${letter.donor.lastName}-${letter.donor.firstName}-${yearNum}.pdf`;

        archive.append(doc as any, { name: fileName });

        doc.end();
      }

      archive.finalize();
    } catch (error) {
      console.error("Batch ZIP download error:", error);
      res.status(500).json({ error: "Failed to generate ZIP file" });
    }
  }
);

// GET /api/tax-letters - List generated letters
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

      const { year } = req.query;

      const letters = await prisma.taxLetter.findMany({
        where: {
          organizationId: orgId,
          ...(year && { year: parseInt(year as string, 10) }),
        },
        include: {
          donor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ year: "desc" }, { letterDate: "desc" }],
      });

      res.json({ letters });
    } catch (error) {
      console.error("List tax letters error:", error);
      res.status(500).json({ error: "Failed to fetch tax letters" });
    }
  }
);

// PATCH /api/tax-letters/:id/mark-sent - Mark letter as sent
router.patch(
  "/:id/mark-sent",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const letter = await prisma.taxLetter.findFirst({
        where: {
          id: req.params.id,
          organizationId: orgId,
        },
      });

      if (!letter) {
        res.status(404).json({ error: "Tax letter not found" });
        return;
      }

      const updated = await prisma.taxLetter.update({
        where: { id: req.params.id },
        data: { sentDate: new Date() },
      });

      res.json({ message: "Letter marked as sent", letter: updated });
    } catch (error) {
      console.error("Mark sent error:", error);
      res.status(500).json({ error: "Failed to mark letter as sent" });
    }
  }
);

// PATCH /api/tax-letters/:id/mark-unsent - Mark letter as not sent
router.patch(
  "/:id/mark-unsent",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const letter = await prisma.taxLetter.findFirst({
        where: {
          id: req.params.id,
          organizationId: orgId,
        },
      });

      if (!letter) {
        res.status(404).json({ error: "Tax letter not found" });
        return;
      }

      const updated = await prisma.taxLetter.update({
        where: { id: req.params.id },
        data: { sentDate: null },
      });

      res.json({ message: "Letter marked as not sent", letter: updated });
    } catch (error) {
      console.error("Mark unsent error:", error);
      res.status(500).json({ error: "Failed to mark letter as unsent" });
    }
  }
);

// POST /api/tax-letters/:id/send-email - Send tax letter via email
router.post(
  "/:id/send-email",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = await getOrgId(req.user!.userId);
      if (!orgId) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      // Fetch the manager's login email to use as "From" address
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { email: true },
      });

      const letter = await prisma.taxLetter.findFirst({
        where: {
          id: req.params.id,
          organizationId: orgId,
        },
        include: {
          organization: true,
          donor: true,
        },
      });

      if (!letter) {
        res.status(404).json({ error: "Tax letter not found" });
        return;
      }

      if (!letter.donor.email) {
        res.status(400).json({ error: "Donor does not have an email address" });
        return;
      }

      // Require org SMTP to be configured
      const org = letter.organization;
      if (!org.smtpHost || !org.smtpUser || !org.smtpPass) {
        res.status(400).json({
          error: "Email not configured",
          message: "Please configure your email settings in Settings before sending tax letters.",
          setupRequired: true,
        });
        return;
      }

      // Fetch donations for the correct year
      const donations = await prisma.donation.findMany({
        where: {
          donorId: letter.donor.id,
          isDeleted: false,
          donationDate: {
            gte: new Date(`${letter.year}-01-01`),
            lte: new Date(`${letter.year}-12-31`),
          },
        },
        select: {
          donationDate: true,
          amount: true,
        },
      });

      // Generate PDF in memory
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      await new Promise<void>((resolve, reject) => {
        doc.on("end", () => resolve());
        doc.on("error", (err) => reject(err));

        generateTaxLetterPDF(
          doc,
          letter.organization,
          letter.donor,
          donations.map((d) => ({
            donationDate: d.donationDate,
            amount: Number(d.amount),
          })),
          letter.year,
          Number(letter.totalAmount)
        );

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);

      const orgConfig: OrgSmtpConfig = {
        host: org.smtpHost!,
        port: org.smtpPort || 587,
        user: org.smtpUser!,
        pass: org.smtpPass!,
        fromName: org.smtpFromName || org.name,
        fromEmail: user?.email || org.smtpUser!,
      };

      const emailBody = `Dear ${letter.donor.firstName} ${letter.donor.lastName},

Thank you for your generous support of ${letter.organization.name} during ${letter.year}.

Attached is your official tax receipt for charitable contributions. Please retain this letter for your tax records.

If you have any questions, please don't hesitate to contact us.

Sincerely,
${letter.organization.name}`;

      // Send email with PDF attachment from org's own email
      await emailService.sendEmailWithOrgConfig(
        {
          to: letter.donor.email,
          subject: `${letter.year} Tax Receipt from ${letter.organization.name}`,
          text: emailBody,
          html: `
            <p>Dear ${letter.donor.firstName} ${letter.donor.lastName},</p>
            <p>Thank you for your generous support of <strong>${letter.organization.name}</strong> during ${letter.year}.</p>
            <p>Attached is your official tax receipt for charitable contributions. Please retain this letter for your tax records.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Sincerely,<br>${letter.organization.name}</p>
          `,
          attachments: [
            {
              filename: `tax-receipt-${letter.year}-${letter.donor.lastName}-${letter.donor.firstName}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        },
        orgConfig
      );

      await prisma.taxLetter.update({
        where: { id: req.params.id },
        data: { sentDate: new Date() },
      });

      res.json({ message: "Tax letter sent successfully", emailSent: true });
    } catch (error) {
      console.error("Send email error:", error);
      res.status(500).json({ error: "Failed to send tax letter via email" });
    }
  }
);

export default router;

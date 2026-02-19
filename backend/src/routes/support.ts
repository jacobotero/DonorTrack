import { Router } from "express";
import prisma from "../prisma";
import { emailService } from "../utils/email";

const router = Router();

// POST /api/support — send a support message to the DonorTrack team
router.post("/", async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: "Subject and message are required" });
      return;
    }

    if (message.trim().length < 10) {
      res.status(400).json({ error: "Message must be at least 10 characters" });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { name: true } } },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const orgName = user.organization?.name || "Unknown Organization";

    await emailService.sendEmail({
      to: "donortrackapp@gmail.com",
      subject: `[Support] ${subject.trim()}`,
      text: `Support request from ${user.email} (${orgName})\n\n${message.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #059669;">New Support Request</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 4px 8px; font-weight: bold; color: #374151; width: 120px;">From</td>
              <td style="padding: 4px 8px; color: #6b7280;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: bold; color: #374151;">Organization</td>
              <td style="padding: 4px 8px; color: #6b7280;">${orgName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: bold; color: #374151;">Subject</td>
              <td style="padding: 4px 8px; color: #6b7280;">${subject.trim()}</td>
            </tr>
          </table>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${message.trim()}</p>
          </div>
          <p style="margin-top: 16px; color: #9ca3af; font-size: 12px;">
            Reply directly to ${user.email} to respond to this request.
          </p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Support email error:", error);
    res.status(500).json({ error: "Failed to send support message. Please try again." });
  }
});

export default router;

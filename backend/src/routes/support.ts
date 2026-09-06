import { Router } from "express";
import prisma from "../prisma";
import { sendContactEmail } from "../utils/ses";

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

    await sendContactEmail({
      subject: `[Support] ${subject.trim()}`,
      text: `Support request from ${user.email} (${orgName})\n\n${message.trim()}`,
      replyTo: user.email,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Support email error:", error);
    res.status(500).json({ error: "Failed to send support message. Please try again." });
  }
});

export default router;

// Separate public router — no auth required (used from landing page contact form)
export const publicContactRouter = Router();

publicContactRouter.post("/", async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    if (!email?.trim() || !subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: "Email, subject, and message are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    if (message.trim().length < 10) {
      res.status(400).json({ error: "Message must be at least 10 characters" });
      return;
    }

    await sendContactEmail({
      subject: `[Contact] ${subject.trim()}`,
      text: `Message from ${email.trim()}\n\n${message.trim()}`,
      replyTo: email.trim(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({ error: "Failed to send message. Please try again." });
  }
});

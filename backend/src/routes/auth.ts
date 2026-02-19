import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import prisma from "../prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { validate } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth";
import { authenticate } from "../middleware/auth";
import { emailService } from "../utils/email";
import { stripe } from "../config/stripe";

const router = Router();

function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

async function sendVerificationEmail(email: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  await emailService.sendEmail({
    to: email,
    subject: "Verify your email — DonorTrack",
    text: `Welcome to DonorTrack! Please verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <p>Welcome to DonorTrack!</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Verify Email Address</a></p>
      <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

// POST /api/auth/register
router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, organizationName } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
          organization: {
            create: { name: organizationName, trialEndsAt },
          },
        },
        include: { organization: true },
      });

      if (user.organization) {
        await prisma.fund.createMany({
          data: [
            { organizationId: user.organization.id, name: "General" },
            { organizationId: user.organization.id, name: "Building" },
            { organizationId: user.organization.id, name: "Missions" },
          ],
        });
      }

      // Non-blocking — registration succeeds even if email fails
      sendVerificationEmail(user.email, verificationToken).catch((err) => {
        console.error("Failed to send verification email:", err);
      });

      const token = generateToken({ userId: user.id, email: user.email });

      res.status(201).json({
        message: "Account created successfully. Please check your email to verify your address.",
        token,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          organization: user.organization
            ? { id: user.organization.id, name: user.organization.name, subscriptionTier: user.organization.subscriptionTier, subscriptionStatus: user.organization.subscriptionStatus, trialEndsAt: user.organization.trialEndsAt }
            : null,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { organization: true },
      });

      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const validPassword = await comparePassword(password, user.passwordHash);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          organization: user.organization
            ? { id: user.organization.id, name: user.organization.name, subscriptionTier: user.organization.subscriptionTier, subscriptionStatus: user.organization.subscriptionStatus, trialEndsAt: user.organization.trialEndsAt }
            : null,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { organization: true },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          organization: user.organization
            ? { id: user.organization.id, name: user.organization.name, subscriptionTier: user.organization.subscriptionTier, subscriptionStatus: user.organization.subscriptionStatus, trialEndsAt: user.organization.trialEndsAt }
            : null,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  }
);

// GET /api/auth/verify-email?token=xxx
router.get(
  "/verify-email",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        res.status(400).json({ error: "Verification token is required" });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        res.status(400).json({ error: "Invalid or expired verification link. Please request a new one." });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  }
);

// POST /api/auth/resend-verification
router.post(
  "/resend-verification",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (user.emailVerified) {
        res.json({ message: "Email already verified" });
        return;
      }

      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationToken: verificationToken, emailVerificationExpiry: verificationExpiry },
      });

      await sendVerificationEmail(user.email, verificationToken);

      res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  }
);

// DELETE /api/auth/account
router.delete(
  "/account",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { organization: true },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Cancel active Stripe subscription if exists
      if (user.organization?.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.organization.stripeSubscriptionId);
        } catch (err) {
          console.error("Failed to cancel Stripe subscription during account deletion:", err);
          // Continue with deletion even if Stripe cancel fails
        }
      }

      // Delete user — cascade deletes organization, donors, donations, funds, tax letters
      await prisma.user.delete({ where: { id: user.id } });

      console.log(`✅ Account deleted for user ${user.id}`);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // Always return the same message to avoid leaking whether an account exists
    const genericMessage = "If an account with that email exists, a password reset link has been sent.";

    try {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

      if (!user) {
        console.log(`[forgot-password] No account found for ${email}`);
        res.json({ message: genericMessage });
        return;
      }

      console.log(`[forgot-password] Sending reset email to ${user.email}`);
      const resetToken = generateVerificationToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
      });

      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await emailService.sendEmail({
        to: user.email,
        subject: "Reset your password — DonorTrack",
        text: `You requested a password reset for your DonorTrack account.\n\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #059669;">Reset your password</h2>
            <p>You requested a password reset for your DonorTrack account.</p>
            <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
            <p style="color:#6b7280;font-size:14px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
          </div>
        `,
      }).catch((err) => console.error("Failed to send password reset email:", err));

      res.json({ message: genericMessage });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.json({ message: genericMessage }); // still generic on error
    }
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

      if (!user || !user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
        res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
        return;
      }

      const passwordHash = await hashPassword(password);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
      });

      res.json({ message: "Password updated successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

export default router;

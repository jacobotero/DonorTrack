import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { validate } from "../middleware/validate";
import { authRateLimit } from "../middleware/rateLimit";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth";
import { authenticate } from "../middleware/auth";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  authRateLimit,
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

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          organization: {
            create: {
              name: organizationName,
            },
          },
        },
        include: {
          organization: true,
        },
      });

      // Create default funds for the organization
      if (user.organization) {
        await prisma.fund.createMany({
          data: [
            { organizationId: user.organization.id, name: "General" },
            { organizationId: user.organization.id, name: "Building" },
            { organizationId: user.organization.id, name: "Missions" },
          ],
        });
      }

      const token = generateToken({ userId: user.id, email: user.email });

      res.status(201).json({
        message: "Account created successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          organization: user.organization
            ? {
                id: user.organization.id,
                name: user.organization.name,
              }
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
  authRateLimit,
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
            ? {
                id: user.organization.id,
                name: user.organization.name,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// GET /api/auth/me - Get current user
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
            ? {
                id: user.organization.id,
                name: user.organization.name,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  authRateLimit,
  validate(forgotPasswordSchema),
  async (_req: Request, res: Response): Promise<void> => {
    // In production, this would send an email with a reset link.
    // For MVP, we acknowledge the request but note email isn't set up yet.
    res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  async (_req: Request, res: Response): Promise<void> => {
    // Placeholder - requires email service integration
    res.json({ message: "Password reset functionality coming soon." });
  }
);

export default router;

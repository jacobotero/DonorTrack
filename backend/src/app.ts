import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organization";
import donorRoutes from "./routes/donors";
import donationRoutes from "./routes/donations";
import fundRoutes from "./routes/funds";
import dashboardRoutes from "./routes/dashboard";
import reportRoutes from "./routes/reports";
import taxLetterRoutes from "./routes/tax-letters";
import stripeRoutes from "./routes/stripe";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter";
import { authenticate } from "./middleware/auth";
import { checkTrialStatus } from "./middleware/trialCheck";

const app = express();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

// Stripe webhook needs raw body - MUST be before express.json()
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeRoutes
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authLimiter, authRoutes); // Strict rate limiting on auth
app.use("/api", apiLimiter); // General rate limiting on all API routes

// Apply auth + trial enforcement to protected routes
// authenticate runs first to set req.user, then checkTrialStatus uses it
app.use("/api/organization", authenticate, checkTrialStatus, organizationRoutes);
app.use("/api/donors", authenticate, checkTrialStatus, donorRoutes);
app.use("/api/donations", authenticate, checkTrialStatus, donationRoutes);
app.use("/api/funds", authenticate, checkTrialStatus, fundRoutes);
app.use("/api/dashboard", authenticate, checkTrialStatus, dashboardRoutes);
app.use("/api/reports", authenticate, checkTrialStatus, reportRoutes);
app.use("/api/tax-letters", authenticate, checkTrialStatus, taxLetterRoutes);
app.use("/api/stripe", stripeRoutes); // Stripe routes (webhook already mounted above, no trial check needed)

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;

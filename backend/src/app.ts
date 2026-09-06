import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";

import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organization";
import donorRoutes from "./routes/donors";
import donationRoutes from "./routes/donations";
import fundRoutes from "./routes/funds";
import dashboardRoutes from "./routes/dashboard";
import reportRoutes from "./routes/reports";
import taxLetterRoutes from "./routes/tax-letters";
import adminRoutes from "./routes/admin";
import supportRoutes, { publicContactRouter } from "./routes/support";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter";
import { authenticate } from "./middleware/auth";

const app = express();

// Trust Railway/Vercel proxy so rate limiters get real client IPs
app.set("trust proxy", 1);

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
    origin: (origin, callback) => {
      const allowed = [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:5173",
        "https://donortrackapp.com",
        "https://www.donortrackapp.com",
      ];
      // Allow any Vercel preview/production URLs
      if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authLimiter, authRoutes); // Strict rate limiting on auth
app.use("/api", apiLimiter); // General rate limiting on all API routes

// Free to use — every route below just needs an authenticated user. No email
// verification gate: there's no email provider configured (no Resend
// account), so requiring verification would lock every new signup out with
// no way to ever unlock. requireVerifiedEmail still exists, unused, in case
// email comes back later.
app.use("/api/organization", authenticate, organizationRoutes);
app.use("/api/donors", authenticate, donorRoutes);
app.use("/api/donations", authenticate, donationRoutes);
app.use("/api/funds", authenticate, fundRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/reports", authenticate, reportRoutes);
app.use("/api/tax-letters", authenticate, taxLetterRoutes);
app.use("/api/admin", adminRoutes); // Admin routes — protected by requireAdmin middleware internally
app.use("/api/support", authenticate, supportRoutes);
app.use("/api/contact", publicContactRouter); // Public — no auth required (landing page contact form)

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Sentry error handler — must come before the custom error handler
Sentry.setupExpressErrorHandler(app);

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

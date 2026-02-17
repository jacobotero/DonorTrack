import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organization";
import donorRoutes from "./routes/donors";
import donationRoutes from "./routes/donations";
import fundRoutes from "./routes/funds";
import dashboardRoutes from "./routes/dashboard";
import reportRoutes from "./routes/reports";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/funds", fundRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

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

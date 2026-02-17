import { Request, Response, NextFunction } from "express";

const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function authRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.ip || "unknown";
  const now = Date.now();

  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (record.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      error: "Too many attempts. Please try again later.",
    });
    return;
  }

  record.count++;
  next();
}

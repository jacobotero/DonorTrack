// Environment variable validation
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "PORT",
  "NODE_ENV",
  "FRONTEND_URL",
  "STRIPE_WEBHOOK_SECRET",
];

const optionalEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_FROM_NAME",
  "ADMIN_EMAIL", // If not set, admin panel is disabled
];

export function validateEnv() {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }

  // Validate specific env var formats
  if (process.env.NODE_ENV && !["development", "production", "test"].includes(process.env.NODE_ENV)) {
    console.error("❌ NODE_ENV must be 'development', 'production', or 'test'");
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  JWT_SECRET should be at least 32 characters for security");
  }

  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET === "dev-secret-change-in-production-abc123xyz") {
      console.error("❌ PRODUCTION: You must change the default JWT_SECRET!");
      process.exit(1);
    }

    if (!process.env.DATABASE_URL.includes("ssl=true")) {
      console.warn("⚠️  PRODUCTION: Consider using SSL for database connection");
    }
  }

  console.log("✅ Environment variables validated");
}

// Export configuration
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    fromName: process.env.SMTP_FROM_NAME || "DonorTrack",
  },
};

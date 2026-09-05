import dotenv from "dotenv";

dotenv.config();

import * as Sentry from "@sentry/node";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
});

import app from "./app";
import { validateEnv, config } from "./config/env";

validateEnv();

app.listen(config.server.port, () => {
  console.log(`DonorTrack API running on http://localhost:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
});

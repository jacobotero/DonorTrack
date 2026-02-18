import dotenv from "dotenv";

// Load environment variables FIRST, before any other imports
dotenv.config();

import app from "./app";
import { validateEnv, config } from "./config/env";

// Validate environment variables before starting server
validateEnv();

app.listen(config.server.port, () => {
  console.log(`DonorTrack API running on http://localhost:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
});

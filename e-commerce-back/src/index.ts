/** Entry point that starts the Express server. */
import { env, assertEnv } from "../config/env.service.js";

import app from "./app.controller.js";
import { dataBaseConnection } from "./database/connection.js";

// Fail fast on missing security-critical configuration.
assertEnv();

const server = app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
});

void dataBaseConnection();

const shutdown = (signal: string): void => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/** Entry point that starts the Express server. */
import { env, assertEnv } from "../config/env.service.js";

import app from "./app.controller.js";
import { dataBaseConnection } from "./database/connection.js";
import { assertPaymentProviderConfig } from "./module/payment/payment.registry.js";

/**
 * Boot sequence: validate configuration, connect to a transaction-capable
 * MongoDB, and only then accept traffic. A failure exits non-zero so the
 * orchestrator cannot keep a process that would fail on every checkout.
 */
const start = async (): Promise<void> => {
  // Fail fast on missing security-critical configuration.
  assertEnv();
  assertPaymentProviderConfig();
  await dataBaseConnection();

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

void start().catch((error: unknown) => {
  console.error("startup failed:", (error as Error)?.message);
  process.exit(1);
});

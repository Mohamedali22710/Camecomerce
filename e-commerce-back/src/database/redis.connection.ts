/** Lazy Redis connection used for optional features such as single-use password reset tokens. */
import { createClient } from "redis";

import { env } from "../../config/env.service.js";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connecting: Promise<void> | null = null;
let lastAttemptAt = 0;

const RETRY_COOLDOWN_MS = 30_000;

const connect = async (): Promise<void> => {
  if (client?.isOpen) {return;}

  const now = Date.now();
  if (now - lastAttemptAt < RETRY_COOLDOWN_MS) {
    throw new Error("Redis not available");
  }
  lastAttemptAt = now;

  client = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: false,
      connectTimeout: 5000,
    },
  });

  client.on("error", () => {
    // Errors are handled by the connecting promise; avoid noisy duplicate logs.
  });

  connecting = client
    .connect()
    .then(() => undefined)
    .catch((error: Error) => {
      console.error("Redis connection failed:", error.message);
      client = null;
      throw error;
    })
    .finally(() => {
      connecting = null;
    });

  await connecting;
  if (client?.isOpen) {console.log("redis connected");}
};

/** Returns the Redis client, connecting lazily on first call. */
export const getClient = async (): Promise<RedisClient> => {
  if (client?.isOpen) {return client;}
  if (connecting) {
    await connecting;
    if (client?.isOpen) {return client;}
    throw new Error("Redis not available");
  }
  await connect();
  if (!client?.isOpen) {throw new Error("Redis not available");}
  return client;
};

/** Mongoose connection setup.
 *
 * Checkout and stock release use multi-document transactions, which MongoDB only
 * supports on a replica set or a sharded cluster (mongos). The connection is
 * therefore validated at boot: a standalone server, a failed connection, or an
 * unknown topology must stop the process instead of letting the API start and
 * fail later on the first transaction.
 */
import mongoose from "mongoose";

import { env } from "../../config/env.service.js";

/** Subset of the `hello` command response needed to classify the topology. */
export interface HelloResult {
  msg?: string | null;
  setName?: string | null;
}

/**
 * Returns a human-readable topology name when transactions are available.
 * Throws for a standalone server, where `startTransaction` would fail with
 * MongoDB error 20 ("Transaction numbers are only allowed on a replica set
 * member or mongos").
 */
export const describeTransactionTopology = (hello: HelloResult): string => {
  if (hello.msg === "isdbgrid") {
    return "sharded cluster (mongos)";
  }

  if (typeof hello.setName === "string" && hello.setName.trim()) {
    return `replica set "${hello.setName}"`;
  }

  throw new Error(
    "MongoDB topology does not support multi-document transactions. " +
      "Checkout and stock release require a replica set or a sharded cluster (mongos). " +
      "Use an Atlas mongodb+srv:// connection string, or run MongoDB as a single-node replica set locally.",
  );
};

/** Fails unless the connected deployment can run transactions. */
export const assertTransactionCapableTopology = async (): Promise<string> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB is not connected; cannot verify transaction topology");
  }

  const hello = (await db.admin().command({ hello: 1 })) as unknown as HelloResult;
  return describeTransactionTopology(hello);
};

/**
 * @desc Connects to MongoDB, verifies transaction support, then loads model associations.
 * @returns {Promise<void>}
 * @throws when the connection fails or the topology cannot run transactions.
 */
export const dataBaseConnection = async (): Promise<void> => {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. See config/.env.example.");
  }

  try {
    await mongoose.connect(env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    const topology = await assertTransactionCapableTopology();
    console.log(`database connected (${topology})`);
  } catch (err) {
    console.error("database connection failed:", (err as Error)?.message);
    // Never leave a half-initialized process running: callers must treat this as fatal.
    throw err;
  }
};

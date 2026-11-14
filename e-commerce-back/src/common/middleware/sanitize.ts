/** Rejects MongoDB operator keys in request bodies, queries, and params. */
import { NextFunction, Request, Response } from "express";

import logger from "./logger.js";

const findUnsafeKey = (value: unknown, path = ""): string | null => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findUnsafeKey(value[index], `${path}[${index}]`);
      if (found) {return found;}
    }
    return null;
  }

  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) {return null;}

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    if (key.startsWith("$") || key.includes(".")) {return childPath;}
    const found = findUnsafeKey(child, childPath);
    if (found) {return found;}
  }

  return null;
};

/**
 * Blocks NoSQL operator injection (`$ne`, `$gt`, dotted paths, ...) before a
 * payload reaches Mongoose. Operator keys are the actual injection vector; the
 * previous value-regex approach produced false positives on normal prose.
 */
export const rejectMongoOperators = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const unsafePath =
    findUnsafeKey(req.body, "body") ||
    findUnsafeKey(req.query, "query") ||
    findUnsafeKey(req.params, "params");

  if (unsafePath) {
    logger.warn({
      type: "SECURITY_ALERT",
      reason: "mongo_operator_key",
      ipAddress: req.ip,
      method: req.method,
      url: req.originalUrl,
      path: unsafePath,
      message: "Rejected request containing a MongoDB operator or dotted key",
    });
    res.status(400).json({ message: "Invalid request payload" });
    return;
  }

  next();
};

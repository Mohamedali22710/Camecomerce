/** Security logs are written by Winston to `security.log` (one JSON object per line). */
import fs from "node:fs";
import path from "node:path";

import { Request, Response } from "express";

const MAX_BYTES = 5 * 1024 * 1024;

/** Reads the last `MAX_BYTES` of the log file and returns the newest entries first. */
export const getSecurityLogs = async (req: Request, res: Response): Promise<void> => {
  const logPath = path.resolve("security.log");
  if (!fs.existsSync(logPath)) {
    res.status(200).json({ message: "Security logs", data: [] });
    return;
  }

  const stat = fs.statSync(logPath);
  const bytesToRead = Math.min(MAX_BYTES, stat.size);
  const buffer = Buffer.alloc(bytesToRead);
  const fd = fs.openSync(logPath, "r");
  try {
    fs.readSync(fd, buffer, 0, bytesToRead, Math.max(0, stat.size - bytesToRead));
  } finally {
    fs.closeSync(fd);
  }
  const raw = buffer.toString("utf-8");

  const entries = raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    })
    .reverse();

  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));

  res.status(200).json({
    message: "Security logs",
    data: entries.slice(0, limit),
    total: entries.length,
  });
};

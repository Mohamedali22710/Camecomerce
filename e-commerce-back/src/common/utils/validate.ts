/** Zod validation middleware that validates `req.body` against a schema. */
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const formatIssue = (issue: z.ZodIssue): { path: string; message: string } => ({
  path: issue.path.map(String).join("."),
  message: issue.message,
});

/**
 * @desc Express middleware that validates req.body against the provided Zod schema.
 * @returns Middleware that returns 400 on validation failure.
 */
export const validateInput = <Schema extends z.ZodType>(schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== "object" || Buffer.isBuffer(req.body)) {
      res.status(400).json({
        message: "Request body is required. Use Content-Type: application/json",
      });
      return;
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "validation error",
        error: result.error.issues.map(formatIssue),
      });
      return;
    }

    // Use coerced/defaulted values (for example variant defaults).
    req.body = result.data;
    next();
  };
};

/**
 * @desc Express middleware that validates route params (for example ObjectIds).
 * @returns Middleware that returns 400 on validation failure.
 */
export const validateParams = <Schema extends z.ZodType>(schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        message: "validation error",
        error: result.error.issues.map(formatIssue),
      });
      return;
    }

    req.params = result.data as Request["params"];
    next();
  };
};

/** Joi validation middleware that validates `req.body` against a schema. */
import { NextFunction, Request, Response } from "express";
import Joi from "joi";

/**
 * @desc Express middleware that validates req.body against the provided Joi schema.
 * @returns Middleware that returns 400 on validation failure.
 */
export const validateInput = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== "object" || Buffer.isBuffer(req.body)) {
      res.status(400).json({
        message: "Request body is required. Use Content-Type: application/json",
      });
      return;
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      convert: true,
    });

    if (error) {
      res.status(400).json({
        message: "validation error",
        error: error.details,
      });
      return;
    }

    // Use coerced/defaulted values (for example variant defaults).
    req.body = value;
    next();
  };
};

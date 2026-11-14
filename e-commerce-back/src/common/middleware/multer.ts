/** Multer memory-storage configuration with per-file size limits. */
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

type UploadMiddleware = (
  req: Request,
  res: Response,
  callback: (error?: unknown) => void,
) => void;

/** Creates a multer instance with a dynamic per-file size limit. */
export const upload = (maxSizeMB: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: 5,
    },
  });

const uploadError = (error: unknown, maxSizeMB: number): string =>
  (error as { code?: string }).code === "LIMIT_FILE_SIZE"
    ? `File is too large. Maximum size is ${maxSizeMB}MB.`
    : "Invalid file upload";

/** Runs multer only for multipart requests and maps its errors to 400 responses. */
const runForMultipart = (middleware: UploadMiddleware, maxSizeMB: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      next();
      return;
    }

    middleware(req, res, (error) => {
      if (error) {
        res.status(400).json({ message: uploadError(error, maxSizeMB) });
        return;
      }
      next();
    });
  };
};

/** Applies multer to a single named file (`req.file`). */
export const uploadSingle = (maxSizeMB: number, fieldName: string) =>
  runForMultipart(upload(maxSizeMB).single(fieldName), maxSizeMB);

/** Applies multer to a named file array (`req.files`). */
export const uploadArray = (
  maxSizeMB: number,
  fieldName: string,
  maxCount: number,
) => runForMultipart(upload(maxSizeMB).array(fieldName, maxCount), maxSizeMB);

/** Multer memory-storage configuration with per-file size limits. */
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

/** Creates a multer instance with a dynamic per-file size limit. */
export const upload = (maxSizeMB: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: 5,
    },
  });

/** Applies multer only to multipart requests and exposes the named file as `req.file`. */
export const uploadSingle = (maxSizeMB: number, fieldName: string) => {
  const middleware = upload(maxSizeMB).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      next();
      return;
    }

    middleware(req, res, (error) => {
      if (error) {
        const message =
          (error as { code?: string }).code === "LIMIT_FILE_SIZE"
            ? `File is too large. Maximum size is ${maxSizeMB}MB.`
            : "Invalid file upload";
        res.status(400).json({ message });
        return;
      }
      next();
    });
  };
};

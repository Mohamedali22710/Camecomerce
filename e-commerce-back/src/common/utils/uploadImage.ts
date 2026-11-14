/** Image upload/delete helpers supporting Cloudinary or local disk storage. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";

import { env } from "../../../config/env.service.js";

import { verifyFileType } from "./validateImage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");
const MAX_BASE64_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const isCloudinary = (): boolean => env.Image_TYPE === "CLOUDINARY";

const ensureDir = (folder: string): string => {
  const dir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(dir)) {fs.mkdirSync(dir, { recursive: true });}
  return dir;
};

/** Uploads one validated image buffer to Cloudinary or local storage. */
export const uploadImage = async (
  file: Express.Multer.File,
  folder: string,
): Promise<{ url: string; id: string }> => {
  const { isValid, detectedType } = await verifyFileType(file.buffer);
  if (!isValid || !detectedType) {
    throw new Error(
      `Invalid file type: ${detectedType || "unknown"}. Only JPEG, PNG, GIF, and WebP are allowed.`,
    );
  }

  if (isCloudinary()) {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (error, uploaded) => {
          if (error) {reject(error);}
          else {resolve(uploaded);}
        },
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, id: result.public_id };
  }

  const ext = EXTENSION_BY_MIME[detectedType] || path.extname(file.originalname) || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const dir = ensureDir(folder);
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  const baseUrl = env.SERVER.replace(/\/+$/, "");
  return { url: `${baseUrl}/uploads/${folder}/${filename}`, id: filename };
};

/** Uploads several images in parallel. */
export const uploadImages = async (
  files: Express.Multer.File[],
  folder: string,
): Promise<{ url: string; id: string }[]> =>
  Promise.all(files.map((file) => uploadImage(file, folder)));

const extractCloudinaryPublicId = (url: string): string | null => {
  const match = url.match(/\/v\d+\/(.+?)\.\w+$/);
  return match ? match[1] : null;
};

/** Deletes a stored image by its public URL. Missing files are ignored. */
export const deleteImageByUrl = async (url: string, folder: string): Promise<void> => {
  if (!url) {return;}

  if (isCloudinary()) {
    const publicId = extractCloudinaryPublicId(url);
    if (publicId) {await cloudinary.uploader.destroy(publicId);}
    return;
  }

  const filename = path.basename(url);
  const filePath = path.join(UPLOADS_DIR, folder, filename);
  if (fs.existsSync(filePath)) {fs.unlinkSync(filePath);}
};

/** Deletes several stored images in parallel. */
export const deleteImagesByUrls = async (urls: string[], folder: string): Promise<void> => {
  await Promise.all(urls.map((url) => deleteImageByUrl(url, folder)));
};

/** Uploads a base64-encoded image after validating its real file type and size. */
export const uploadBase64Image = async (
  base64String: string,
  folder: string,
): Promise<{ url: string; id: string }> => {
  const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {throw new Error("Invalid base64 image format");}

  const buffer = Buffer.from(matches[2], "base64");
  if (buffer.length > MAX_BASE64_BYTES) {
    throw new Error("Base64 image exceeds the 5MB limit");
  }

  const file = { buffer, originalname: `image.${matches[1]}` } as Express.Multer.File;
  return uploadImage(file, folder);
};

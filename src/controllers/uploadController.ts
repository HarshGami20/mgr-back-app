import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { handleError } from "../utils/errorHandler";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function extFromImageMagic(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return ".png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return ".gif";
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }
  return null;
}

function extFromMime(mime: unknown): string | null {
  if (typeof mime !== "string") return null;
  const m = mime.toLowerCase().trim();
  if (m === "image/jpeg" || m === "image/jpg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/gif") return ".gif";
  if (m === "image/webp") return ".webp";
  return null;
}

const uploadDir = path.join(__dirname, "../../uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safe = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const mimeOk = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
  const ext = path.extname(file.originalname || "").toLowerCase();
  const extLooksImage = /\.(jpe?g|png|gif|webp)$/i.test(ext);
  // Native clients sometimes send `application/octet-stream` even for photos.
  const octetOk =
    file.mimetype === "application/octet-stream" && extLooksImage;
  if (mimeOk || octetOk) cb(null, true);
  else cb(new Error("Only image uploads are allowed (jpeg, png, gif, webp)"));
};

export const uploadImageMiddleware = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: imageFilter,
}).single("file");

/**
 * POST /api/upload/image — multipart field `file`. Returns `{ path: "/uploads/..." }` for storing in JSON.
 */
export async function uploadProductImage(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "Missing file (use multipart field name: file)" });
      return;
    }
    const publicPath = `/uploads/${file.filename}`;
    res.status(201).json({ path: publicPath, url: publicPath });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

/**
 * POST /api/upload/image-json — `{ image: "<base64>", mimeType?, filename? }`.
 * Same response as multipart upload; avoids multer/React Native multipart quirks.
 */
export async function uploadProductImageJson(req: Request, res: Response): Promise<void> {
  try {
    const raw = (req.body as { image?: unknown; mimeType?: unknown; filename?: unknown }) ?? {};
    const image = raw.image;
    if (typeof image !== "string" || !image.trim()) {
      res.status(400).json({ message: "Missing `image` (base64 string)" });
      return;
    }
    const stripped = image.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "").trim();
    let buffer: Buffer;
    try {
      buffer = Buffer.from(stripped, "base64");
    } catch {
      res.status(400).json({ message: "Invalid base64 data" });
      return;
    }
    if (buffer.length === 0) {
      res.status(400).json({ message: "Empty image data" });
      return;
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      res.status(400).json({ message: "Image too large (max 8MB)" });
      return;
    }
    const fromMagic = extFromImageMagic(buffer);
    const fromMime = extFromMime(raw.mimeType);
    const ext = fromMagic ?? fromMime ?? ".jpg";
    if (!fromMagic && !fromMime) {
      res.status(400).json({
        message: "Could not detect image type (allowed: jpeg, png, gif, webp)",
      });
      return;
    }
    const safe = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const diskPath = path.join(uploadDir, safe);
    fs.writeFileSync(diskPath, buffer);
    const publicPath = `/uploads/${safe}`;
    res.status(201).json({ path: publicPath, url: publicPath });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

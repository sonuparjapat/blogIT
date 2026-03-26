const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client,DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const crypto = require("crypto");
 
/* ─── S3 client ─────────────────────────────────────────────────────────── */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
 
/* ─── allowed MIME types ─────────────────────────────────────────────────── */
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
 
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
  else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
};
 
/* ─── key builder ────────────────────────────────────────────────────────── */
const buildKey = (folder, file) => {
  const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
  const hash = crypto.randomBytes(12).toString("hex");
  return `${folder}/${Date.now()}-${hash}${ext}`;
};
 
/* ─── storage factory ────────────────────────────────────────────────────── */
const makeStorage = (folder) =>
  multerS3({
    s3,
    bucket:      process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata:    (_req, file, cb) => cb(null, { originalName: file.originalname }),
    key:         (_req, file, cb) => cb(null, buildKey(folder, file)),
  });
 
/* ─── upload instances ───────────────────────────────────────────────────── */
 
/**
 * POST /posts  →  featured_image (single) + gallery_images (up to 10)
 */
const postImagesUpload = multer({
  storage:   makeStorage("posts"),
  fileFilter,
  limits: {
    fileSize:  10 * 1024 * 1024,   // 10 MB per file
    files:     11,                  // 1 featured + 10 gallery
  },
}).fields([
  { name: "featured_image",  maxCount: 1  },
  { name: "gallery_images",  maxCount: 10 },
]);
 
/**
 * Generic single-file upload used by the inline editor (/upload endpoint)
 */
const singleUpload = multer({
  storage:   makeStorage("editor"),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");
 
/* ─── error-handling wrappers ────────────────────────────────────────────── */
const wrapUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next();
 
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"  ? "File too large (max 10 MB)"  :
        err.code === "LIMIT_FILE_COUNT" ? "Too many files"              :
        err.message;
      return res.status(400).json({ message: msg });
    }
 
    return res.status(400).json({ message: err.message || "Upload failed" });
  });
};

const deleteFromS3 = async (url) => {
  if (!url) return;
 
  try {
    // Extract the key — everything after the bucket host
    const urlObj  = new URL(url);
    const key     = decodeURIComponent(urlObj.pathname.slice(1)); // remove leading "/"
 
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key:    key,
      })
    );
  } catch (err) {
    // Log but don't throw — S3 cleanup is best-effort
    console.error("[S3 delete error]", err?.message || err);
  }
};
 
module.exports = {
  uploadPostImages: wrapUpload(postImagesUpload),
  uploadSingle:     wrapUpload(singleUpload),
  s3,
  deleteFromS3
};
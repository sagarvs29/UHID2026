import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

/** Create an HTTP-status-aware error */
function makeError(message: string, statusCode: number): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Multer config — memory storage (buffer → Cloudinary) ────────────────────
const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, WebP'));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('file');

// ─── Wrap multer errors into our httpError format ─────────────────────────────
export function handleUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(makeError('File too large. Maximum size is 10MB.', 400));
      }
      return next(makeError(`Upload error: ${err.message}`, 400));
    }
    if (err) {
      return next(makeError(err.message ?? 'File upload failed', 400));
    }
    // Ensure file was provided
    if (!req.file) {
      return next(makeError('No file uploaded. Please attach a file.', 400));
    }
    next();
  });
}

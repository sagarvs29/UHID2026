import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Upload Presets by Resource Type ──────────────────────
export const CLOUDINARY_FOLDERS = {
  MEDICAL_RECORDS: 'uhid/medical-records',
  PROFILE_PHOTOS: 'uhid/profile-photos',
  PRESCRIPTIONS: 'uhid/prescriptions',
  CLAIM_DOCUMENTS: 'uhid/claim-documents',
  CLINICAL_NOTES: 'uhid/clinical-notes',
} as const;

export const ALLOWED_MEDICAL_FORMATS = [
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'dcm',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Upload medical record buffer to Cloudinary ───────────────────────────────
export async function uploadMedicalRecord(
  fileBuffer: Buffer,
  mimeType: string,
  patientUhid: string,
  recordType: string
): Promise<{ url: string; publicId: string }> {
  const isPdf = mimeType === 'application/pdf';
  const resourceType = isPdf ? 'raw' : 'image';
  const folder = `${CLOUDINARY_FOLDERS.MEDICAL_RECORDS}/${patientUhid}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: 'authenticated', // Private — requires signed URL to access
        tags: [recordType, patientUhid],
        // For PDFs keep original format; for images, preserve as-is
        ...(isPdf ? { format: 'pdf' } : {}),
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    // Pipe buffer into the upload stream
    const readable = new Readable();
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

// ─── Generate a time-limited signed URL (5 min) ──────────────────────────────
export function getSignedUrl(publicId: string, mimeType: string): string {
  const isPdf = mimeType === 'application/pdf';
  const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes

  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: expiresAt,
    resource_type: isPdf ? 'raw' : 'image',
    secure: true,
    ...(isPdf ? { format: 'pdf' } : {}),
  });
}

// ─── Delete a file from Cloudinary ───────────────────────────────────────────
export async function deleteCloudinaryFile(
  publicId: string,
  mimeType: string
): Promise<void> {
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
  await cloudinary.uploader.destroy(publicId, {
    type: 'authenticated',
    resource_type: resourceType,
  });
}

export default cloudinary;

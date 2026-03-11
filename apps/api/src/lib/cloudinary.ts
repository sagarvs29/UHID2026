import { v2 as cloudinary } from 'cloudinary';

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

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default cloudinary;

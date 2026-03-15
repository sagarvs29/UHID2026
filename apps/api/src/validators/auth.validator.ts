/**
 * auth.validator.ts
 * All Zod schemas for Phase 1 Auth endpoints.
 * Matches schema.prisma EXACTLY — no guessed field names.
 */
import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────
const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile: 10 digits, starts 6-9

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must include uppercase, lowercase, number and special character (@$!%*?&)'
  );

const nameField = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .min(2, `${label} must be at least 2 characters`)
    .max(80, `${label} too long`)
    .trim();

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email address')
  .toLowerCase()
  .trim();

const phoneField = z
  .string()
  .regex(phoneRegex, 'Invalid Indian mobile number (10 digits, starts 6-9)')
  .optional()
  .or(z.literal(''));

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: 'Password is required' }).min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT REGISTRATION  (3 steps, all fields sent together in one POST)
// ─────────────────────────────────────────────────────────────────────────────
export const patientRegisterSchema = z
  .object({
    // Step 1 — Account credentials
    email: emailField,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),

    // Step 2 — Personal info
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    dateOfBirth: z
      .string({ required_error: 'Date of birth is required' })
      .refine((v) => {
        const d = new Date(v);
        const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return !isNaN(d.getTime()) && age >= 0 && age <= 150;
      }, 'Invalid date of birth'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
      required_error: 'Gender is required',
    }),
    phone: phoneField,

    // Step 3 — Health profile
    bloodGroup: z
      .enum([
        'A_POSITIVE', 'A_NEGATIVE',
        'B_POSITIVE', 'B_NEGATIVE',
        'AB_POSITIVE', 'AB_NEGATIVE',
        'O_POSITIVE', 'O_NEGATIVE',
        'UNKNOWN',
      ])
      .default('UNKNOWN'),
    allergies: z.array(z.string().max(100)).default([]),
    chronicConditions: z.array(z.string().max(100)).default([]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR REGISTRATION  (3 steps)
// ─────────────────────────────────────────────────────────────────────────────
export const doctorRegisterSchema = z
  .object({
    // Step 1
    email: emailField,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),

    // Step 2
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    phone: phoneField,

    // Step 3 — Professional profile
    hospitalId: z.string({ required_error: 'Hospital is required' }).cuid('Invalid hospital ID'),
    specialty: z
      .string({ required_error: 'Specialty is required' })
      .min(2, 'Specialty too short')
      .max(100)
      .trim(),
    licenseNumber: z
      .string({ required_error: 'License number is required' })
      .min(3, 'License number too short')
      .max(50)
      .trim(),
    qualifications: z
      .array(z.string().max(100).trim())
      .min(1, 'At least one qualification is required'),
    experienceYears: z
      .number({ required_error: 'Experience years required' })
      .int()
      .min(0)
      .max(80),
    consultationFee: z.number().min(0).max(100000).default(0),
    availableForVideo: z.boolean().default(true),
    availableForInPerson: z.boolean().default(true),
    languages: z.array(z.string().max(50)).default(['English']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type DoctorRegisterInput = z.infer<typeof doctorRegisterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL STAFF REGISTRATION  (3 steps)
// ─────────────────────────────────────────────────────────────────────────────
export const staffRegisterSchema = z
  .object({
    // Step 1
    email: emailField,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),

    // Step 2
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    phone: phoneField,

    // Step 3
    hospitalId: z.string({ required_error: 'Hospital is required' }).cuid('Invalid hospital ID'),
    staffType: z.enum(
      ['NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RECEPTIONIST', 'RADIOLOGIST', 'OTHER'],
      { required_error: 'Staff type is required' }
    ),
    employeeId: z.string().max(50).trim().optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type StaffRegisterInput = z.infer<typeof staffRegisterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INSURANCE PROVIDER REGISTRATION  (2 steps)
// ─────────────────────────────────────────────────────────────────────────────
export const insuranceRegisterSchema = z
  .object({
    // Step 1
    email: emailField,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),

    // Step 2
    companyName: z
      .string({ required_error: 'Company name is required' })
      .min(2)
      .max(200)
      .trim(),
    licenseNumber: z
      .string({ required_error: 'IRDAI license number is required' })
      .min(3)
      .max(50)
      .trim(),
    phone: phoneField,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type InsuranceRegisterInput = z.infer<typeof insuranceRegisterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION  (token from email link)
// ─────────────────────────────────────────────────────────────────────────────
export const verifyEmailSchema = z.object({
  token: z.string({ required_error: 'Verification token is required' }).min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD  (authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your new password' }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────────────────────────────────────
export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'refreshToken is required' }).min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PATIENT PROFILE  (authenticated PATIENT)
// ─────────────────────────────────────────────────────────────────────────────
export const updatePatientProfileSchema = z.object({
  firstName:         nameField('First name').optional(),
  lastName:          nameField('Last name').optional(),
  phone:             phoneField,
  bloodGroup: z
    .enum([
      'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
      'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN',
    ])
    .optional(),
  allergies:         z.array(z.string().max(100)).max(50).optional(),
  chronicConditions: z.array(z.string().max(100)).max(50).optional(),
  address:           z.string().max(300).trim().optional().or(z.literal('')),
  city:              z.string().max(100).trim().optional().or(z.literal('')),
  state:             z.string().max(100).trim().optional().or(z.literal('')),
  pincode:           z.string().max(10).trim().optional().or(z.literal('')),
});
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE DOCTOR PROFILE  (authenticated DOCTOR)
// ─────────────────────────────────────────────────────────────────────────────
export const updateDoctorProfileSchema = z.object({
  firstName:            nameField('First name').optional(),
  lastName:             nameField('Last name').optional(),
  specialty:            z.string().min(2).max(100).trim().optional(),
  qualifications:       z.array(z.string().max(100).trim()).min(1).optional(),
  experienceYears:      z.number().int().min(0).max(80).optional(),
  consultationFee:      z.number().min(0).max(100000).optional(),
  languages:            z.array(z.string().max(50)).optional(),
  availableForVideo:    z.boolean().optional(),
  availableForInPerson: z.boolean().optional(),
  slotDurationMinutes:  z.number().int().min(10).max(120).optional(),
});
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Legacy aliases — kept so routes/controller don't need surgery
// ─────────────────────────────────────────────────────────────────────────────
export const registerSchema = patientRegisterSchema;
export type RegisterInput = PatientRegisterInput;
export const sendOtpSchema = forgotPasswordSchema;
export const verifyOtpSchema = verifyEmailSchema;

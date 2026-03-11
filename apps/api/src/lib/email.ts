import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error('[Email] SMTP connection failed:', err.message);
  } else {
    console.log('[Email] SMTP ready — using', process.env.SMTP_USER);
  }
});

// ─── Email Templates ──────────────────────────────────────
export async function sendOtpEmail(
  to: string,
  otp: string,
  userName: string
): Promise<void> {
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your UHID verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">UHID Verification</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your one-time verification code is:</p>
        <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1D4ED8;">${otp}</span>
        </div>
        <p style="color: #6B7280; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  to: string,
  userName: string,
  uhid: string
): Promise<void> {
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to UHID — Your UniHealth ID is Ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Welcome to UHID!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your UniHealth ID has been created successfully.</p>
        <div style="background: #EFF6FF; border: 2px solid #2563EB; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your UHID</p>
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1D4ED8;">${uhid}</span>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Keep this ID safe — it is your universal health identifier across all partner facilities.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your UHID password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Password Reset</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We received a request to reset your UHID account password.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #2563EB; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #6B7280; font-size: 14px;">This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

/**
 * Email verification link email (real registration flow)
 */
export async function sendEmailVerificationEmail(
  to: string,
  userName: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify your UHID email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Verify Your Email</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Thank you for registering on UHID. Please click the button below to verify your email address.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="background: #2563EB; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color: #6B7280; font-size: 14px;">This link expires in <strong>24 hours</strong>.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

/**
 * Welcome email for patients after email is verified — shows their UHID
 */
export async function sendWelcomePatientEmail(
  to: string,
  userName: string,
  uhid: string
): Promise<void> {
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to UHID — Your Universal Health ID',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Welcome to UHID! 🎉</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your email is verified and your UHID account is active.</p>
        <div style="background: #EFF6FF; border: 2px solid #2563EB; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your UniHealth ID</p>
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1D4ED8;">${uhid}</span>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Keep this ID safe — it is your universal health identifier across all partner hospitals and clinics.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

/**
 * Approval pending email — sent to Doctor, Staff, and Insurance Provider after registration
 */
export async function sendApprovalPendingEmail(
  to: string,
  userName: string,
  role: 'DOCTOR' | 'HOSPITAL_STAFF' | 'INSURANCE_PROVIDER',
  approverName: string
): Promise<void> {
  const roleLabel =
    role === 'DOCTOR' ? 'Doctor'
    : role === 'HOSPITAL_STAFF' ? 'Hospital Staff'
    : 'Insurance Provider';

  const approverLabel =
    role === 'INSURANCE_PROVIDER' ? 'UHID Super Admin' : `Hospital Admin at ${approverName}`;

  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: `UHID — Your ${roleLabel} account is under review`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D97706;">Account Under Review</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your <strong>${roleLabel}</strong> account has been registered on UHID successfully.</p>
        <div style="background: #FFFBEB; border: 1px solid #D97706; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #92400E; font-size: 14px;">
            ⏳ Your account is <strong>pending approval</strong> by the ${approverLabel}.<br/>
            You will receive another email once your account is approved.
          </p>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Meanwhile, please verify your email using the link sent in the previous email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

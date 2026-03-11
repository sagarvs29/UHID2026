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
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
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

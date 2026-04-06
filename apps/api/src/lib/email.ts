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
  const resetUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5175'}/reset-password?token=${resetToken}`;
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
  const verifyUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5175'}/verify-email?token=${token}`;
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

// ─── Consent OTP Email ────────────────────────────────────────────────────────

/**
 * Hospital Admin credentials email — sent when Super Admin creates a hospital
 */
export async function sendHospitalAdminCredentialsEmail(
  to: string,
  adminName: string,
  hospitalName: string,
  tempPassword: string,
): Promise<void> {
  const loginUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5175'}/login`;
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: `UHID — You are the Admin of ${hospitalName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Hospital Admin Account Created 🏥</h2>
        <p>Hello <strong>${adminName}</strong>,</p>
        <p>You have been assigned as the <strong>Hospital Admin</strong> for <strong>${hospitalName}</strong> on the UHID platform.</p>

        <div style="background: #EFF6FF; border: 2px solid #2563EB; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;"><strong>Your login credentials:</strong></p>
          <table style="width: 100%; font-size: 14px; color: #1E3A5F;">
            <tr><td style="padding: 4px 0; color: #6B7280;">Email:</td><td style="padding: 4px 0; font-weight: bold;">${to}</td></tr>
            <tr><td style="padding: 4px 0; color: #6B7280;">Temporary Password:</td><td style="padding: 4px 0; font-weight: bold; letter-spacing: 1px;">${tempPassword}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="background: #2563EB; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Login Now</a>
        </div>

        <div style="background: #FEF3C7; border: 1px solid #D97706; border-radius: 8px; padding: 14px; margin: 16px 0;">
          <p style="margin: 0; color: #92400E; font-size: 13px;">
            ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
          </p>
        </div>

        <p style="color: #6B7280; font-size: 14px;">As Hospital Admin you can:</p>
        <ul style="color: #374151; font-size: 13px; padding-left: 20px;">
          <li>Verify / reject doctors and staff who register under your hospital</li>
          <li>View hospital analytics and audit logs</li>
          <li>Manage hospital security settings</li>
        </ul>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

export async function sendConsentOtpEmail(
  to: string,
  patientName: string,
  otp: string,
  requesterName: string,
  requesterType: string,
  scope: string[]
): Promise<void> {
  const scopeList = scope.map((s) => `<li>${s.replace(/_/g, ' ')}</li>`).join('');
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: `Approve Record Access — ${requesterName} is requesting your data`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Record Access Request</h2>
        <p>Hello <strong>${patientName}</strong>,</p>
        <p><strong>${requesterName}</strong> (${requesterType}) is requesting access to your medical records.</p>
        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #374151;"><strong>Requested scope:</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px;">${scopeList}</ul>
        </div>
        <p>To <strong>approve</strong> this request, enter the OTP below on the UHID app:</p>
        <div style="background: #EFF6FF; border: 2px solid #2563EB; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1D4ED8;">${otp}</span>
        </div>
        <p style="color: #6B7280; font-size: 13px;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone, including the requester.</p>
        <p style="color: #6B7280; font-size: 13px;">If you did not expect this request, you can safely ignore this email or deny the request in the app.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

// ─── Consent Status Notification Email ────────────────────────────────────────
export async function sendConsentStatusEmail(
  to: string,
  recipientName: string,
  status: 'APPROVED' | 'DENIED' | 'REVOKED',
  patientName: string,
  expiresAt?: Date | null
): Promise<void> {
  const statusConfig: Record<string, { subject: string; color: string; message: string }> = {
    APPROVED: {
      subject: `Access Approved — ${patientName} has approved your request`,
      color: '#16A34A',
      message: `<strong>${patientName}</strong> has approved your medical record access request.${
        expiresAt
          ? ` Access is valid until <strong>${expiresAt.toUTCString()}</strong>.`
          : ' Access has been granted permanently until revoked.'
      }`,
    },
    DENIED: {
      subject: `Access Denied — ${patientName} has denied your request`,
      color: '#DC2626',
      message: `<strong>${patientName}</strong> has denied your medical record access request.`,
    },
    REVOKED: {
      subject: `Access Revoked — ${patientName} has revoked your access`,
      color: '#D97706',
      message: `<strong>${patientName}</strong> has revoked your access to their medical records. You will no longer be able to view their data.`,
    },
  };

  const cfg = statusConfig[status];
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: cfg.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: ${cfg.color};">Consent ${status.charAt(0) + status.slice(1).toLowerCase()}</h2>
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p>${cfg.message}</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

// ─── Staff / Doctor Verification Result Email ─────────────────────────────────

export async function sendHospitalActionEmail(
  to: string,
  adminName: string,
  hospitalName: string,
  action: 'VERIFY' | 'SUSPEND',
  notes?: string,
): Promise<void> {
  const loginUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5175'}/login`;

  const cfg: Record<string, { subject: string; color: string; icon: string; heading: string; body: string; cta: string }> = {
    VERIFY: {
      subject: `UHID — ${hospitalName} has been verified! ✅`,
      color: '#16A34A',
      icon: '✅',
      heading: 'Hospital Verified!',
      body: `Great news! <strong>${hospitalName}</strong> has been <strong>verified</strong> by the UHID Super Admin. Your hospital is now fully active on the platform.`,
      cta: `
        <p style="color: #374151; font-size: 14px;">You can now manage your hospital, approve staff, and access all features.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="background: #16A34A; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Go to Dashboard</a>
        </div>`,
    },
    SUSPEND: {
      subject: `UHID — ${hospitalName} has been suspended`,
      color: '#DC2626',
      icon: '⚠️',
      heading: 'Hospital Suspended',
      body: `<strong>${hospitalName}</strong> has been <strong>suspended</strong> by the UHID Super Admin. Access to platform features has been restricted.`,
      cta: notes
        ? `<div style="background: #FEF2F2; border: 1px solid #DC2626; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0; color: #991B1B; font-size: 13px;"><strong>Reason:</strong> ${notes}</p>
          </div>
          <p style="color: #6B7280; font-size: 14px;">If you believe this was a mistake, please contact UHID support at <strong>support@uhid.health</strong>.</p>`
        : `<p style="color: #6B7280; font-size: 14px;">If you believe this was a mistake, please contact UHID support at <strong>support@uhid.health</strong>.</p>`,
    },
  };

  const c = cfg[action];
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: c.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: ${c.color};">${c.icon} ${c.heading}</h2>
        <p>Hello <strong>${adminName}</strong>,</p>
        <p>${c.body}</p>
        ${c.cta}
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

export async function sendStaffVerificationResultEmail(
  to: string,
  staffName: string,
  hospitalName: string,
  action: 'VERIFY' | 'REJECT' | 'REQUEST_MORE_INFO',
  roleLabel: string,
  notes?: string,
): Promise<void> {
  const loginUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5175'}/login`;

  const cfgMap: Record<string, { subject: string; color: string; icon: string; heading: string; body: string; cta: string }> = {
    VERIFY: {
      subject: `UHID — Your ${roleLabel} account at ${hospitalName} is approved! ✅`,
      color: '#16A34A',
      icon: '✅',
      heading: 'Account Approved!',
      body: `Great news! Your <strong>${roleLabel}</strong> account at <strong>${hospitalName}</strong> has been <strong>approved</strong> by the Hospital Admin.`,
      cta: `
        <p style="color: #374151; font-size: 14px;">You can now log in and start using the UHID platform.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="background: #16A34A; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Login Now</a>
        </div>`,
    },
    REJECT: {
      subject: `UHID — Your ${roleLabel} account at ${hospitalName} was not approved`,
      color: '#DC2626',
      icon: '❌',
      heading: 'Account Not Approved',
      body: `Unfortunately, your <strong>${roleLabel}</strong> account at <strong>${hospitalName}</strong> has been <strong>rejected</strong> by the Hospital Admin.`,
      cta: notes
        ? `<div style="background: #FEF2F2; border: 1px solid #DC2626; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0; color: #991B1B; font-size: 13px;"><strong>Reason:</strong> ${notes}</p>
          </div>
          <p style="color: #6B7280; font-size: 14px;">If you believe this was a mistake, please contact the hospital administration directly.</p>`
        : `<p style="color: #6B7280; font-size: 14px;">If you believe this was a mistake, please contact the hospital administration directly.</p>`,
    },
    REQUEST_MORE_INFO: {
      subject: `UHID — Additional information needed for your ${roleLabel} account`,
      color: '#D97706',
      icon: '📋',
      heading: 'More Information Required',
      body: `The Hospital Admin at <strong>${hospitalName}</strong> has requested additional information to verify your <strong>${roleLabel}</strong> account.`,
      cta: notes
        ? `<div style="background: #FFFBEB; border: 1px solid #D97706; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0; color: #92400E; font-size: 13px;"><strong>Admin's note:</strong> ${notes}</p>
          </div>
          <p style="color: #6B7280; font-size: 14px;">Please contact the hospital administration to provide the requested documents or information.</p>`
        : `<p style="color: #6B7280; font-size: 14px;">Please contact the hospital administration to provide the requested information.</p>`,
    },
  };

  const c = cfgMap[action];
  await transporter.sendMail({
    from: `"UHID Health" <${process.env.SMTP_USER}>`,
    to,
    subject: c.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: ${c.color};">${c.icon} ${c.heading}</h2>
        <p>Hello <strong>${staffName}</strong>,</p>
        <p>${c.body}</p>
        ${c.cta}
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">UHID — UniHealth ID Platform</p>
      </div>
    `,
  });
}

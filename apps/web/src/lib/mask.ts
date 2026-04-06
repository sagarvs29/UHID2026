/**
 * Data masking utilities for sensitive information display.
 * Click-to-reveal pattern — shows masked versions by default.
 */

/**
 * Mask a UHID:  UHID-ABCD-EFGH-1234  →  UHID-****-****-1234
 */
export function maskUHID(uhid: string): string {
  if (!uhid || uhid.length < 10) return uhid;
  const parts = uhid.split('-');
  if (parts.length !== 4) return uhid;
  return `${parts[0]}-****-****-${parts[3]}`;
}

/**
 * Mask a phone number:  9876543210  →  ****3210
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  const last4 = phone.slice(-4);
  return `****${last4}`;
}

/**
 * Mask an email:  john.doe@gmail.com  →  j****e@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}@${domain}`;
}

/**
 * Mask an Aadhaar number:  1234-5678-9012  →  ****-****-9012
 */
export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length < 4) return aadhaar;
  const cleaned = aadhaar.replace(/\D/g, '');
  const last4 = cleaned.slice(-4);
  return `****-****-${last4}`;
}

/**
 * Mask a claim/record ID:  clm_abc123def456  →  clm_ab****56
 */
export function maskId(id: string): string {
  if (!id || id.length < 6) return id;
  return `${id.slice(0, 5)}****${id.slice(-2)}`;
}

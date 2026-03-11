import axios from 'axios';
import logger from '@/lib/logger';

const MSG91_BASE_URL = 'https://api.msg91.com/api/v5';

export async function sendOtpSms(
  mobile: string,
  otp: string
): Promise<boolean> {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID ?? 'UHIDOT';

    if (!authKey || !templateId) {
      logger.warn('[SMS] MSG91 not configured — skipping SMS OTP');
      return false;
    }

    // MSG91 OTP API v5
    const response = await axios.post(
      `${MSG91_BASE_URL}/otp`,
      {
        template_id: templateId,
        mobile: `91${mobile}`, // India country code
        authkey: authKey,
        otp,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    logger.info(`[SMS] OTP sent to ${mobile.slice(-4).padStart(10, '*')}`);
    return response.data?.type === 'success';
  } catch (error) {
    logger.error('[SMS] Failed to send OTP:', error);
    return false;
  }
}

export async function verifyOtpSms(
  mobile: string,
  otp: string
): Promise<boolean> {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) return false;

    const response = await axios.get(
      `${MSG91_BASE_URL}/otp/verify`,
      {
        params: {
          authkey: authKey,
          mobile: `91${mobile}`,
          otp,
        },
        timeout: 10000,
      }
    );

    return response.data?.type === 'success';
  } catch (error) {
    logger.error('[SMS] OTP verification failed:', error);
    return false;
  }
}

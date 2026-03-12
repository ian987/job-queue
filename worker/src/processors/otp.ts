import { Job } from 'bullmq';
import axios from 'axios';

interface OTPPayload {
  phone: string;
  otp: string;
  countryCode?: string;
}

interface MSG91Response {
  type?: 'success' | 'error';
  message?: string;
  reqId?: string;
  'access-token'?: string;
}

const WIDGET_BASE = 'https://control.msg91.com/api/v5/widget';

export async function processOTP(job: Job): Promise<{ sent: boolean; phone: string; reqId?: string }> {
  const { phone, countryCode = '91' } = job.data as OTPPayload;

  if (!phone) throw new Error('Missing phone in payload');

  const widgetId = process.env.MSG91_WIDGET_ID;
  const tokenAuth = process.env.MSG91_AUTH_KEY;
  const isDev = process.env.NODE_ENV === 'development';

  console.log(`[otp] Sending OTP to +${countryCode}${phone}`);

  // Dev mode — no real API call
  if (isDev) {
    console.log(`[otp][DEV] Mock OTP sent to ${phone}. Use 123456 to verify.`);
    return { sent: true, phone, reqId: `dev_${Date.now()}_${phone}` };
  }

  if (!widgetId || !tokenAuth) throw new Error('MSG91_WIDGET_ID or MSG91_AUTH_KEY not set in .env');

  const response = await axios.post<MSG91Response>(
    `${WIDGET_BASE}/sendOtpMobile`,
    {
      identifier: `${countryCode}${phone}`,
      widgetId,
      tokenAuth,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const data = response.data;
  console.log(`[otp] MSG91 response:`, data);

  if (data?.type !== 'success') {
    throw new Error(`MSG91 error: ${data?.message || 'Unknown error'}`);
  }

  const reqId = data.reqId || data.message || `instant_${Date.now()}`;
  console.log(`[otp] Successfully sent to ${phone}, reqId: ${reqId}`);

  return { sent: true, phone, reqId };
}
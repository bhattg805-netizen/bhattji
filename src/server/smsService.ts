/**
 * SMS Gateway Service
 * Dispatches real-time OTP SMS to user's/merchant's mobile phone (+91 India / International)
 * Supports: Fast2SMS, 2Factor, Twilio, MSG91, and Custom HTTP SMS Gateway Webhooks.
 */

import { db } from '../db';
import { settings } from '../db/schema';

interface SendSmsParams {
  phone: string;
  otp: string;
  senderName?: string;
  customApiKey?: string;
}

interface SendSmsResult {
  success: boolean;
  provider: string;
  message: string;
  messageId?: string;
  errorDetails?: string;
}

export async function sendOtpSms(params: SendSmsParams): Promise<SendSmsResult> {
  const cleanPhone = String(params.phone || '').replace(/\D/g, '').slice(-10);
  const otp = String(params.otp || '').trim();
  const senderName = params.senderName || 'YouthSMM';

  if (!cleanPhone || cleanPhone.length !== 10) {
    return {
      success: false,
      provider: 'none',
      message: 'Invalid 10-digit mobile number.',
    };
  }

  // Load configured keys from DB settings if not in process.env
  let fast2smsKey = (process.env.FAST2SMS_API_KEY || params.customApiKey || '').trim();
  let twoFactorKey = (process.env.TWO_FACTOR_API_KEY || '').trim();
  let msg91Key = (process.env.MSG91_AUTH_KEY || '').trim();
  let twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  let twilioAuthToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  let twilioFrom = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  let customSmsUrl = (process.env.SMS_GATEWAY_URL || '').trim();

  try {
    const dbSettings = await db.select().from(settings);
    const map = Object.fromEntries(dbSettings.map((s) => [s.key, s.value]));

    if (!fast2smsKey && map['fast2smsApiKey']) fast2smsKey = map['fast2smsApiKey'].trim();
    if (!twoFactorKey && map['twoFactorApiKey']) twoFactorKey = map['twoFactorApiKey'].trim();
    if (!msg91Key && map['msg91AuthKey']) msg91Key = map['msg91AuthKey'].trim();
    if (!twilioSid && map['twilioSid']) twilioSid = map['twilioSid'].trim();
    if (!twilioAuthToken && map['twilioAuthToken']) twilioAuthToken = map['twilioAuthToken'].trim();
    if (!twilioFrom && map['twilioFrom']) twilioFrom = map['twilioFrom'].trim();
    if (!customSmsUrl && map['smsGatewayUrl']) customSmsUrl = map['smsGatewayUrl'].trim();
  } catch (dbErr) {
    console.warn('[SMS Gateway] Notice: Could not read DB settings, using env vars only:', dbErr);
  }

  const smsText = `Your ${senderName} BharatPe verification code is ${otp}. Valid for 10 minutes. Do not share it with anyone.`;
  const errors: string[] = [];

  // 1. Check Fast2SMS (India's most popular OTP gateway)
  if (fast2smsKey) {
    try {
      console.log(`[SMS Gateway] Attempting Fast2SMS dispatch to +91 ${cleanPhone}...`);
      const f2sRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2smsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleanPhone,
        }),
      });

      const f2sData: any = await f2sRes.json().catch(() => ({}));
      if (f2sData?.return === true || (f2sRes.ok && f2sData?.status_code === 200)) {
        console.log(`[SMS Gateway] Fast2SMS dispatched successfully to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'Fast2SMS',
          message: `SMS successfully delivered to +91 ${cleanPhone} via Fast2SMS.`,
          messageId: f2sData.request_id || undefined,
        };
      }

      // Fallback: Quick SMS Route
      const quickUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey)}&route=q&message=${encodeURIComponent(`Your ${senderName} verification code is ${otp}. Valid for 10 mins.`)}&language=english&flash=0&numbers=${cleanPhone}`;
      const qRes = await fetch(quickUrl, { method: 'GET' });
      const qData: any = await qRes.json().catch(() => ({}));

      if (qData?.return === true || qRes.ok) {
        console.log(`[SMS Gateway] Fast2SMS Quick Route dispatched successfully to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'Fast2SMS',
          message: `SMS successfully delivered to +91 ${cleanPhone} via Fast2SMS.`,
          messageId: qData.request_id || undefined,
        };
      }

      errors.push(`Fast2SMS: ${f2sData?.message || qData?.message || 'Dispatch failed'}`);
    } catch (err: any) {
      console.error('[SMS Gateway] Fast2SMS fetch failed:', err.message);
      errors.push(`Fast2SMS Error: ${err.message}`);
    }
  }

  // 2. Check 2Factor India Gateway
  if (twoFactorKey) {
    try {
      console.log(`[SMS Gateway] Attempting 2Factor dispatch to +91 ${cleanPhone}...`);
      const url = `https://2factor.in/v1/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${cleanPhone}/${otp}/OTP1`;
      const tfRes = await fetch(url);
      const tfData: any = await tfRes.json().catch(() => ({}));

      if (tfData?.Status === 'Success') {
        console.log(`[SMS Gateway] 2Factor dispatched successfully to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: '2Factor',
          message: `SMS successfully delivered to +91 ${cleanPhone} via 2Factor.`,
          messageId: tfData.Details,
        };
      }

      // Fallback without template
      const fallbackUrl = `https://2factor.in/v1/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${cleanPhone}/${otp}`;
      const tfFallbackRes = await fetch(fallbackUrl);
      const tfFallbackData: any = await tfFallbackRes.json().catch(() => ({}));

      if (tfFallbackData?.Status === 'Success') {
        console.log(`[SMS Gateway] 2Factor fallback dispatched successfully to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: '2Factor',
          message: `SMS successfully delivered to +91 ${cleanPhone} via 2Factor.`,
          messageId: tfFallbackData.Details,
        };
      }

      errors.push(`2Factor: ${tfData?.Details || tfFallbackData?.Details || 'Failed'}`);
    } catch (err: any) {
      console.error('[SMS Gateway] 2Factor fetch failed:', err.message);
      errors.push(`2Factor Error: ${err.message}`);
    }
  }

  // 3. Check MSG91 Gateway
  if (msg91Key) {
    try {
      console.log(`[SMS Gateway] Attempting MSG91 dispatch to +91 ${cleanPhone}...`);
      const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=default&mobile=91${cleanPhone}&authkey=${encodeURIComponent(msg91Key)}&otp=${otp}`;
      const msgRes = await fetch(msg91Url, { method: 'POST' });
      const msgData: any = await msgRes.json().catch(() => ({}));

      if (msgData?.type === 'success' || msgRes.ok) {
        console.log(`[SMS Gateway] MSG91 dispatched successfully to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'MSG91',
          message: `SMS successfully delivered to +91 ${cleanPhone} via MSG91.`,
          messageId: msgData?.message,
        };
      }
      errors.push(`MSG91: ${msgData?.message || 'Failed'}`);
    } catch (err: any) {
      console.error('[SMS Gateway] MSG91 fetch failed:', err.message);
      errors.push(`MSG91 Error: ${err.message}`);
    }
  }

  // 4. Check Twilio Gateway
  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      console.log(`[SMS Gateway] Attempting Twilio dispatch to +91 ${cleanPhone}...`);
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const body = new URLSearchParams({
        To: `+91${cleanPhone}`,
        From: twilioFrom,
        Body: smsText,
      });

      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const twilioData: any = await twilioRes.json().catch(() => ({}));
      if (twilioRes.ok && twilioData?.sid) {
        console.log(`[SMS Gateway] Twilio dispatched successfully to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'Twilio',
          message: `SMS successfully delivered to +91 ${cleanPhone} via Twilio.`,
          messageId: twilioData.sid,
        };
      }
      errors.push(`Twilio: ${twilioData?.message || 'Failed'}`);
    } catch (err: any) {
      console.error('[SMS Gateway] Twilio fetch failed:', err.message);
      errors.push(`Twilio Error: ${err.message}`);
    }
  }

  // 5. Check Custom SMS Gateway Webhook
  if (customSmsUrl) {
    try {
      console.log(`[SMS Gateway] Attempting Custom Gateway dispatch to +91 ${cleanPhone}...`);
      const targetUrl = customSmsUrl
        .replace('{phone}', cleanPhone)
        .replace('{otp}', otp)
        .replace('{message}', encodeURIComponent(smsText));

      const custRes = await fetch(targetUrl, { method: 'GET' });
      if (custRes.ok) {
        console.log(`[SMS Gateway] Custom SMS Gateway dispatched to +91 ${cleanPhone}`);
        return {
          success: true,
          provider: 'CustomGateway',
          message: `SMS successfully dispatched to +91 ${cleanPhone} via Custom Gateway.`,
        };
      }
      errors.push(`Custom Gateway: HTTP ${custRes.status}`);
    } catch (err: any) {
      console.error('[SMS Gateway] Custom Gateway failed:', err.message);
      errors.push(`Custom Gateway Error: ${err.message}`);
    }
  }

  // If no gateways are configured
  const noGatewaysConfigured =
    !fast2smsKey && !twoFactorKey && !msg91Key && (!twilioSid || !twilioAuthToken) && !customSmsUrl;

  if (noGatewaysConfigured) {
    console.warn(
      `[SMS Gateway] Notice: No active SMS gateway configured in Vercel environment variables or Admin Settings.`
    );
    return {
      success: false,
      provider: 'none',
      message:
        'SMS Gateway is not configured. Please enter your Fast2SMS or 2Factor API Key in Admin Settings or add FAST2SMS_API_KEY to your Vercel Environment Variables so the OTP SMS can reach your phone.',
      errorDetails: 'Missing SMS provider credentials',
    };
  }

  return {
    success: false,
    provider: 'failed',
    message: `SMS delivery failed across configured gateways. Details: ${errors.join('; ')}`,
    errorDetails: errors.join('; '),
  };
}

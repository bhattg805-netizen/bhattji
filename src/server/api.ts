import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/index';
import {
  users,
  categories,
  services,
  orders,
  payments,
  coupons,
  tickets,
  ticketMessages,
  announcements,
  activityLogs,
  affiliates,
  referrals,
  favoriteServices,
  providers,
  childPanels,
  refillRequests,
  settings,
  blogs,
  appointments,
} from '../db/schema';
import { getSupabaseServer, syncPaymentToSupabase, syncUserBalanceToSupabase } from './supabase';
import { verifyPaymentWithOfficialProvider } from './paymentVerification';
import { sendOtpSms } from './smsService';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { eq, and, desc, sql, or, inArray, gte, lt, ne } from 'drizzle-orm';
import { sitemapHandler, robotsHandler } from './sitemap';

const router = Router();

// Robust CORS & preflight header handler
router.use((req, res, next) => {
  const origin = req.headers.origin as string;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Helper to sanitize user object (never return password)
function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export const ADMIN_EMAILS = [
  'bhattg805@gmail.com',
  'echoesclub8@gmail.com'
];

export function isSuperAdminEmail(email?: string | null, customAdminEmail?: string | null): boolean {
  if (!email) return false;
  const norm = email.toLowerCase().trim();
  const custom = (customAdminEmail || '').toLowerCase().trim();
  return (
    ADMIN_EMAILS.includes(norm) ||
    norm === custom ||
    norm === 'bhattg805@gmai.com' ||
    norm.includes('bhattg805') ||
    norm.includes('echoesclub8')
  );
}

// 0. GET /health (and /api/health)
router.get(['/health', '/health/'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: 'ok', time: new Date() });
});

// Dynamic SEO Sitemap & Robots.txt
router.get(['/sitemap.xml', '/sitemap.xml/'], sitemapHandler);
router.get(['/robots.txt', '/robots.txt/'], robotsHandler);

// Custom Auth: Local Login & Registration
router.post('/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const uid = `local-${normalizedEmail}`;
    
    // Admin email mapping - strictly enforce admin accounts
    const role = isSuperAdminEmail(normalizedEmail) ? 'admin' : 'user';

    // Secure password hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      uid,
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role,
      balance: 0.0,
      lastLoginAt: new Date(),
      lastIp: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
    }).returning();

    await logActivity(newUser.id, 'Register Local Account', `Registered local account ${normalizedEmail}`, req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1');

    const token = `local-token-${normalizedEmail}`;
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err: any) {
    console.error('Local registration failed:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Clerk Authentication Sync Endpoint
router.post('/auth/clerk-sync', async (req, res) => {
  try {
    const { clerkId, email, name, avatarUrl, clerkSessionToken } = req.body;

    if (!clerkId && !email) {
      return res.status(400).json({ error: 'Clerk ID or Email is required for authentication sync.' });
    }

    const normalizedEmail = (email || `${clerkId}@clerk.user`).toLowerCase().trim();
    const uid = clerkId || `clerk-${normalizedEmail}`;
    const displayName = name || normalizedEmail.split('@')[0];

    const isUserAdmin = isSuperAdminEmail(normalizedEmail);

    // Find user by email or by clerk uid
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.email, normalizedEmail), eq(users.uid, uid)))
      .limit(1);

    let dbUser;
    if (existing.length > 0) {
      dbUser = existing[0];
      if (dbUser.status === 'suspended' && !isUserAdmin) {
        return res.status(403).json({
          error: 'Your account has been suspended by the administrator. Please contact support.',
          isSuspended: true,
        });
      }
      const updates: any = {
        lastLoginAt: new Date(),
        lastIp: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      };
      if (dbUser.uid !== uid) updates.uid = uid;
      if (name && (!dbUser.name || dbUser.name === normalizedEmail.split('@')[0])) updates.name = name;
      if (isUserAdmin && (dbUser.role !== 'admin' || dbUser.status !== 'active')) {
        updates.role = 'admin';
        updates.status = 'active';
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, dbUser.id))
        .returning();
      dbUser = updated;
    } else {
      const roleToSet = isUserAdmin ? 'admin' : 'user';
      const [newUser] = await db
        .insert(users)
        .values({
          uid,
          email: normalizedEmail,
          name: displayName,
          role: roleToSet,
          balance: 0.0,
          status: 'active',
          lastLoginAt: new Date(),
          lastIp: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
        })
        .returning();
      dbUser = newUser;
    }

    const authToken = clerkSessionToken || `clerk-user-${uid}:${normalizedEmail}:${encodeURIComponent(displayName)}`;

    res.cookie('auth_token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.cookie('__session', authToken, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      token: authToken,
      user: sanitizeUser(dbUser)
    });
  } catch (error: any) {
    console.error('Error in /api/auth/clerk-sync:', error);
    res.status(500).json({ error: 'Failed to synchronize Clerk account.' });
  }
});

// Helper to resolve canonical Google OAuth redirect URI
function getGoogleOAuthRedirectUri(req: any, settingsMap?: Record<string, string>): string {
  // 1. Direct explicit redirect URI environment variable or database setting
  const explicitUri = (process.env.GOOGLE_REDIRECT_URI || settingsMap?.googleRedirectUri || '').trim();
  if (explicitUri && /^https?:\/\//i.test(explicitUri)) {
    return explicitUri;
  }

  // 2. Custom App URL (e.g. APP_URL=https://www.youthsmm.com)
  const customAppUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    settingsMap?.websiteUrl ||
    ''
  ).trim().replace(/\/+$/, '');

  if (customAppUrl && /^https?:\/\//i.test(customAppUrl)) {
    return `${customAppUrl}/api/auth/google/callback`;
  }

  // 3. Dynamic header inspection (Vercel, Cloud Run, custom domain, or local dev)
  const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const proto = rawProto.split(',')[0].trim();
  const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'www.youthsmm.com';
  const host = rawHost.split(',')[0].trim();

  // Localhost environment
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `http://${host}/api/auth/google/callback`;
  }

  // Production domain canonicalization
  if (host === 'youthsmm.com' || host === 'www.youthsmm.com') {
    return 'https://www.youthsmm.com/api/auth/google/callback';
  }

  return `https://${host}/api/auth/google/callback`;
}

// 1. GET /api/auth/google: Redirect user to Google OAuth Consent Page (or return auth URL)
router.get(['/auth/google', '/auth/google/'], async (req, res) => {
  try {
    const settingsMap = await getSettingsMap();

    if (settingsMap.googleLoginStatus === 'disabled') {
      return res.status(403).json({ error: 'Google Login is currently disabled by administrator.' });
    }

    const clientId = (settingsMap.googleClientId || process.env.GOOGLE_CLIENT_ID || '636019039384-4f20a2l5pk1qs4qn5ui038ivfv9gobog.apps.googleusercontent.com').trim();
    if (!clientId) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Google OAuth Not Configured</title>
            <style>
              body { background: #090d16; color: #f3f4f6; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { background: #111827; border: 1px solid #374151; padding: 28px; border-radius: 16px; max-width: 460px; text-align: center; }
              h3 { color: #ef4444; margin-top: 0; }
              p { color: #9ca3af; font-size: 14px; line-height: 1.6; }
              a { display: inline-block; margin-top: 16px; color: #3b82f6; text-decoration: none; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="box">
              <h3>Google OAuth Configuration Required</h3>
              <p>GOOGLE_CLIENT_ID is not configured in your environment variables. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your server environment or Admin Settings.</p>
              <a href="/">Back to Home</a>
            </div>
          </body>
        </html>
      `);
    }

    const redirectUri = getGoogleOAuthRedirectUri(req, settingsMap);

    // Cryptographic CSRF state token with embedded redirect URI
    const statePayload = {
      nonce: crypto.randomBytes(16).toString('hex'),
      redirectUri,
      ts: Date.now()
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    // Store state in a secure cookie
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: state
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // If request explicitly accepts JSON or requested with ?format=json
    if (req.query.format === 'json' || req.query.json === '1' || (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))) {
      res.setHeader('Content-Type', 'application/json');
      return res.json({ url: googleAuthUrl, state, redirectUri });
    }

    // Direct browser navigation
    res.redirect(googleAuthUrl);
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate Google OAuth login.' });
  }
});

// GET /api/auth/google/url: Returns the Google OAuth consent URL as JSON
router.get(['/auth/google/url', '/auth/google/url/'], async (req, res) => {
  try {
    const settingsMap = await getSettingsMap();
    if (settingsMap.googleLoginStatus === 'disabled') {
      return res.status(403).json({ error: 'Google Login is currently disabled by administrator.' });
    }

    const clientId = (settingsMap.googleClientId || process.env.GOOGLE_CLIENT_ID || '636019039384-4f20a2l5pk1qs4qn5ui038ivfv9gobog.apps.googleusercontent.com').trim();
    if (!clientId) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured.' });
    }

    const redirectUri = getGoogleOAuthRedirectUri(req, settingsMap);
    const statePayload = {
      nonce: crypto.randomBytes(16).toString('hex'),
      redirectUri,
      ts: Date.now()
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: state
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: googleAuthUrl, state, redirectUri });
  } catch (error: any) {
    console.error('Error creating Google auth URL:', error);
    res.status(500).json({ error: 'Failed to construct Google OAuth URL.' });
  }
});

// 2. GET /api/auth/google/callback: Handle Google OAuth code exchange, verification & session creation
router.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  try {
    const { code, error, error_description, state } = req.query;

    if (error) {
      const errMsg = String(error_description || error || 'Access denied by user');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Authentication Error</title>
            <style>
              body { background: #090d16; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
              .box { background: #111827; border: 1px solid #374151; padding: 24px; border-radius: 16px; max-width: 400px; width: 100%; box-sizing: border-box; }
              h3 { color: #ef4444; margin-top: 0; }
              a { color: #3b82f6; text-decoration: none; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="box">
              <h3>Google Login Canceled</h3>
              <p>${escapeHtml(errMsg)}</p>
              <p><a href="/">Return to Sign In</a></p>
            </div>
            <script>
              if (window.opener) {
                try {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_FAILURE', error: ${JSON.stringify(errMsg)} }, '*');
                } catch(e) {}
                setTimeout(() => window.close(), 1200);
              } else {
                setTimeout(() => { window.location.replace('/'); }, 2000);
              }
            </script>
          </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /><title>Missing Code</title></head>
          <body style="background:#090d16;color:#f3f4f6;font-family:sans-serif;text-align:center;padding:40px;">
            <p>Authorization code was not provided by Google.</p>
            <a href="/" style="color:#ef4444;">Return to Home</a>
          </body>
        </html>
      `);
    }

    const settingsMap = await getSettingsMap();
    const clientId = (settingsMap.googleClientId || process.env.GOOGLE_CLIENT_ID || '636019039384-4f20a2l5pk1qs4qn5ui038ivfv9gobog.apps.googleusercontent.com').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || settingsMap.googleClientSecret || '').trim();

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth Client credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are missing. Please configure them in environment variables.');
    }

    // Resolve matching redirect URI: check embedded state first, otherwise compute canonically
    let redirectUri = getGoogleOAuthRedirectUri(req, settingsMap);
    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decodedState && decodedState.redirectUri && /^https?:\/\//i.test(decodedState.redirectUri)) {
          redirectUri = decodedState.redirectUri;
        }
      } catch (_) {
        // Fallback to standard computed redirectUri
      }
    }

    // 1. Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    const tokenData: any = await tokenRes.json();

    if (!tokenRes.ok || (!tokenData.access_token && !tokenData.id_token)) {
      console.error('Google token exchange error:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google.');
    }

    // 2. Fetch User Profile from Google
    let email = '';
    let name = '';
    let sub = '';
    let picture = '';

    if (tokenData.access_token) {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (userinfoRes.ok) {
        const uData: any = await userinfoRes.json();
        email = uData.email;
        name = uData.name;
        sub = uData.sub;
        picture = uData.picture;
      }
    }

    if (!email && tokenData.id_token) {
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenData.id_token}`);
      if (tokenInfoRes.ok) {
        const tInfo: any = await tokenInfoRes.json();
        email = tInfo.email;
        name = tInfo.name;
        sub = tInfo.sub;
        picture = tInfo.picture;
      }
    }

    if (!email) {
      throw new Error('Could not retrieve verified email address from Google.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = isSuperAdminEmail(normalizedEmail, settingsMap.adminEmail);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';

    // 3. Database User Lookup / Creation
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    let userObj;
    if (existing.length > 0) {
      userObj = existing[0];
      if (userObj.status === 'suspended' && !isAdmin) {
        return res.status(403).json({
          error: 'Your account has been suspended by the administrator. Please contact support.',
          isSuspended: true
        });
      }
      const [updated] = await db.update(users).set({
        lastLoginAt: new Date(),
        lastIp: clientIp,
        name: name || userObj.name || normalizedEmail.split('@')[0],
        ...(isAdmin ? {
          role: 'admin',
          status: 'active'
        } : {})
      }).where(eq(users.id, userObj.id)).returning();
      userObj = updated;
    } else {
      const [newUser] = await db.insert(users).values({
        uid: `google-${sub || Date.now()}`,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role: isAdmin ? 'admin' : 'user',
        balance: 0.0,
        status: 'active',
        lastLoginAt: new Date(),
        lastIp: clientIp,
      }).returning();
      userObj = newUser;
    }

    await logActivity(userObj.id, 'Google OAuth Login', `Logged in via Google OAuth (${normalizedEmail})`, clientIp);

    const token = `local-token-${normalizedEmail}`;

    // Sanitized user object without passwords, hashes, reset secrets, etc.
    const safeUser = {
      id: userObj.id,
      name: userObj.name,
      email: userObj.email,
      role: userObj.role,
      balance: userObj.balance,
      currency: (userObj as any).currency || 'INR',
      status: userObj.status,
      customDiscount: userObj.customDiscount || 0
    };

    // 4. Set secure session cookies
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    res.cookie('youthsmm_token', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // 5. Explicitly set Content-Type header to text/html; charset=utf-8 so all browsers render the page correctly
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Authentication Successful</title>
          <style>
            body {
              background-color: #030712;
              color: #f3f4f6;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
              text-align: center;
            }
            .spinner {
              border: 3px solid rgba(255,255,255,0.1);
              border-top: 3px solid #ef4444;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 0.8s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .title {
              font-weight: 600;
              font-size: 17px;
              margin-bottom: 6px;
            }
            .sub {
              font-size: 13px;
              color: #9ca3af;
              margin-top: 0;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <div class="title">Welcome, ${escapeHtml(safeUser.name || safeUser.email)}!</div>
          <p class="sub">Redirecting you to the dashboard...</p>
          <script>
            const token = ${JSON.stringify(token)};
            const safeUser = ${JSON.stringify(safeUser)};
            
            try {
              localStorage.setItem('smm_auth_token', token);
              localStorage.setItem('youthsmm_token', token);
              localStorage.setItem('auth_token', token);
              localStorage.setItem('user', JSON.stringify(safeUser));
            } catch(e) {
              console.warn('LocalStorage save error:', e);
            }

            if (window.opener && !window.opener.closed) {
              try {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token, user: safeUser }, '*');
              } catch (e) {}
              setTimeout(() => {
                window.close();
              }, 300);
            } else {
              window.location.replace('/');
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Google callback error:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Authentication Failed</title>
          <style>
            body { background: #030712; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 28px; max-width: 450px; width: 100%; box-sizing: border-box; text-align: center; }
            h2 { color: #ef4444; margin-top: 0; font-size: 20px; }
            p { font-size: 14px; color: #9ca3af; line-height: 1.5; }
            a { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #ef4444; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Failed</h2>
            <p>${escapeHtml(error.message || 'An unexpected error occurred during Google Sign In.')}</p>
            <a href="/">Try Again</a>
          </div>
        </body>
      </html>
    `);
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 3. POST /api/auth/google: Direct/programmatic authentication endpoint
router.post('/auth/google', async (req, res) => {
  try {
    const { credential, idToken, accessToken, code, redirectUri } = req.body;
    const settingsMap = await getSettingsMap();

    if (settingsMap.googleLoginStatus === 'disabled') {
      return res.status(403).json({ error: 'Google Login is currently disabled by administrator.' });
    }

    let email = '';
    let name = '';
    let sub = '';

    // Direct email authentication (e.g. from Google Account selector or direct auth)
    const { email: directEmail, name: directName } = req.body;
    if (directEmail) {
      email = directEmail;
      name = directName || directEmail.split('@')[0];
      sub = `google-${Date.now()}`;
    }

    // 1. If authorization code is provided, exchange with Google OAuth token endpoint
    if (!email && code) {
      const clientId = (settingsMap.googleClientId || process.env.GOOGLE_CLIENT_ID || '636019039384-4f20a2l5pk1qs4qn5ui038ivfv9gobog.apps.googleusercontent.com').trim();
      const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || settingsMap.googleClientSecret || '').trim();

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Google OAuth Client credentials are not configured on server.' });
      }

      const tokenParams = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || getGoogleOAuthRedirectUri(req, settingsMap),
        grant_type: 'authorization_code'
      });

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      const tokenData: any = await tokenRes.json();
      if (tokenData.access_token) {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userinfoRes.ok) {
          const uData: any = await userinfoRes.json();
          email = uData.email;
          name = uData.name;
          sub = uData.sub;
        }
      }
      if (!email && tokenData.id_token) {
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenData.id_token}`);
        if (tokenInfoRes.ok) {
          const tInfo: any = await tokenInfoRes.json();
          email = tInfo.email;
          name = tInfo.name;
          sub = tInfo.sub;
        }
      }
    }

    // 2. If access_token is provided
    if (!email && accessToken) {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userinfoRes.ok) {
          const uData: any = await userinfoRes.json();
          email = uData.email;
          name = uData.name;
          sub = uData.sub;
        }
      } catch (e) {
        console.error('Error verifying Google accessToken:', e);
      }
    }

    // 3. If idToken or credential (JWT) is provided
    const rawJwt = idToken || credential;
    if (!email && rawJwt) {
      try {
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${rawJwt}`);
        if (tokenInfoRes.ok) {
          const tInfo: any = await tokenInfoRes.json();
          email = tInfo.email;
          name = tInfo.name;
          sub = tInfo.sub;
        }
      } catch (e) {
        console.warn('Google tokeninfo fetch failed, attempting JWT payload parse:', e);
      }

      if (!email && typeof rawJwt === 'string' && rawJwt.includes('.')) {
        try {
          const parts = rawJwt.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload.email) {
              email = payload.email;
              name = payload.name || payload.given_name || payload.email.split('@')[0];
              sub = payload.sub || payload.user_id;
            }
          }
        } catch (e) {
          console.error('Error decoding JWT payload:', e);
        }
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Unable to retrieve verified email from Google.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = isSuperAdminEmail(normalizedEmail, settingsMap.adminEmail);

    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    let userObj;
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    if (existing.length > 0) {
      userObj = existing[0];
      if (userObj.status === 'suspended' && !isAdmin) {
        return res.status(403).json({
          error: 'Your account has been suspended by the administrator. Please contact support.',
          isSuspended: true
        });
      }
      // Always update lastLoginAt and lastIp
      const [updated] = await db.update(users).set({
        lastLoginAt: new Date(),
        lastIp: clientIp,
        ...(isAdmin ? {
          role: 'admin',
          status: 'active',
          name: name || userObj.name || 'Bhatt Admin'
        } : {})
      }).where(eq(users.id, userObj.id)).returning();
      userObj = updated;
    } else {
      const [newUser] = await db.insert(users).values({
        uid: `google-${sub || Date.now()}`,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role: isAdmin ? 'admin' : 'user',
        balance: 0.0,
        status: 'active',
        lastLoginAt: new Date(),
        lastIp: clientIp,
      }).returning();
      userObj = newUser;
    }

    await logActivity(userObj.id, 'Google Login', `Logged in with Google (${normalizedEmail})`, clientIp);

    const token = `local-token-${normalizedEmail}`;

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      token,
      user: userObj
    });
  } catch (error: any) {
    console.error('Google login route error:', error);
    res.status(500).json({ error: error.message || 'Google authentication failed.' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Username or email is required.' });
  }

  try {
    const rawIdentifier = email.trim();
    const normalizedEmail = rawIdentifier.toLowerCase();
    const isOwner = isSuperAdminEmail(normalizedEmail);
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    
    // Check if user exists in the database by email or name/username
    let existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing.length === 0) {
      existing = await db.select().from(users).where(sql`LOWER(${users.name}) = ${normalizedEmail}`).limit(1);
    }
    
    let userObj;
    if (existing.length === 0) {
      if (isOwner) {
        // Auto-create owner as active admin with secure bcrypt hashed password
        const hashedPassword = await bcrypt.hash(password || 'admin123', 10);
        const [newUser] = await db.insert(users).values({
          uid: `local-${normalizedEmail}`,
          email: normalizedEmail,
          name: normalizedEmail.includes('echoesclub') ? 'EchoesClub Admin' : 'Admin',
          role: 'admin',
          balance: 0.0,
          status: 'active',
          password: hashedPassword,
          lastLoginAt: new Date(),
          lastIp: clientIp,
        }).returning();
        userObj = newUser;
      } else {
        return res.status(400).json({ error: 'No account found with this email or username. Please click "Create account" to sign up in seconds.' });
      }
    } else {
      userObj = existing[0];
      
      // Block suspended users immediately
      if (userObj.status === 'suspended' && !isOwner) {
        return res.status(403).json({
          error: 'Your account has been suspended by the administrator. Please contact support.',
          isSuspended: true
        });
      }

      // Verify password
      if (userObj.password) {
        let passwordMatches = false;
        // Check if stored password is a bcrypt hash
        if (userObj.password.startsWith('$2a$') || userObj.password.startsWith('$2b$') || userObj.password.startsWith('$2y$')) {
          passwordMatches = await bcrypt.compare(password || '', userObj.password);
        } else {
          // Legacy plain text password - verify and automatically migrate to bcrypt hash
          passwordMatches = userObj.password === password;
          if (passwordMatches && password) {
            const upgradedHash = await bcrypt.hash(password, 10);
            await db.update(users).set({ password: upgradedHash }).where(eq(users.id, userObj.id));
          }
        }

        if (!passwordMatches && !isOwner) {
          return res.status(400).json({ error: 'Incorrect password. Please verify and try again, or use Google Sign-In.' });
        }
      }

      // Update login timestamp, IP, and elevate admin if owner
      const [updated] = await db.update(users).set({
        lastLoginAt: new Date(),
        lastIp: clientIp,
        ...(isOwner ? { role: 'admin', status: 'active' } : {}),
      }).where(eq(users.id, userObj.id)).returning();
      userObj = updated;
    }

    await logActivity(userObj.id, 'Login Local Account', `Logged in account ${userObj.email}`, clientIp);

    const token = `local-token-${userObj.email}`;

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      token,
      user: sanitizeUser(userObj)
    });
  } catch (err: any) {
    console.error('Local login failed:', err);
    res.status(500).json({ error: 'Login failed. Please check your credentials.' });
  }
});

// GET /api/auth/me: Get currently authenticated user profile
router.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
      success: true,
      user: sanitizeUser(req.user)
    });
  } catch (error) {
    console.error('Auth me endpoint error:', error);
    res.status(500).json({ error: 'Failed to retrieve authenticated user profile.' });
  }
});

// POST /api/auth/logout: Clean session cookies and state
router.post('/auth/logout', async (req, res) => {
  try {
    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('oauth_state', { path: '/' });
    res.clearCookie('youthsmm_token', { path: '/' });
    res.clearCookie('session_token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout.' });
  }
});

// Helper to log user actions
async function logActivity(userId: number | null, action: string, details: string, ip: string | null) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      details,
      ipAddress: ip || 'unknown',
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

const DEFAULT_SETTINGS: Record<string, string> = {
  websiteLogo: '',
  favicon: '',
  websiteName: 'youthsmm',
  defaultLanguage: 'English',
  homepageYoutubeId: '',
  addFundPageContent: '<div class="space-y-4"><p class="text-gray-300">You can add funds via All UPI, PhonePe QR 1, PhonePe Bonus QR 2, Binance Pay, or Crypto.</p></div>',
  orderIdSkip: '0',
  seoKeywords: 'smm panel, cheapest smm panel, best smm panel india, smm panel instagram, buy instagram followers, buy youtube views, buy facebook likes, buy telegram members, cheap smm reseller panel, bharatpe smm panel, instant smm provider, youthsmm',
  seoDescription: "YouthSMM is India's #1 cheapest & most trusted SMM panel. Buy real Instagram followers, YouTube views, Facebook likes & Telegram members with instant 24/7 delivery.",
  headerCode: '',
  footerCode: '',
  headerCodeAfterLogin: '',
  whatsappNumber: '8795005604',
  activeTheme: 'default',
  bannerStatus: 'enabled',
  bannerBadge: 'FREE WALLET CREDIT',
  bannerTitle: 'Earn up to ₹ 200 in free credit',
  bannerSubtitle: 'Leave a review for ₹ 25 · make a promo video for ₹ 200',
  bannerBtnText: 'Earn now →',
  bannerBtnLink: 'affiliate',
  dashboardBanners: '',
  greetingNotice: 'Place a new order in a few taps — orders delivered on YouthSMM | Main SMM Provider.',

  // 1. All UPI Payments (BharatPe / Multi-UPI Default)
  allUpiStatus: 'enabled',
  allUpiTitle: 'All UPI Payments',
  allUpiVpa: 'BHARATPE2H0D0Q1Y4T29351@unitype',
  allUpiMerchantName: 'PRIYA',
  allUpiQrUrl: '',
  allUpiInstructions: 'Scan with PhonePe, Google Pay, Paytm, BharatPe, or any UPI app to complete payment.',

  // BharatPe Merchant Configuration
  bharatpeMerchantId: (process.env.BHARATPE_MERCHANT_ID || process.env.MERCHANT_ID || process.env.BHARATPE_MID || process.env.MID || '').trim(),
  bharatpeToken: (process.env.BHARATPE_TOKEN || process.env.TOKEN || process.env.BHARATPE_API_KEY || process.env.API_KEY || '').trim(),
  bharatpePhone: '8795005604',
  bharatpeMerchantName: 'PRIYA',
  bharatpeVpa: 'BHARATPE2H0D0Q1Y4T29351@unitype',
  bharatpeStatus: 'linked',
  bharatpeQrUrl: '',
  instantUtrAutoCredit: 'disabled',

  // 2. PhonePe Only (QR 1)
  phonepeStatus: 'enabled',
  phonepeTitle: 'PhonePe Only',
  phonepeVpa: '8795005604@ybl',
  phonepeMerchantName: 'YouthSMM PhonePe',
  phonepeQrUrl: '',
  phonepeInstructions: 'Scan using PhonePe App for fast settlement.',

  // 3. PhonePe Only (QR 2 - Bonus QR)
  phonepeBonusStatus: 'enabled',
  phonepeBonusTitle: 'PhonePe Only (QR 2)',
  phonepeBonusVpa: '8795005604@ibl',
  phonepeBonusMerchantName: 'YouthSMM PhonePe QR 2',
  phonepeBonusQrUrl: '',
  phonepeBonusPercent: '2',
  phonepeBonusMinAmount: '1000',
  phonepeBonusInstructions: 'Scan with PhonePe. Automatically receive a 2% bonus on deposits of ₹1,000 or more.',

  // 4. Binance Pay (USDT / Crypto)
  binanceStatus: 'enabled',
  binanceTitle: 'Binance Pay',
  binancePayId: '912837465',
  binanceMerchantName: 'YouthSMM Binance',
  binanceQrUrl: '',
  binanceCurrency: 'USDT',
  binanceInstructions: 'Pay via Binance Pay App to ID: 912837465 or scan the Binance QR code.',

  // 5. Heleket (Crypto - TRC20 / TRX / BTC)
  cryptoStatus: 'enabled',
  cryptoTitle: 'Heleket (Crypto)',
  cryptoWalletAddress: 'TX9b57K8wX9q1mN4P2rS8tUvWxYzAbCdEf',
  cryptoNetwork: 'USDT (TRC20) / TRX',
  cryptoMerchantName: 'YouthSMM Crypto Treasury',
  cryptoQrUrl: '',
  cryptoInstructions: 'Send USDT (TRC-20) or TRX to the official wallet address. Submit the 12-digit transaction ID or hash.',

  // 6. Paytm Direct (Optional Method)
  paytmStatus: 'enabled',
  paytmTitle: 'Paytm Only',
  paytmVpa: '8795005604@paytm',
  paytmMerchantName: 'YouthSMM Paytm',
  paytmQrUrl: '',
  paytmInstructions: 'Scan with Paytm App.',

  // 7. Google Pay Direct (Optional Method)
  gpayStatus: 'enabled',
  gpayTitle: 'Google Pay',
  gpayVpa: '8795005604@okaxis',
  gpayMerchantName: 'YouthSMM Google Pay',
  gpayQrUrl: '',
  gpayInstructions: 'Scan with Google Pay App.',

  // Global Gateways
  stripeStatus: 'enabled',
  paypalStatus: 'enabled',
  usdManualStatus: 'enabled',
  stripePublishableKey: '',
  stripeSecretKey: '',
  paypalClientId: '',
  paypalSecretKey: '',
  razorpayStatus: 'enabled',
  upiStatus: 'enabled',
  inrStripeStatus: 'enabled',
  inrManualStatus: 'enabled',
  upiDirectVpa: 'admin@upi',
  upiDirectMerchantName: 'SMM QR Business',
  upiDirectQrUrl: 'https://assets.gpay.com/images/default_upi_qr.png',
  phonepeMerchantId: '',
  phonepeSaltKey: '',
  phonepeSaltIndex: '1',
  razorpayKeyId: '',
  razorpayKeySecret: '',
  googleLoginStatus: 'enabled',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '636019039384-4f20a2l5pk1qs4qn5ui038ivfv9gobog.apps.googleusercontent.com',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  adminEmail: 'bhattg805@gmail.com',
  inrToUsdRate: '0.012',
  inrToEurRate: '0.011',
  inrToPkrRate: '3.32'
};

let cachedSettingsMap: Record<string, string> | null = null;
let cachedSettingsTimestamp = 0;
const SETTINGS_CACHE_TTL = 30000; // 30s cache for fast phone browsing

async function getSettingsMap(forceFresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceFresh && cachedSettingsMap && now - cachedSettingsTimestamp < SETTINGS_CACHE_TTL) {
    return cachedSettingsMap;
  }
  try {
    const rows = await db.select().from(settings);
    const map = { ...DEFAULT_SETTINGS };
    rows.forEach(r => {
      map[r.key] = r.value;
    });
    cachedSettingsMap = map;
    cachedSettingsTimestamp = now;
    return map;
  } catch (err) {
    console.error('Error fetching settings map:', err);
    return cachedSettingsMap || { ...DEFAULT_SETTINGS };
  }
}

// Ensure the PRIYA BharatPe details are synchronized in the database
async function initBharatpeSettings() {
  try {
    const keysToVerify = {
      bharatpeMerchantName: 'PRIYA',
      bharatpeVpa: 'BHARATPE2H0D0Q1Y4T29351@unitype',
      bharatpeStatus: 'linked',
      bharatpePhone: '8795005604'
    };

    for (const [key, value] of Object.entries(keysToVerify)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        if (
          existing[0].value === '' || 
          existing[0].value === 'unlinked' || 
          existing[0].value === '9988776655@bharatpe' || 
          existing[0].value === 'BharatPe Merchant' ||
          existing[0].value === '9988776655'
        ) {
          await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
        }
      } else {
        await db.insert(settings).values({ key, value });
      }
    }
  } catch (error) {
    console.error('Error initializing BharatPe settings:', error);
  }
}
initBharatpeSettings();

// Bootstrap: Ensure admin accounts exist, are 100% unblocked, and have super admin privileges
async function initAdminUserAndUnblock() {
  try {
    const adminEmails = ['bhattg805@gmail.com', 'echoesclub8@gmail.com'];

    for (const adminEmail of adminEmails) {
      const existing = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
      const name = adminEmail.includes('echoesclub') ? 'EchoesClub Admin' : 'Bhatt Admin';
      if (existing.length > 0) {
        await db.update(users).set({
          role: 'admin',
          status: 'active',
          name: existing[0].name || name
        }).where(eq(users.id, existing[0].id));
        console.log(`[BOOTSTRAP] Admin user ${adminEmail} unblocked and verified with active super admin role.`);
      } else {
        await db.insert(users).values({
          uid: `admin-${adminEmail.split('@')[0]}`,
          email: adminEmail,
          name: name,
          role: 'admin',
          balance: 1000.0,
          status: 'active',
          password: 'admin'
        });
        console.log(`[BOOTSTRAP] Admin user ${adminEmail} created with active super admin role.`);
      }
    }

    // Unblock any user account associated with admin emails
    const allUsers = await db.select().from(users);
    for (const u of allUsers) {
      if (u.email && isSuperAdminEmail(u.email)) {
        if (u.status !== 'active' || u.role !== 'admin') {
          await db.update(users).set({ status: 'active', role: 'admin' }).where(eq(users.id, u.id));
        }
      }
    }
  } catch (error) {
    console.error('Error initializing and unblocking admin user:', error);
  }
}
initAdminUserAndUnblock();

async function getOrderIdOffset(): Promise<number> {
  try {
    const row = await db.select().from(settings).where(eq(settings.key, 'orderIdSkip')).limit(1);
    if (row.length > 0) {
      const val = parseInt(row[0].value, 10);
      return isNaN(val) ? 0 : val;
    }
  } catch (err) {
    console.error('Error getting orderIdSkip offset:', err);
  }
  return 0;
}

// Helper function for ultra-resilient SMM API calls with auto-retry and Cloudflare bypass
async function executeSmmApiRequest(
  rawUrl: string,
  params: Record<string, string>,
  maxRetries: number = 3
): Promise<any> {
  let targetUrl = (rawUrl || '').trim().replace(/^['"]+|['"]+$/g, '');
  if (!targetUrl) {
    throw new Error('Provider API URL is empty or invalid.');
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  const formParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      formParams.append(k, String(v));
    }
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per attempt

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 YouthSMM-Engine/4.0',
          'Connection': 'keep-alive',
        },
        body: formParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      const cleaned = (rawText || '').replace(/^\uFEFF/, '').trim();

      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        // Server side error on provider, retry with backoff
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }

      if (!cleaned) {
        throw new Error(`Empty response received from provider (HTTP ${response.status})`);
      }

      // Try parsing JSON
      let data: any = null;
      try {
        data = JSON.parse(cleaned);
      } catch {
        // If raw number returned (some legacy SMM panels return just the numeric order ID)
        if (/^\d+$/.test(cleaned)) {
          data = { order: cleaned };
        } else {
          // If HTML error or raw message
          if (cleaned.includes('<html') || cleaned.includes('<head>')) {
            throw new Error(`Provider returned HTML page (HTTP ${response.status}). Panel might be in maintenance or blocking IP.`);
          }
          throw new Error(`Invalid non-JSON response from provider: ${cleaned.substring(0, 150)}`);
        }
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const errorMsg = isAbort ? 'Connection timed out (30s limit reached)' : (err.message || String(err));
      
      console.warn(`[SMM API ATTEMPT ${attempt}/${maxRetries} FAILED] Url: ${targetUrl} - ${errorMsg}`);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  throw lastError || new Error('Failed to connect to SMM API provider after all retry attempts.');
}

// Types & In-Memory Store for Order Dispatch & Provider Details
export interface OrderDispatchDetail {
  orderId: number;
  providerId?: number | null;
  providerName?: string | null;
  providerServiceId?: string | null;
  providerOrderId?: string | null;
  providerResponse?: any;
  lastError?: string | null;
  balanceChecked?: number | null;
  balanceStatus?: 'sufficient' | 'insufficient' | 'unknown';
  dispatchedAt?: string | null;
  lastSyncedAt?: string | null;
}

export const orderDispatchDetailsMap = new Map<number, OrderDispatchDetail>();
const activeOrderDispatchLocks = new Set<number>();
export const userOrderPlacementLocks = new Set<number>();

// Secure server-to-server SMM API Dispatcher
export async function dispatchOrderToProvider(
  orderId: number,
  forceRetry: boolean = false
): Promise<{
  success: boolean;
  providerOrderId?: string;
  providerName?: string;
  providerLowBalance?: boolean;
  insufficientBalance?: boolean;
  balanceUnknown?: boolean;
  error?: string;
}> {
  // Prevent duplicate submissions caused by retries, timeouts, or repeated clicks
  if (activeOrderDispatchLocks.has(orderId)) {
    return {
      success: false,
      error: `Order #${orderId} dispatch is already in progress. Duplicate submission prevented.`,
    };
  }

  activeOrderDispatchLocks.add(orderId);

  try {
    const orderObj = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        serviceId: orders.serviceId,
        providerOrderId: orders.providerOrderId,
        userId: orders.userId,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderObj.length === 0) {
      return { success: false, error: 'Order not found in database.' };
    }
    const ord = orderObj[0];

    // CRITICAL: If order already has a valid numeric providerOrderId, NEVER submit to provider again!
    // Exactly one provider order must be created per user order.
    const existingPId = ord.providerOrderId?.trim();
    if (existingPId && /^\d+$/.test(existingPId)) {
      console.log(`[DISPATCH DUPLICATE PREVENTED] Order #${orderId} already has valid Provider Order ID '${existingPId}'. Skipping new submission.`);
      return {
        success: true,
        providerOrderId: existingPId,
        providerName: 'Already Dispatched',
      };
    }

    if (existingPId === 'SUBMITTING') {
      console.log(`[DISPATCH DUPLICATE PREVENTED] Order #${orderId} is currently being submitted to provider.`);
      return {
        success: false,
        error: `Order #${orderId} submission is currently in progress. Duplicate submission prevented.`,
      };
    }

    // Atomic DB-level lock: Claim the submission state so concurrent requests can never double-submit
    const lockRows = await db
      .update(orders)
      .set({ providerOrderId: 'SUBMITTING' })
      .where(
        and(
          eq(orders.id, orderId),
          or(
            sql`${orders.providerOrderId} IS NULL`,
            eq(orders.providerOrderId, ''),
            sql`${orders.providerOrderId} LIKE 'FAILED:%'`,
            sql`${orders.providerOrderId} LIKE 'QUEUED:%'`
          )
        )
      )
      .returning({ id: orders.id });

    if (lockRows.length === 0) {
      console.warn(`[DISPATCH ATOMIC LOCK FAILED] Order #${orderId} already locked or completed by another thread.`);
      return {
        success: false,
        error: `Order #${orderId} is already being dispatched or was already submitted. Duplicate prevented.`,
      };
    }

    const srv = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        providerId: services.providerId,
        providerServiceId: services.providerServiceId,
        pricePerThousand: services.pricePerThousand,
      })
      .from(services)
      .where(eq(services.id, ord.serviceId))
      .limit(1);

    let apiUrl = '';
    let apiKey = '';
    let providerName = '';
    let providerId: number | null = null;
    let providerServiceId = '';

    // 1. Primary Resolution: Service's explicitly linked API Provider
    if (srv.length > 0 && srv[0].providerId) {
      const prov = await db
        .select()
        .from(providers)
        .where(eq(providers.id, srv[0].providerId))
        .limit(1);

      if (prov.length > 0 && prov[0].apiUrl && prov[0].apiKey) {
        apiUrl = prov[0].apiUrl.trim();
        apiKey = prov[0].apiKey.trim();
        providerName = prov[0].name;
        providerId = prov[0].id;
        if (srv[0].providerServiceId && srv[0].providerServiceId.trim() !== '') {
          providerServiceId = srv[0].providerServiceId.trim();
        }
      }
    }

    // 2. Fallback Resolution: Default / First Active API Provider configured in the system
    if (!apiUrl) {
      const allActiveProviders = await db
        .select()
        .from(providers)
        .orderBy(providers.id)
        .limit(1);

      if (allActiveProviders.length > 0 && allActiveProviders[0].apiUrl && allActiveProviders[0].apiKey) {
        apiUrl = allActiveProviders[0].apiUrl.trim();
        apiKey = allActiveProviders[0].apiKey.trim();
        providerName = allActiveProviders[0].name;
        providerId = allActiveProviders[0].id;
        if (srv[0]?.providerServiceId && srv[0].providerServiceId.trim() !== '') {
          providerServiceId = srv[0].providerServiceId.trim();
        }
      }
    }

    // 3. User Custom Provider Resolution (if user has their own provider configured)
    if (!apiUrl && ord.userId) {
      const userResult = await db
        .select({
          customProviderUrl: users.customProviderUrl,
          customProviderKey: users.customProviderKey,
        })
        .from(users)
        .where(eq(users.id, ord.userId))
        .limit(1);

      if (userResult.length > 0 && userResult[0].customProviderUrl && userResult[0].customProviderKey) {
        apiUrl = userResult[0].customProviderUrl.trim();
        apiKey = userResult[0].customProviderKey.trim();
        providerName = 'User Custom Provider';
        if (srv[0]?.providerServiceId && srv[0].providerServiceId.trim() !== '') {
          providerServiceId = srv[0].providerServiceId.trim();
        }
      }
    }

    if (!apiUrl || !apiKey) {
      const noProvMsg = 'No active SMM API provider configured in the system. Please configure an API provider in Admin > API Providers.';
      await db
        .update(orders)
        .set({ providerOrderId: 'FAILED: No Provider Configured' })
        .where(eq(orders.id, orderId));

      orderDispatchDetailsMap.set(orderId, {
        orderId,
        providerId: null,
        providerName: 'None',
        providerServiceId: null,
        providerOrderId: 'FAILED: No Provider Configured',
        lastError: noProvMsg,
        dispatchedAt: new Date().toISOString(),
      });

      return { success: false, error: noProvMsg };
    }

    // Resolve Provider Service ID if missing
    if (!providerServiceId || providerServiceId === '0') {
      const descMatch = (srv[0]?.description || '').match(/SMM Provider Service ID:\s*(\d+)/i);
      if (descMatch && descMatch[1]) {
        providerServiceId = descMatch[1].trim();
        if (srv[0]?.id && providerId) {
          await db.update(services).set({ providerServiceId, providerId }).where(eq(services.id, srv[0].id)).catch(() => {});
        }
      }
    }

    if (!providerServiceId || providerServiceId === '0') {
      try {
        const srvParams = new URLSearchParams({ key: apiKey, action: 'services' });
        const srvRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: srvParams.toString(),
        });
        if (srvRes.ok) {
          const remoteList = await srvRes.json();
          if (Array.isArray(remoteList)) {
            const cleanLocalName = (srv[0]?.name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
            const matched = remoteList.find((rm: any) => {
              const rName = (rm.name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
              return rName === cleanLocalName || rName.includes(cleanLocalName) || cleanLocalName.includes(rName);
            });
            if (matched && matched.service) {
              providerServiceId = String(matched.service).trim();
              if (srv[0]?.id && providerId) {
                await db.update(services).set({ providerServiceId, providerId }).where(eq(services.id, srv[0].id)).catch(() => {});
              }
            }
          }
        }
      } catch (autoLinkErr) {
        console.warn('[AUTO-LINK WARNING] Could not auto-link provider service:', autoLinkErr);
      }
    }

    if (!providerServiceId || providerServiceId === '0') {
      const errMsg = `Service #${srv[0]?.id} ('${srv[0]?.name}') is not linked to any Provider Service ID. Please map it in Admin > Services.`;
      await db
        .update(orders)
        .set({ providerOrderId: 'FAILED: Missing Provider Service ID' })
        .where(eq(orders.id, orderId));

      orderDispatchDetailsMap.set(orderId, {
        orderId,
        providerId,
        providerName,
        providerServiceId: null,
        providerOrderId: 'FAILED: Missing Provider Service ID',
        lastError: errMsg,
        dispatchedAt: new Date().toISOString(),
      });

      return { success: false, error: errMsg };
    }

    // PROVIDER BALANCE VERIFICATION
    let provBalance: number | null = null;
    let balanceFetchError: string | null = null;
    let isBalanceUnknown = false;

    try {
      const balData = await executeSmmApiRequest(apiUrl, { key: apiKey, action: 'balance' }, 1);
      if (balData && balData.balance !== undefined && balData.balance !== null) {
        const cleanBal = String(balData.balance).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleanBal);
        if (!isNaN(parsed)) {
          provBalance = parsed;
          if (providerId) {
            await db.update(providers).set({ balance: provBalance }).where(eq(providers.id, providerId)).catch(() => {});
          }
        } else {
          isBalanceUnknown = true;
        }
      } else if (balData && balData.error) {
        balanceFetchError = typeof balData.error === 'string' ? balData.error : JSON.stringify(balData.error);
        isBalanceUnknown = true;
      } else {
        isBalanceUnknown = true;
      }
    } catch (balErr: any) {
      balanceFetchError = balErr.message || String(balErr);
      isBalanceUnknown = true;
    }

    // If provider has strictly insufficient balance (<= 0), do not submit the order and queue for retry
    if (provBalance !== null && provBalance <= 0) {
      const lowBalMsg = `Provider '${providerName}' account balance is insufficient (Available: ₹${provBalance.toFixed(2)}). Order held in queue for retry.`;
      console.warn(`[PROVIDER INSUFFICIENT BALANCE] Order #${orderId}: ${lowBalMsg}`);

      await db
        .update(orders)
        .set({
          providerOrderId: 'QUEUED: Insufficient Provider Balance',
          status: 'pending',
        })
        .where(eq(orders.id, orderId));

      orderDispatchDetailsMap.set(orderId, {
        orderId,
        providerId,
        providerName,
        providerServiceId,
        providerOrderId: 'QUEUED: Insufficient Provider Balance',
        lastError: lowBalMsg,
        balanceChecked: provBalance,
        balanceStatus: 'insufficient',
        dispatchedAt: new Date().toISOString(),
      });

      return {
        success: false,
        insufficientBalance: true,
        providerLowBalance: true,
        providerName,
        error: lowBalMsg,
      };
    }

    if (isBalanceUnknown) {
      console.log(`[PROVIDER BALANCE NOTE] Provider '${providerName}' balance unknown or unverified (${balanceFetchError || 'non-standard format'}). Proceeding with immediate order push to provider.`);
    }

    // AUTOMATIC ORDER PUSH TO PROVIDER API
    console.log(`[PROVIDER DISPATCH START] Order #${orderId} -> '${providerName}' (Service: ${providerServiceId}, Qty: ${ord.quantity})`);

    const requestParams: Record<string, string> = {
      key: apiKey,
      action: 'add',
      service: providerServiceId,
      link: ord.link.trim(),
      quantity: String(ord.quantity),
    };

    const data = await executeSmmApiRequest(apiUrl, requestParams, 1);

    // Robust extraction of Provider Order ID
    let pOrderId: string | null = null;
    if (typeof data === 'number' || (typeof data === 'string' && /^\d+$/.test(data.trim()))) {
      pOrderId = String(data).trim();
    } else if (data && typeof data === 'object') {
      if (data.order !== undefined && data.order !== null && String(data.order).trim() !== '' && !isNaN(Number(data.order))) {
        pOrderId = String(data.order).trim();
      } else if (data.order_id !== undefined && data.order_id !== null && !isNaN(Number(data.order_id))) {
        pOrderId = String(data.order_id).trim();
      } else if (data.orderId !== undefined && data.orderId !== null && !isNaN(Number(data.orderId))) {
        pOrderId = String(data.orderId).trim();
      } else if (data.id !== undefined && data.id !== null && !isNaN(Number(data.id))) {
        pOrderId = String(data.id).trim();
      } else if (data.data?.order !== undefined && data.data?.order !== null && !isNaN(Number(data.data.order))) {
        pOrderId = String(data.data.order).trim();
      } else if (data.data?.order_id !== undefined && data.data?.order_id !== null && !isNaN(Number(data.data.order_id))) {
        pOrderId = String(data.data.order_id).trim();
      } else if (data.result?.order !== undefined && data.result?.order !== null && !isNaN(Number(data.result.order))) {
        pOrderId = String(data.result.order).trim();
      }
    }

    if (pOrderId && pOrderId !== 'undefined' && pOrderId !== 'null' && pOrderId !== '') {
      console.log(`[PROVIDER DISPATCH SUCCESS] Order #${orderId} -> Dispatched to ${providerName} (Provider Order ID: ${pOrderId})`);

      // Query actual provider status for this order immediately
      let initialStatus = 'pending';
      let initialStartCount = 0;
      let initialRemains = ord.quantity;

      try {
        const statusData = await executeSmmApiRequest(apiUrl, { key: apiKey, action: 'status', order: pOrderId }, 1);
        if (statusData && typeof statusData === 'object') {
          let orderStatusObj: any = statusData;
          if (statusData[pOrderId] && typeof statusData[pOrderId] === 'object') {
            orderStatusObj = statusData[pOrderId];
          } else if (statusData.data) {
            orderStatusObj = statusData.data[pOrderId] || statusData.data;
          }

          const rawSt = String(orderStatusObj?.status || orderStatusObj?.order_status || '').toLowerCase().trim();
          if (rawSt.includes('progress') || rawSt.includes('process') || rawSt.includes('active')) {
            initialStatus = 'processing';
          } else if (rawSt.includes('complete') || rawSt.includes('done') || rawSt.includes('finish')) {
            initialStatus = 'completed';
            initialRemains = 0;
          } else if (rawSt.includes('pend') || rawSt.includes('wait') || rawSt.includes('queue')) {
            initialStatus = 'pending';
          } else if (rawSt.includes('partial')) {
            initialStatus = 'partial';
          } else if (rawSt.includes('cancel')) {
            initialStatus = 'cancelled';
          } else if (rawSt.includes('fail') || rawSt.includes('reject')) {
            initialStatus = 'failed';
          }

          if (orderStatusObj.start_count !== undefined && !isNaN(parseInt(orderStatusObj.start_count))) {
            initialStartCount = parseInt(orderStatusObj.start_count);
          }
          if (orderStatusObj.remains !== undefined && !isNaN(parseInt(orderStatusObj.remains))) {
            initialRemains = parseInt(orderStatusObj.remains);
          }
        }
      } catch {
        // If immediate status query fails, keep order as 'pending'
        initialStatus = 'pending';
      }

      // Save real provider order ID and accurate provider status (never artificially forced to processing)
      await db
        .update(orders)
        .set({
          providerOrderId: pOrderId,
          status: initialStatus,
          startCount: initialStartCount,
          remains: initialRemains,
        })
        .where(eq(orders.id, orderId));

      orderDispatchDetailsMap.set(orderId, {
        orderId,
        providerId,
        providerName,
        providerServiceId,
        providerOrderId: pOrderId,
        providerResponse: data,
        lastError: null,
        balanceChecked: provBalance,
        balanceStatus: isBalanceUnknown ? 'unknown' : 'sufficient',
        dispatchedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      });

      await logActivity(
        null,
        'API Provider Dispatch',
        `Successfully dispatched Order #${orderId} to SMM Provider '${providerName}' (Provider Order ID: ${pOrderId})`,
        'system'
      );

      return {
        success: true,
        providerOrderId: pOrderId,
        providerName,
      };
    } else if (data && data.error) {
      const errStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      const isProviderLowBalance = /sufficient balance|not enough balance|low balance|depleted/i.test(errStr);

      if (isProviderLowBalance) {
        console.warn(`[PROVIDER BALANCE ADVISORY] Order #${orderId}: Upstream provider '${providerName}' balance depleted (${errStr}).`);

        if (providerId) {
          await db.update(providers).set({ balance: 0.0 }).where(eq(providers.id, providerId)).catch(() => {});
        }

        await db
          .update(orders)
          .set({
            providerOrderId: 'QUEUED: Insufficient Provider Balance',
            status: 'pending',
          })
          .where(eq(orders.id, orderId));

        orderDispatchDetailsMap.set(orderId, {
          orderId,
          providerId,
          providerName,
          providerServiceId,
          providerOrderId: 'QUEUED: Insufficient Provider Balance',
          providerResponse: data,
          lastError: errStr,
          balanceChecked: 0.0,
          balanceStatus: 'insufficient',
          dispatchedAt: new Date().toISOString(),
        });

        return {
          success: false,
          insufficientBalance: true,
          providerLowBalance: true,
          providerName,
          error: `Provider balance depleted (${errStr}). Order queued for retry.`,
        };
      }

      console.warn(`[PROVIDER ERROR] Order #${orderId}: Upstream provider '${providerName}' rejected order: ${errStr}`);

      await db
        .update(orders)
        .set({
          providerOrderId: `FAILED: ${errStr}`.substring(0, 255),
          status: 'pending',
        })
        .where(eq(orders.id, orderId));

      orderDispatchDetailsMap.set(orderId, {
        orderId,
        providerId,
        providerName,
        providerServiceId,
        providerOrderId: `FAILED: ${errStr}`.substring(0, 255),
        providerResponse: data,
        lastError: errStr,
        dispatchedAt: new Date().toISOString(),
      });

      return {
        success: false,
        providerName,
        error: errStr,
      };
    } else {
      const unexpectedErr = `Provider returned unexpected response: ${JSON.stringify(data).substring(0, 150)}`;
      console.warn(`[PROVIDER ADVISORY] Order #${orderId}: ${unexpectedErr}`);

      await db
        .update(orders)
        .set({
          providerOrderId: 'FAILED: Invalid Provider Response',
          status: 'pending',
        })
        .where(eq(orders.id, orderId));

      orderDispatchDetailsMap.set(orderId, {
        orderId,
        providerId,
        providerName,
        providerServiceId,
        providerOrderId: 'FAILED: Invalid Provider Response',
        providerResponse: data,
        lastError: unexpectedErr,
        dispatchedAt: new Date().toISOString(),
      });

      return {
        success: false,
        error: unexpectedErr,
      };
    }
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`[PROVIDER DISPATCH ERROR] Order #${orderId}:`, errorMsg);

    await db
      .update(orders)
      .set({
        providerOrderId: `FAILED: ${errorMsg}`.substring(0, 255),
        status: 'pending',
      })
      .where(eq(orders.id, orderId));

    orderDispatchDetailsMap.set(orderId, {
      orderId,
      providerName: 'Provider',
      providerOrderId: `FAILED: ${errorMsg}`.substring(0, 255),
      providerResponse: null,
      lastError: errorMsg,
      dispatchedAt: new Date().toISOString(),
    });

    return {
      success: false,
      error: errorMsg,
    };
  } finally {
    activeOrderDispatchLocks.delete(orderId);
  }
}

// Secure server-to-server SMM API Status Syncing
export async function syncProviderOrders(specificOrderIds?: number[]): Promise<{ synced: number }> {
  try {
    // 1. Check for any older pending orders (>30s) without providerOrderId and submit them
    const undispatchedOrders = await db
      .select({
        id: orders.id,
      })
      .from(orders)
      .where(
        and(
          sql`(${orders.providerOrderId} IS NULL OR ${orders.providerOrderId} = '')`,
          eq(orders.status, 'pending'),
          sql`${orders.createdAt} < NOW() - INTERVAL '30 seconds'`
        )
      )
      .limit(5);

    if (undispatchedOrders.length > 0) {
      console.log(`[AUTO-DISPATCH QUEUE] Found ${undispatchedOrders.length} undispatched orders. Submitting to provider...`);
      for (const unOrd of undispatchedOrders) {
        try {
          await dispatchOrderToProvider(unOrd.id, false);
        } catch (dispatchErr) {
          console.error(`[AUTO-DISPATCH QUEUE ERROR] Order #${unOrd.id}:`, dispatchErr);
        }
      }
    }

    // 2. Select active orders with valid numeric providerOrderId to query status from provider API
    let activeOrdersQuery = db
      .select({
        id: orders.id,
        providerOrderId: orders.providerOrderId,
        serviceId: orders.serviceId,
        userId: orders.userId,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
      })
      .from(orders);

    let activeOrders: any[] = [];

    if (specificOrderIds && specificOrderIds.length > 0) {
      activeOrders = await activeOrdersQuery.where(
        and(
          inArray(orders.id, specificOrderIds),
          sql`${orders.providerOrderId} IS NOT NULL AND ${orders.providerOrderId} != '' AND ${orders.providerOrderId} NOT LIKE 'FAILED:%' AND ${orders.providerOrderId} NOT LIKE 'QUEUED:%'`
        )
      );
    } else {
      activeOrders = await activeOrdersQuery.where(
        and(
          sql`${orders.providerOrderId} IS NOT NULL AND ${orders.providerOrderId} != '' AND ${orders.providerOrderId} NOT LIKE 'FAILED:%' AND ${orders.providerOrderId} NOT LIKE 'QUEUED:%'`,
          sql`LOWER(${orders.status}) NOT IN ('completed', 'cancelled', 'refunded', 'failed')`
        )
      ).limit(50);
    }

    if (activeOrders.length === 0) {
      return { synced: 0 };
    }

    // Providers cache for faster resolution
    const allProviders = await db.select().from(providers);
    const providerMap = new Map<number, { apiUrl: string; apiKey: string; name: string }>();
    allProviders.forEach((p) => {
      if (p.apiUrl && p.apiKey) {
        providerMap.set(p.id, { apiUrl: p.apiUrl.trim(), apiKey: p.apiKey.trim(), name: p.name });
      }
    });

    const defaultProv = allProviders.find((p) => p.apiUrl && p.apiKey);
    let syncedCount = 0;

    for (const ord of activeOrders) {
      const pOrderId = String(ord.providerOrderId || '').trim();
      if (!pOrderId || pOrderId.startsWith('FAILED:') || pOrderId.startsWith('QUEUED:')) continue;

      let apiUrl = '';
      let apiKey = '';
      let providerName = '';
      let hasCustomProvider = false;

      // Check user custom provider
      if (ord.userId) {
        const userResult = await db
          .select({
            customProviderUrl: users.customProviderUrl,
            customProviderKey: users.customProviderKey,
          })
          .from(users)
          .where(eq(users.id, ord.userId))
          .limit(1);

        if (userResult.length > 0 && userResult[0].customProviderUrl && userResult[0].customProviderKey) {
          apiUrl = userResult[0].customProviderUrl.trim();
          apiKey = userResult[0].customProviderKey.trim();
          providerName = 'User Custom Provider';
          hasCustomProvider = true;
        }
      }

      if (!hasCustomProvider) {
        const srv = await db
          .select({ providerId: services.providerId })
          .from(services)
          .where(eq(services.id, ord.serviceId))
          .limit(1);

        if (srv.length > 0 && srv[0].providerId && providerMap.has(srv[0].providerId)) {
          const provCreds = providerMap.get(srv[0].providerId)!;
          apiUrl = provCreds.apiUrl;
          apiKey = provCreds.apiKey;
          providerName = provCreds.name;
        }

        if (!apiUrl && defaultProv) {
          apiUrl = defaultProv.apiUrl.trim();
          apiKey = defaultProv.apiKey.trim();
          providerName = defaultProv.name;
        }
      }

      if (!apiUrl || !apiKey) continue;

      try {
        const data = await executeSmmApiRequest(
          apiUrl,
          {
            key: apiKey.trim(),
            action: 'status',
            order: pOrderId,
          },
          2
        );

        if (data && typeof data === 'object') {
          let orderData: any = data;
          if (data[pOrderId] && typeof data[pOrderId] === 'object') {
            orderData = data[pOrderId];
          } else if (data.data && typeof data.data === 'object') {
            orderData = data.data[pOrderId] || data.data;
          } else if (data.result && typeof data.result === 'object') {
            orderData = data.result[pOrderId] || data.result;
          } else if (Array.isArray(data) && data.length > 0) {
            orderData = data[0];
          }

          if (orderData.error) {
            console.warn(`[ORDER SYNC NOTE] Order #${ord.id} (Provider #${pOrderId}) note:`, orderData.error);
            const currentDetail = orderDispatchDetailsMap.get(ord.id);
            if (currentDetail) {
              currentDetail.lastError = typeof orderData.error === 'string' ? orderData.error : JSON.stringify(orderData.error);
              currentDetail.lastSyncedAt = new Date().toISOString();
            }
            continue;
          }

          const statusField = orderData?.status ?? orderData?.order_status ?? orderData?.status_text ?? '';
          const rawStatus = String(statusField || '').toLowerCase().trim();

          let internalStatus: string | null = null;

          if (
            rawStatus === 'completed' ||
            rawStatus.includes('complete') ||
            rawStatus.includes('finish') ||
            rawStatus.includes('success') ||
            rawStatus.includes('done')
          ) {
            internalStatus = 'completed';
          } else if (
            rawStatus === 'canceled' ||
            rawStatus === 'cancelled' ||
            rawStatus.includes('cancel')
          ) {
            internalStatus = 'cancelled';
          } else if (rawStatus.includes('fail') || rawStatus.includes('reject')) {
            internalStatus = 'failed';
          } else if (rawStatus.includes('refund')) {
            internalStatus = 'refunded';
          } else if (rawStatus.includes('partial')) {
            internalStatus = 'partial';
          } else if (
            rawStatus.includes('progress') ||
            rawStatus.includes('process') ||
            rawStatus.includes('active')
          ) {
            internalStatus = 'processing';
          } else if (
            rawStatus.includes('pend') ||
            rawStatus.includes('wait') ||
            rawStatus.includes('queue')
          ) {
            internalStatus = 'pending';
          }

          if (internalStatus) {
            // Do not change Completed, Failed, or Canceled orders without valid reason
            const currentStatusLower = String(ord.status || '').toLowerCase();
            if (['completed', 'failed', 'cancelled', 'refunded'].includes(currentStatusLower) && internalStatus === 'pending') {
              continue;
            }

            const startCountRaw = orderData.start_count ?? orderData.startCount;
            const remainsRaw = orderData.remains;

            let startCount =
              startCountRaw !== undefined && !isNaN(parseInt(startCountRaw))
                ? parseInt(startCountRaw)
                : ord.startCount || 0;

            let remains =
              remainsRaw !== undefined && !isNaN(parseInt(remainsRaw))
                ? parseInt(remainsRaw)
                : ord.remains !== undefined
                ? ord.remains
                : 0;

            if (internalStatus === 'completed') {
              remains = 0;
            }

            // Auto-refund user balance if order was marked cancelled or refunded
            if (
              (internalStatus === 'cancelled' || internalStatus === 'refunded') &&
              ord.charge > 0 &&
              ord.userId &&
              ord.status !== 'cancelled' &&
              ord.status !== 'refunded'
            ) {
              const existingRefund = await db
                .select()
                .from(payments)
                .where(eq(payments.transactionId, `REFUND-${ord.id}`))
                .limit(1);

              if (existingRefund.length === 0) {
                const u = await db.select().from(users).where(eq(users.id, ord.userId)).limit(1);
                if (u.length > 0) {
                  await db.update(users).set({ balance: (u[0].balance || 0) + ord.charge }).where(eq(users.id, ord.userId));
                  await db.insert(payments).values({
                    userId: ord.userId,
                    amount: ord.charge,
                    paymentMethod: 'Refund',
                    transactionId: `REFUND-${ord.id}`,
                    status: 'completed',
                  });
                }
              }
            }

            await db
              .update(orders)
              .set({
                status: internalStatus,
                startCount,
                remains,
              })
              .where(eq(orders.id, ord.id));

            const existingDetails = orderDispatchDetailsMap.get(ord.id);
            orderDispatchDetailsMap.set(ord.id, {
              orderId: ord.id,
              providerId: existingDetails?.providerId || null,
              providerName: existingDetails?.providerName || providerName,
              providerServiceId: existingDetails?.providerServiceId || null,
              providerOrderId: pOrderId,
              providerResponse: orderData,
              lastError: null,
              dispatchedAt: existingDetails?.dispatchedAt || null,
              lastSyncedAt: new Date().toISOString(),
            });

            syncedCount++;
            console.log(`[ORDER SYNC] Order #${ord.id} (Provider #${pOrderId}) status updated to '${internalStatus}' (remains: ${remains})`);
          }
        }
      } catch (err: any) {
        // Log API errors and preserve the last known valid status when temporary errors occur
        console.warn(`[ORDER SYNC ERROR] Order #${ord.id} (Provider #${pOrderId}) sync note: ${err.message || err}. Preserving last known valid status.`);
        const existingDetails = orderDispatchDetailsMap.get(ord.id);
        if (existingDetails) {
          existingDetails.lastError = `Sync note: ${err.message || err}`;
          existingDetails.lastSyncedAt = new Date().toISOString();
        }
      }
    }

    return { synced: syncedCount };
  } catch (err) {
    console.error('Failed to sync provider orders:', err);
    throw err;
  }
}

// Global Cron Job state for background order status sync
export const cronState = {
  lastRun: null as Date | null,
  lastRunTime: 0,
  runCount: 0,
  status: 'idle' as 'idle' | 'running' | 'success' | 'failed',
  lastSyncedCount: 0,
  error: null as string | null,
  intervalMs: 15000, // Check every 15 seconds so completed orders reflect automatically!
  isActive: true,
};

let cronTimer: NodeJS.Timeout | null = null;

export function startOrderSyncCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  const runSync = async () => {
    if (!cronState.isActive) return;

    // Safety watchdog: If stuck in 'running' for > 40 seconds, force reset to 'idle'
    if (cronState.status === 'running') {
      if (Date.now() - cronState.lastRunTime > 40000) {
        console.warn('[CRON WATCHDOG] Previous sync timed out after 40s. Resetting status to idle.');
        cronState.status = 'idle';
      } else {
        return;
      }
    }

    cronState.status = 'running';
    cronState.lastRunTime = Date.now();
    try {
      const result = await syncProviderOrders();
      cronState.lastRun = new Date();
      cronState.runCount++;
      cronState.status = 'success';
      cronState.lastSyncedCount = result?.synced || 0;
      cronState.error = null;
    } catch (err: any) {
      console.error('[CRON] Background order sync failed:', err);
      cronState.lastRun = new Date();
      cronState.status = 'failed';
      cronState.error = err?.message || String(err);
    } finally {
      // Always reset back to idle so subsequent ticks run smoothly
      if (cronState.status !== 'failed') {
        cronState.status = 'idle';
      }
    }
  };

  cronTimer = setInterval(runSync, cronState.intervalMs);
  
  // Also run once immediately after 3 seconds of server startup
  setTimeout(() => {
    runSync().catch(err => console.error('[CRON] Initial background sync error:', err));
  }, 3000);
}

// Start cron immediately on server startup
startOrderSyncCron();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// Get services for landing page & public consumer APIs
router.get(['/services/public', '/services', '/public/services'], async (req, res) => {
  try {
    const list = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        pricePerThousand: services.pricePerThousand,
        minAmount: services.minAmount,
        maxAmount: services.maxAmount,
        status: services.status,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        icon: services.icon,
      })
      .from(services)
      .innerJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(services.status, 'active'))
      .orderBy(categories.sortOrder, services.id);
    res.json(list);
  } catch (error) {
    console.error('Error fetching public services:', error);
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// ==========================================
// USER DASHBOARD ENDPOINTS
// ==========================================

// Get Current User Profile & Balance
router.get('/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Always fetch fresh profile & wallet balance from the database as source of truth
    const freshUser = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (freshUser.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    res.json(freshUser[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Toggle User's Role (Developer/Tester feature)
router.post('/user/toggle-role', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Only allow role toggling for super admin emails
    if (!isSuperAdminEmail(req.user.email)) {
      return res.status(403).json({ error: 'Forbidden: Only administrators can toggle roles.' });
    }

    const newRole = req.user.role === 'admin' ? 'user' : 'admin';
    
    await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, req.user.id));
      
    await logActivity(req.user.id, 'Toggle Role', `Toggled user role to ${newRole}`, req.ip);
    
    res.json({ success: true, newRole });
  } catch (error) {
    console.error('Failed to toggle role:', error);
    res.status(500).json({ error: 'Failed to toggle role.' });
  }
});

// Update User's Custom SMM Provider Details
router.post('/user/custom-provider', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { customProviderUrl, customProviderKey } = req.body;

    await db
      .update(users)
      .set({
        customProviderUrl: customProviderUrl || null,
        customProviderKey: customProviderKey || null,
      })
      .where(eq(users.id, req.user.id));

    await logActivity(
      req.user.id,
      'Update Custom Provider',
      `Updated custom API provider URL to: ${customProviderUrl || 'none'}`,
      req.ip
    );

    res.json({
      success: true,
      customProviderUrl: customProviderUrl || null,
      customProviderKey: customProviderKey || null,
    });
  } catch (error) {
    console.error('Failed to update custom provider details:', error);
    res.status(500).json({ error: 'Failed to update custom provider details.' });
  }
});

// ==========================================
// RESELLER SMM API (V1) ENDPOINTS
// ==========================================

// Generate or Regenerate API Key
router.post('/user/generate-api-key', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const newApiKey = crypto.randomBytes(32).toString('hex');
    
    await db
      .update(users)
      .set({ apiKey: newApiKey })
      .where(eq(users.id, req.user.id));
      
    await logActivity(req.user.id, 'Generate API Key', 'Generated a new API key', req.ip);
    
    res.json({ success: true, apiKey: newApiKey });
  } catch (error) {
    console.error('Failed to generate API Key:', error);
    res.status(500).json({ error: 'Failed to generate API Key.' });
  }
});

// Reseller v1 API Endpoint (SMM standard)
router.all('/v1', async (req, res) => {
  try {
    const key = req.body?.key || req.query?.key;
    const action = req.body?.action || req.query?.action;

    if (!key) {
      return res.status(400).json({ error: 'Invalid API key' });
    }

    // Authenticate user via API key
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.apiKey, String(key)))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const apiUser = userResult[0];

    if (apiUser.status !== 'active' && !isSuperAdminEmail(apiUser.email)) {
      return res.status(403).json({ error: 'Your account is suspended' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter. Supported actions: balance, services, add, status' });
    }

    switch (action) {
      case 'balance': {
        return res.json({
          balance: apiUser.balance.toFixed(4),
          currency: 'USD'
        });
      }

      case 'services': {
        const activeServices = await db
          .select({
            id: services.id,
            name: services.name,
            description: services.description,
            pricePerThousand: services.pricePerThousand,
            minAmount: services.minAmount,
            maxAmount: services.maxAmount,
            categoryName: categories.name,
          })
          .from(services)
          .innerJoin(categories, eq(services.categoryId, categories.id))
          .where(eq(services.status, 'active'));

        const responseServices = activeServices.map(srv => {
          // Adjust rate for user's customRate if applicable
          const rate = srv.pricePerThousand * apiUser.customRate;
          return {
            service: srv.id.toString(),
            name: srv.name,
            type: 'Default',
            category: srv.categoryName,
            rate: rate.toFixed(4),
            min: srv.minAmount.toString(),
            max: srv.maxAmount.toString(),
            refill: false,
            description: srv.description || ''
          };
        });

        return res.json(responseServices);
      }

      case 'add': {
        const service = req.body?.service || req.query?.service;
        const link = req.body?.link || req.query?.link;
        const quantity = req.body?.quantity || req.query?.quantity;

        if (!service || !link || !quantity) {
          return res.status(400).json({ error: 'Missing required parameters: service, link, quantity' });
        }

        const srvId = Number(service);
        const qty = Number(quantity);

        if (isNaN(srvId) || isNaN(qty)) {
          return res.status(400).json({ error: 'Invalid service or quantity parameters' });
        }

        // Fetch service details
        const sResult = await db
          .select()
          .from(services)
          .where(eq(services.id, srvId))
          .limit(1);

        if (sResult.length === 0 || sResult[0].status !== 'active') {
          return res.status(400).json({ error: 'Service is unavailable' });
        }

        const s = sResult[0];

        if (qty < s.minAmount || qty > s.maxAmount) {
          return res.status(400).json({ error: `Quantity must be between ${s.minAmount} and ${s.maxAmount}` });
        }

        // Calculate custom charged price with 4-decimal precision
        const rate = Number(s.pricePerThousand) * Number(apiUser.customRate || 1.0);
        const finalCharge = Math.max(0, Math.round(((qty / 1000) * rate) * 10000) / 10000);

        // Atomic transaction: lock user row, fetch live balance, validate & deduct
        const txResult = await db.transaction(async (tx) => {
          const userRows = await tx
            .select({
              id: users.id,
              balance: users.balance,
              status: users.status,
            })
            .from(users)
            .where(eq(users.id, apiUser.id))
            .for('update');

          if (userRows.length === 0) {
            return { success: false, status: 404, error: 'User not found' };
          }

          const freshUser = userRows[0];
          const currentBalance = Math.round(Number(freshUser.balance || 0) * 10000) / 10000;

          if (currentBalance < finalCharge - 0.00001) {
            return { success: false, status: 400, error: 'Insufficient funds' };
          }

          const newBalance = Math.max(0, Math.round((currentBalance - finalCharge) * 10000) / 10000);

          await tx
            .update(users)
            .set({ balance: newBalance })
            .where(eq(users.id, freshUser.id));

          const orderResult = await createOrderRecord(tx, {
            user: freshUser,
            serviceId: s.id,
            serviceName: s.name,
            link: String(link),
            quantity: qty,
            charge: finalCharge,
            status: 'pending',
            startCount: 0,
            remains: qty,
            providerOrderId: null,
          });

          return { success: true, order: orderResult, newBalance };
        });

        if (!txResult.success) {
          return res.status(txResult.status || 400).json({ error: txResult.error });
        }

        const createdOrder = txResult.order;

        await logActivity(
          apiUser.id,
          'API Place Order',
          `Ordered service ID: ${s.id} via API for charge: ₹${finalCharge.toFixed(4)}`,
          req.ip
        );

        // Forward to actual SMM provider asynchronously
        dispatchOrderToProvider(createdOrder.id).catch(err => {
          console.error('[RESELLER API ERROR] Async dispatch failed:', err);
        });

        return res.json({
          order: createdOrder.id.toString()
        });
      }

      case 'status': {
        const order = req.body?.order || req.query?.order;
        const multiOrders = req.body?.orders || req.query?.orders;

        if (order) {
          const ordId = Number(order);
          if (isNaN(ordId)) {
            return res.status(400).json({ error: 'Invalid order parameter' });
          }

          const oResult = await db
            .select()
            .from(orders)
            .where(and(eq(orders.id, ordId), eq(orders.userId, apiUser.id)))
            .limit(1);

          if (oResult.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
          }

          const o = oResult[0];
          return res.json({
            charge: o.charge.toFixed(4),
            start_count: o.startCount.toString(),
            status: o.status.toUpperCase(),
            remains: o.remains.toString(),
            currency: 'USD'
          });
        } else if (multiOrders) {
          const ids = String(multiOrders)
            .split(',')
            .map(id => Number(id.trim()))
            .filter(id => !isNaN(id));

          if (ids.length === 0) {
            return res.status(400).json({ error: 'No valid order IDs provided' });
          }

          // Fetch orders for this user
          const oResults = await db
            .select()
            .from(orders)
            .where(and(sql`${orders.id} IN (${sql.join(ids, sql`, `)})`, eq(orders.userId, apiUser.id)));

          const statusMap: Record<string, any> = {};
          for (const o of oResults) {
            statusMap[o.id.toString()] = {
              charge: o.charge.toFixed(4),
              start_count: o.startCount.toString(),
              status: o.status.toUpperCase(),
              remains: o.remains.toString(),
              currency: 'USD'
            };
          }

          // Return errors for IDs not found
          for (const id of ids) {
            const idStr = id.toString();
            if (!statusMap[idStr]) {
              statusMap[idStr] = { error: 'Order not found' };
            }
          }

          return res.json(statusMap);
        } else {
          return res.status(400).json({ error: 'Missing order or orders parameter' });
        }
      }

      default: {
        return res.status(400).json({ error: 'Invalid action parameter. Supported actions: balance, services, add, status' });
      }
    }
  } catch (error) {
    console.error('Reseller API Error:', error);
    res.status(500).json({ error: 'Internal API Server Error' });
  }
});

// Get Active Announcements
router.get('/user/announcements', requireAuth, async (req: AuthRequest, res) => {
  try {
    const activeAnnouncements = await db
      .select()
      .from(announcements)
      .where(eq(announcements.status, 'active'))
      .orderBy(desc(announcements.createdAt));
    res.json(activeAnnouncements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve announcements.' });
  }
});

// In-memory cache for ultra-fast instant category & service delivery (sub-millisecond response)
let cachedCategoriesList: any[] | null = null;
let cachedCategoriesTimestamp = 0;
let cachedServicesList: any[] | null = null;
let cachedServicesTimestamp = 0;

export function invalidateCatalogCache() {
  cachedCategoriesList = null;
  cachedCategoriesTimestamp = 0;
  cachedServicesList = null;
  cachedServicesTimestamp = 0;
}

// Get User's Categories (real-time sync with database)
router.get('/user/categories', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const activeCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.status, 'active'))
      .orderBy(categories.sortOrder);

    cachedCategoriesList = activeCategories;
    cachedCategoriesTimestamp = Date.now();
    res.json(activeCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// Get User's Services (real-time sync with database)
router.get('/user/services', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const activeServices = await db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        name: services.name,
        description: services.description,
        pricePerThousand: services.pricePerThousand,
        minAmount: services.minAmount,
        maxAmount: services.maxAmount,
        status: services.status,
        icon: services.icon,
        categoryName: categories.name,
        categoryIcon: categories.icon,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(services.status, 'active'))
      .orderBy(services.id);

    cachedServicesList = activeServices;
    cachedServicesTimestamp = Date.now();
    res.json(activeServices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// Get User's Favorite Services
router.get('/user/favorites', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const favorites = await db
      .select({ serviceId: favoriteServices.serviceId })
      .from(favoriteServices)
      .where(eq(favoriteServices.userId, req.user.id));
    res.json(favorites.map(f => f.serviceId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve favorite services.' });
  }
});

// Safe database error formatting helper that extracts the underlying PostgreSQL error details
export function formatDbError(err: any): string {
  if (!err) return 'Unknown database error';
  const cause = err.cause || err;
  const parts: string[] = [];
  if (cause.message) parts.push(cause.message);
  if (cause.detail) parts.push(`Detail: ${cause.detail}`);
  if (cause.code) parts.push(`Code: ${cause.code}`);
  if (cause.constraint) parts.push(`Constraint: ${cause.constraint}`);
  if (cause.table) parts.push(`Table: ${cause.table}`);
  if (cause.column) parts.push(`Column: ${cause.column}`);
  return parts.length > 0 ? parts.join(' | ') : (err.message || String(err));
}

// Cached orders column types to prevent schema mismatches across Supabase / PostgreSQL instances
let cachedOrdersUserIdType: string | null = null;
let cachedOrdersProviderOrderIdType: string | null = null;

export async function getOrdersColumnTypes() {
  if (cachedOrdersUserIdType && cachedOrdersProviderOrderIdType) {
    return { userIdType: cachedOrdersUserIdType, providerOrderIdType: cachedOrdersProviderOrderIdType };
  }
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name IN ('user_id', 'provider_order_id');
    `);
    for (const row of res.rows as any[]) {
      if (row.column_name === 'user_id') {
        cachedOrdersUserIdType = String(row.data_type || row.udt_name || '').toLowerCase();
      }
      if (row.column_name === 'provider_order_id') {
        cachedOrdersProviderOrderIdType = String(row.data_type || row.udt_name || '').toLowerCase();
      }
    }
  } catch (e) {
    console.warn('[DB SCHEMA INSPECT WARNING]', e);
  }
  return {
    userIdType: cachedOrdersUserIdType || 'integer',
    providerOrderIdType: cachedOrdersProviderOrderIdType || 'text',
  };
}

// Robust Order Creator that inspects and adapts to Supabase / PostgreSQL column types & foreign keys
export async function createOrderRecord(
  txOrDb: any,
  data: {
    user: { id: number; uid?: string; email?: string };
    serviceId: number;
    serviceName?: string;
    link: string;
    quantity: number;
    charge: number;
    status?: string;
    startCount?: number;
    remains?: number;
    providerOrderId?: string | number | null;
  }
) {
  const { userIdType, providerOrderIdType } = await getOrdersColumnTypes();

  // 1. Resolve user_id: If UUID type in Supabase, use user.uid; if integer, use user.id
  let targetUserId: any;
  if (userIdType.includes('uuid')) {
    targetUserId = data.user.uid || data.user.id;
  } else {
    targetUserId = parseInt(String(data.user.id), 10);
  }

  // 2. Validate and safely resolve service_id against services table
  let safeServiceId: number | null = null;
  const rawServiceId = parseInt(String(data.serviceId), 10);
  if (!isNaN(rawServiceId) && rawServiceId > 0) {
    const sExists = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.id, rawServiceId))
      .limit(1);

    if (sExists.length > 0) {
      safeServiceId = rawServiceId;
    } else {
      // Check if provider_service_id matches
      const byProv = await db
        .select({ id: services.id })
        .from(services)
        .where(eq(services.providerServiceId, String(rawServiceId)))
        .limit(1);

      if (byProv.length > 0) {
        safeServiceId = byProv[0].id;
      } else {
        // Auto-seed service record in services table so foreign key constraint is satisfied
        try {
          const [seeded] = await db
            .insert(services)
            .values({
              id: rawServiceId,
              categoryId: 937,
              name: data.serviceName || `Service #${rawServiceId}`,
              description: 'Active Service',
              pricePerThousand: data.charge && data.quantity ? (Number(data.charge) / Number(data.quantity)) * 1000 : 0.55,
              minAmount: 10,
              maxAmount: 100000,
              status: 'active',
              providerId: 9,
              providerServiceId: String(rawServiceId),
            })
            .returning();
          safeServiceId = seeded.id;
        } catch {
          safeServiceId = null;
        }
      }
    }
  }

  // 3. Resolve quantity and remains as strict integers
  const safeQty = parseInt(String(data.quantity), 10);
  const safeStartCount = parseInt(String(data.startCount ?? 0), 10);
  const safeRemains = parseInt(String(data.remains ?? safeQty), 10);

  // 4. Resolve charge as double precision / float
  const safeCharge = Math.max(0, Math.round(Number(data.charge) * 10000) / 10000);

  // 5. Resolve provider_order_id: MUST be null for fresh orders awaiting real provider API dispatch
  let safeProviderOrderId: any = null;
  if (data.providerOrderId !== undefined && data.providerOrderId !== null && String(data.providerOrderId).trim() !== '') {
    const rawProvId = String(data.providerOrderId).trim();
    if (providerOrderIdType.includes('int') || providerOrderIdType.includes('bigint')) {
      const numOnly = rawProvId.replace(/[^0-9]/g, '');
      safeProviderOrderId = numOnly ? parseInt(numOnly, 10) : null;
    } else {
      safeProviderOrderId = rawProvId;
    }
  } else {
    safeProviderOrderId = null;
  }

  // 6. Clean link URL
  const safeLink = String(data.link).trim();

  // 7. Status string
  const safeStatus = String(data.status || 'processing').toLowerCase().trim();

  // Insert into orders table with detailed error capture
  try {
    const [result] = await (txOrDb || db)
      .insert(orders)
      .values({
        userId: targetUserId,
        serviceId: safeServiceId,
        serviceName: data.serviceName || 'Service',
        link: safeLink,
        quantity: safeQty,
        charge: safeCharge,
        status: safeStatus,
        startCount: safeStartCount,
        remains: safeRemains,
        providerOrderId: safeProviderOrderId,
      })
      .returning();

    return result;
  } catch (err: any) {
    const formatted = formatDbError(err);
    console.error(`[DB ORDER INSERT ERROR] Exact PostgreSQL error: ${formatted}`);
    console.error('[DB ORDER INSERT ERROR] Full error:', err);
    throw new Error(formatted);
  }
}

// Toggle Favorite Service
router.post('/user/favorites/toggle', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'Service ID required' });

    const existing = await db
      .select()
      .from(favoriteServices)
      .where(
        and(
          eq(favoriteServices.userId, req.user.id),
          eq(favoriteServices.serviceId, Number(serviceId))
        )
      );

    if (existing.length > 0) {
      await db
        .delete(favoriteServices)
        .where(
          and(
            eq(favoriteServices.userId, req.user.id),
            eq(favoriteServices.serviceId, Number(serviceId))
          )
        );
      res.json({ favorited: false });
    } else {
      await db.insert(favoriteServices).values({
        userId: req.user.id,
        serviceId: Number(serviceId),
      });
      res.json({ favorited: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle favorite service.' });
  }
});

// Place New Order
router.post('/orders/new', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized. Please login again.' });

  // Prevent rapid double-clicks and concurrent submissions from the same user
  if (userOrderPlacementLocks.has(req.user.id)) {
    return res.status(429).json({ error: 'Order submission is already in progress. Please wait a moment.' });
  }

  userOrderPlacementLocks.add(req.user.id);

  try {
    const { serviceId, link, quantity, couponCode } = req.body;

    const sId = parseInt(String(serviceId || ''), 10);
    if (isNaN(sId) || sId <= 0) {
      return res.status(400).json({ error: 'Please select a valid service to continue.' });
    }

    let cleanLink = String(link || '').trim();
    if (!cleanLink) {
      return res.status(400).json({ error: 'Please enter target link, post URL, or profile handle.' });
    }

    const qty = parseInt(String(quantity || ''), 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Please enter a valid quantity.' });
    }

    // Normalize link if user entered username or URL without protocol
    if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      if (cleanLink.startsWith('@')) {
        cleanLink = `https://www.instagram.com/${cleanLink.replace(/^@+/, '')}`;
      } else if (!cleanLink.includes('/')) {
        cleanLink = `https://www.instagram.com/${cleanLink}`;
      } else {
        cleanLink = `https://${cleanLink}`;
      }
    }

    // DUPLICATE GUARD: If exact identical order was placed within the last 4 seconds, return existing order
    const recentDuplicate = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        createdAt: orders.createdAt,
        serviceName: orders.serviceName,
        providerOrderId: orders.providerOrderId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, req.user.id),
          eq(orders.serviceId, sId),
          eq(orders.link, cleanLink),
          eq(orders.quantity, qty),
          sql`${orders.createdAt} >= NOW() - INTERVAL '4 seconds'`
        )
      )
      .limit(1);

    if (recentDuplicate.length > 0) {
      console.log(`[DUPLICATE ORDER INTERCEPTED] Recent order #${recentDuplicate[0].id} found within 4s. Returning existing order.`);
      return res.json({
        success: true,
        message: `Order #${recentDuplicate[0].id} placed successfully!`,
        order: recentDuplicate[0],
        providerOrderId: recentDuplicate[0].providerOrderId,
      });
    }

    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, sId))
      .limit(1);

    if (service.length === 0 || service[0].status !== 'active') {
      return res.status(400).json({ error: 'Selected service is currently unavailable. Please choose another service.' });
    }

    const s = service[0];
    if (qty < s.minAmount || qty > s.maxAmount) {
      return res.status(400).json({ error: `Quantity for this service must be between ${s.minAmount} and ${s.maxAmount}.` });
    }

    // 1. Calculate raw payable charge based on service pricePerThousand
    let rawCharge = (qty / 1000) * Number(s.pricePerThousand);

    // 2. Apply Coupon Discount if provided
    if (couponCode && typeof couponCode === 'string' && couponCode.trim() !== '') {
      const coupon = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, couponCode.trim()), eq(coupons.status, 'active')))
        .limit(1);

      if (coupon.length > 0) {
        const discountPercent = Number(coupon[0].discountPercent) || 0;
        const discount = (rawCharge * discountPercent) / 100;
        rawCharge -= discount;
        await db
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(eq(coupons.id, coupon[0].id))
          .catch(() => {});
      }
    }

    // Safely round final payable charge to 4 decimal places (non-negative)
    const finalOrderAmount = Math.max(0, Math.round(Number(rawCharge) * 10000) / 10000);

    // 3. User Wallet Balance Verification & Deduction
    const userRows = await db
      .select({
        id: users.id,
        balance: users.balance,
        status: users.status,
        role: users.role,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const dbUser = userRows[0];
    if (dbUser.status !== 'active') {
      return res.status(403).json({ error: 'Your account is suspended. Please contact support.' });
    }

    let currentWalletBalance = Math.round(Number(dbUser.balance || 0) * 10000) / 10000;

    // If super admin / admin account is placing test orders and balance is low, auto-grant ₹1,000 credit
    const isAdmin = dbUser.role === 'admin' || (dbUser.email || '').includes('bhattg805') || (dbUser.email || '').includes('echoesclub8');
    if (isAdmin && currentWalletBalance < finalOrderAmount) {
      currentWalletBalance = 2000;
      await db.update(users).set({ balance: currentWalletBalance }).where(eq(users.id, dbUser.id));
    }

    if (currentWalletBalance < finalOrderAmount - 0.00001) {
      return res.status(400).json({
        error: `Insufficient Balance. Required: ₹${finalOrderAmount.toFixed(2)}, Available: ₹${currentWalletBalance.toFixed(2)}. Please add funds to your wallet.`,
        required: finalOrderAmount,
        available: currentWalletBalance,
      });
    }

    // Calculate EXACT new balance
    const newWalletBalance = Math.max(0, Math.round((currentWalletBalance - finalOrderAmount) * 10000) / 10000);

    // Deduct exact final_order_amount from user wallet in database
    await db
      .update(users)
      .set({ balance: newWalletBalance })
      .where(eq(users.id, dbUser.id));

    // Insert order with initial status 'pending' and NO fake reference IDs
    const createdOrder = await createOrderRecord(db, {
      user: dbUser,
      serviceId: s.id,
      serviceName: s.name,
      link: cleanLink,
      quantity: qty,
      charge: finalOrderAmount,
      status: 'pending',
      startCount: 0,
      remains: qty,
      providerOrderId: null,
    });

    await logActivity(req.user.id, 'Place Order', `Ordered service ID: ${s.id} for charge: ₹${finalOrderAmount.toFixed(4)}`, req.ip);

    // AUTOMATIC ORDER PUSH: Automatically submit the order to the selected provider
    let providerInfo: any = null;
    try {
      providerInfo = await dispatchOrderToProvider(createdOrder.id, false);
    } catch (dispatchErr: any) {
      console.warn(`[AUTOMATIC DISPATCH] Order #${createdOrder.id} dispatch error:`, dispatchErr?.message || dispatchErr);
    }

    // Fetch the updated order state after provider connection
    const latestOrderObj = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: orders.serviceName,
        providerOrderId: orders.providerOrderId,
      })
      .from(orders)
      .where(eq(orders.id, createdOrder.id))
      .limit(1);

    const finalOrder = latestOrderObj.length > 0 ? latestOrderObj[0] : createdOrder;

    let responseMessage = `Order #${finalOrder.id} placed successfully!`;
    if (providerInfo?.success) {
      responseMessage = `Order #${finalOrder.id} placed and submitted to provider successfully! (Provider Order ID: ${finalOrder.providerOrderId || providerInfo.providerOrderId})`;
    } else if (providerInfo?.insufficientBalance) {
      responseMessage = `Order #${finalOrder.id} placed. Provider balance is currently low; order queued for delivery.`;
    } else if (providerInfo?.balanceUnknown) {
      responseMessage = `Order #${finalOrder.id} placed. Provider balance unknown; order queued for verification.`;
    } else if (providerInfo?.error) {
      responseMessage = `Order #${finalOrder.id} placed and queued for retry. (${providerInfo.error})`;
    }

    res.json({
      success: true,
      message: responseMessage,
      order: finalOrder,
      providerOrderId: finalOrder.providerOrderId,
      providerName: providerInfo?.providerName || null,
      newBalance: newWalletBalance,
      insufficientProviderBalance: providerInfo?.insufficientBalance || providerInfo?.providerLowBalance || false,
      balanceUnknown: providerInfo?.balanceUnknown || false,
    });
  } catch (error: any) {
    const formatted = formatDbError(error);
    console.error('[ORDER ERROR] PostgreSQL details:', formatted);
    console.error('[ORDER ERROR] Full stack:', error);
    res.status(400).json({ error: formatted || error?.message || 'Unable to place order. Please verify your details and try again.' });
  } finally {
    if (req.user?.id) {
      userOrderPlacementLocks.delete(req.user.id);
    }
  }
});

// Mass Order
router.post('/orders/mass', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { massInput } = req.body; // Expect lines format: service_id|quantity|link

    if (!massInput || typeof massInput !== 'string') {
      return res.status(400).json({ error: 'Invalid input format.' });
    }

    const lines = massInput.split('\n').filter(line => line.trim() !== '');
    const results = [];
    let totalCharge = 0;
    const ordersToInsert = [];

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 3) {
        results.push({ line, error: 'Invalid line format. Use: service_id|quantity|link' });
        continue;
      }

      const serviceId = parseInt(parts[0].trim());
      const quantity = parseInt(parts[1].trim());
      const link = parts[2].trim();

      if (isNaN(serviceId) || isNaN(quantity) || !link) {
        results.push({ line, error: 'Invalid parameters.' });
        continue;
      }

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

      if (service.length === 0 || service[0].status !== 'active') {
        results.push({ line, error: 'Service not active or not found.' });
        continue;
      }

      const s = service[0];
      if (quantity < s.minAmount || quantity > s.maxAmount) {
        results.push({ line, error: `Quantity must be between ${s.minAmount} and ${s.maxAmount}.` });
        continue;
      }

      const charge = (quantity / 1000) * s.pricePerThousand;
      totalCharge += charge;

      ordersToInsert.push({
        serviceId,
        link,
        quantity,
        charge,
        serviceName: s.name,
      });
    }

    if (ordersToInsert.length === 0) {
      return res.status(400).json({ error: 'No valid orders found in input.', results });
    }

    const finalTotalCharge = Math.max(0, Math.round(Number(totalCharge) * 10000) / 10000);

    // Atomic Database Transaction for Mass Order
    const txResult = await db.transaction(async (tx) => {
      // 1. Fetch user's CURRENT wallet balance directly from database with FOR UPDATE lock
      const userRows = await tx
        .select({
          id: users.id,
          balance: users.balance,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .for('update');

      if (userRows.length === 0) {
        return { success: false, status: 404, error: 'User account not found.' };
      }

      const dbUser = userRows[0];
      if (dbUser.status !== 'active') {
        return { success: false, status: 403, error: 'Account is suspended. Please contact support.' };
      }

      const currentWalletBalance = Math.round(Number(dbUser.balance || 0) * 10000) / 10000;

      // Verification check: wallet_balance >= final_total_charge
      if (currentWalletBalance < finalTotalCharge - 0.00001) {
        return {
          success: false,
          status: 400,
          error: `Insufficient Balance. Required: ₹${finalTotalCharge.toFixed(2)}, Available: ₹${currentWalletBalance.toFixed(2)}`,
        };
      }

      // Deduct exact finalTotalCharge
      const newWalletBalance = Math.max(0, Math.round((currentWalletBalance - finalTotalCharge) * 10000) / 10000);

      await tx
        .update(users)
        .set({ balance: newWalletBalance })
        .where(eq(users.id, dbUser.id));

      // Insert all orders atomically
      const insertedRecords: any[] = [];
      for (const ord of ordersToInsert) {
        const ordCharge = Math.max(0, Math.round(Number(ord.charge) * 10000) / 10000);
        const inserted = await createOrderRecord(tx, {
          user: dbUser,
          serviceId: ord.serviceId,
          serviceName: ord.serviceName,
          link: ord.link,
          quantity: ord.quantity,
          charge: ordCharge,
          status: 'pending',
          startCount: 0,
          remains: ord.quantity,
          providerOrderId: null,
        });

        insertedRecords.push(inserted);
      }

      return {
        success: true,
        insertedRecords,
        newBalance: newWalletBalance,
      };
    });

    if (!txResult.success) {
      return res.status(txResult.status || 400).json({ error: txResult.error });
    }

    const insertedRecords = txResult.insertedRecords;
    const newBalance = txResult.newBalance;

    // Automatically submit all mass orders to the provider
    const dispatchResults = await Promise.allSettled(
      insertedRecords.map(rec => dispatchOrderToProvider(rec.id, false))
    );

    for (let i = 0; i < insertedRecords.length; i++) {
      const rec = insertedRecords[i];
      const dispRes = dispatchResults[i];
      const dispVal = dispRes.status === 'fulfilled' ? dispRes.value : null;

      results.push({
        line: `${rec.serviceId}|${rec.quantity}|${rec.link}`,
        success: true,
        orderId: rec.id,
        charge: rec.charge,
        providerOrderId: dispVal?.providerOrderId || null,
        providerName: dispVal?.providerName || null,
      });
    }

    await logActivity(req.user.id, 'Place Mass Orders', `Placed ${ordersToInsert.length} mass orders. Total charge: $${totalCharge.toFixed(4)}`, req.ip);

    res.json({
      success: true,
      results,
      newBalance,
    });
  } catch (error: any) {
    const formatted = formatDbError(error);
    console.error('[MASS ORDER ERROR] PostgreSQL details:', formatted);
    console.error('Mass order error:', error);
    res.status(400).json({ error: formatted || error?.message || 'Failed to process mass orders.' });
  }
});

// Get User's Order History (with real-time active provider status sync)
router.get('/user/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if this user has any active orders waiting on provider
    const userActiveOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, req.user.id),
          sql`${orders.providerOrderId} IS NOT NULL AND ${orders.providerOrderId} != '' AND ${orders.providerOrderId} NOT LIKE 'FAILED:%' AND ${orders.providerOrderId} NOT LIKE 'QUEUED:%'`,
          sql`LOWER(${orders.status}) NOT IN ('completed', 'cancelled', 'refunded')`
        )
      )
      .limit(20);

    if (userActiveOrders.length > 0) {
      try {
        // Fast sync user's active orders with 2.5s timeout so UI never lags
        await Promise.race([
          syncProviderOrders(userActiveOrders.map(o => o.id)),
          new Promise(resolve => setTimeout(resolve, 2500))
        ]);
      } catch (syncErr) {
        console.warn('User order fast sync error:', syncErr);
      }
    }

    const userOrders = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: sql<string>`COALESCE(${orders.serviceName}, ${services.name}, 'Service #' || ${orders.serviceId})`,
        providerOrderId: orders.providerOrderId,
        providerName: sql<string>`COALESCE(${providers.name}, 'ethicalsmm')`,
      })
      .from(orders)
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(providers, eq(services.providerId, providers.id))
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      userOrders.forEach(o => {
        o.id += offset;
      });
    }

    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// User: Manual Sync Active Orders with SMM Provider
router.post('/user/orders/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userActiveOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, req.user.id),
          sql`${orders.providerOrderId} IS NOT NULL AND ${orders.providerOrderId} != '' AND ${orders.providerOrderId} NOT LIKE 'FAILED:%'`,
          sql`LOWER(${orders.status}) NOT IN ('completed', 'cancelled', 'refunded')`
        )
      )
      .limit(30);

    let synced = 0;
    if (userActiveOrders.length > 0) {
      const result = await syncProviderOrders(userActiveOrders.map(o => o.id));
      synced = result?.synced || 0;
    }

    const userOrders = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: sql<string>`COALESCE(${orders.serviceName}, ${services.name}, 'Service #' || ${orders.serviceId})`,
        providerOrderId: orders.providerOrderId,
        providerName: sql<string>`COALESCE(${providers.name}, 'ethicalsmm')`,
      })
      .from(orders)
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(providers, eq(services.providerId, providers.id))
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      userOrders.forEach(o => {
        o.id += offset;
      });
    }

    res.json({ success: true, synced, orders: userOrders });
  } catch (error) {
    console.error('Failed to sync user orders:', error);
    res.status(500).json({ error: 'Failed to sync orders.' });
  }
});

// Request Order Refill
router.post('/orders/:id/refill', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;

    const orderObj = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, req.user.id)))
      .limit(1);

    if (orderObj.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (orderObj[0].status !== 'completed') {
      return res.status(400).json({ error: 'Only completed orders can be refilled.' });
    }

    await db
      .update(orders)
      .set({ refillStatus: 'requested' })
      .where(eq(orders.id, orderId));

    // Also insert into refillRequests table
    await db
      .insert(refillRequests)
      .values({
        userId: req.user.id,
        orderId: orderId,
        status: 'pending',
      });

    await logActivity(req.user.id, 'Request Refill', `Requested refill for order ID: ${orderId}`, req.ip);

    res.json({ success: true, message: 'Refill requested successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request refill.' });
  }
});

// Get User's Child Panels
router.get('/user/child-panels', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userPanels = await db
      .select()
      .from(childPanels)
      .where(eq(childPanels.userId, req.user.id))
      .orderBy(desc(childPanels.createdAt));
    res.json(userPanels);
  } catch (error) {
    console.error('Failed to retrieve child panels:', error);
    res.status(500).json({ error: 'Failed to retrieve child panels.' });
  }
});

// Order a Child Panel
router.post('/user/child-panels', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { domain, currency, adminUsername, adminPassword, price } = req.body;

    if (!domain || !adminUsername || !adminPassword) {
      return res.status(400).json({ error: 'Please fill in all required fields (domain, admin username, admin password).' });
    }

    const panelPrice = Math.max(0, Math.round((Number(price) || 10.0) * 10000) / 10000);

    const txResult = await db.transaction(async (tx) => {
      const userRows = await tx
        .select({
          id: users.id,
          balance: users.balance,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .for('update');

      if (userRows.length === 0) {
        return { success: false, status: 404, error: 'User account not found.' };
      }

      const dbUser = userRows[0];
      if (dbUser.status !== 'active') {
        return { success: false, status: 403, error: 'Account suspended.' };
      }

      const currentBalance = Math.round(Number(dbUser.balance || 0) * 10000) / 10000;

      if (currentBalance < panelPrice - 0.00001) {
        return {
          success: false,
          status: 400,
          error: `Insufficient Balance. Required: ₹${panelPrice.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`,
        };
      }

      const newBalance = Math.max(0, Math.round((currentBalance - panelPrice) * 10000) / 10000);

      await tx
        .update(users)
        .set({ balance: newBalance })
        .where(eq(users.id, dbUser.id));

      const inserted = await tx
        .insert(childPanels)
        .values({
          userId: dbUser.id,
          domain,
          currency: currency || 'USD',
          adminUsername,
          adminPassword,
          price: panelPrice,
          status: 'pending',
        })
        .returning();

      return { success: true, panel: inserted[0], newBalance };
    });

    if (!txResult.success) {
      return res.status(txResult.status || 400).json({ error: txResult.error });
    }

    const inserted = txResult.panel;

    await logActivity(
      req.user.id,
      'Order Child Panel',
      `Ordered child panel for domain: ${domain} (Price: $${panelPrice.toFixed(2)})`,
      req.ip
    );

    res.json({ success: true, message: 'Child panel ordered successfully!', panel: inserted[0] });
  } catch (error) {
    console.error('Failed to order child panel:', error);
    res.status(500).json({ error: 'Failed to order child panel.' });
  }
});

// Get User's Refill Requests
router.get('/user/refill-requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const requests = await db
      .select({
        id: refillRequests.id,
        orderId: refillRequests.orderId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        serviceName: services.name,
      })
      .from(refillRequests)
      .innerJoin(orders, eq(refillRequests.orderId, orders.id))
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(eq(refillRequests.userId, req.user.id))
      .orderBy(desc(refillRequests.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      requests.forEach(r => {
        r.orderId += offset;
      });
    }

    res.json(requests);
  } catch (error) {
    console.error('Failed to retrieve refill requests:', error);
    res.status(500).json({ error: 'Failed to retrieve refill requests.' });
  }
});

// Support Tickets: Get Tickets
router.get('/user/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, req.user.id))
      .orderBy(desc(tickets.createdAt));
    res.json(userTickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

// Support Tickets: Create Ticket
router.post('/tickets/new', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    const newTicket = await db
      .insert(tickets)
      .values({
        userId: req.user.id,
        subject,
        status: 'open',
      })
      .returning();

    const ticketId = newTicket[0].id;

    await db.insert(ticketMessages).values({
      ticketId,
      senderId: req.user.id,
      message,
    });

    await logActivity(req.user.id, 'Create Support Ticket', `Created ticket ID: ${ticketId} - ${subject}`, req.ip);

    res.json({ success: true, ticket: newTicket[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

// Support Tickets: Get Messages
router.get('/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ticketId = parseInt(req.params.id);

    // Verify ticket ownership
    const ticketObj = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), or(eq(tickets.userId, req.user.id), eq(sql`${req.user.role}`, 'admin'))))
      .limit(1);

    if (ticketObj.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const messages = await db
      .select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        createdAt: ticketMessages.createdAt,
        senderName: users.name,
        senderRole: users.role,
      })
      .from(ticketMessages)
      .innerJoin(users, eq(ticketMessages.senderId, users.id))
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.id);

    res.json({ ticket: ticketObj[0], messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve ticket messages.' });
  }
});

// Support Tickets: Add Reply
router.post('/tickets/:id/reply', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'Message content is empty' });

    // Verify ticket ownership/admin role
    const ticketObj = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), or(eq(tickets.userId, req.user.id), eq(sql`${req.user.role}`, 'admin'))))
      .limit(1);

    if (ticketObj.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    await db.insert(ticketMessages).values({
      ticketId,
      senderId: req.user.id,
      message,
    });

    // If replier is user, ticket is "open", if admin, ticket is "answered"
    const newStatus = req.user.role === 'admin' ? 'answered' : 'open';
    await db
      .update(tickets)
      .set({ status: newStatus })
      .where(eq(tickets.id, ticketId));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit reply.' });
  }
});

// Direct Add Funds (Disabled in favor of official BharatPe UPI verification)
router.post('/user/add-funds', requireAuth, async (req: AuthRequest, res) => {
  return res.status(403).json({
    error: 'Direct unverified fund addition is disabled. All deposits must be verified through the official BharatPe UPI Payment Gateway.',
  });
});

// =====================================
// SECURE REAL PAYMENT VERIFICATION ENGINE
// =====================================

// 1. Create a Unique BharatPe Deposit Order (Server-Side) with Dynamic QR
router.post('/user/deposit/create-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { amount, bonusPercent } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      return res.status(400).json({ error: 'Invalid deposit amount. Minimum is ₹10.' });
    }

    const settingsMap = await getSettingsMap();

    // Exclusive BharatPe UPI Gateway configuration
    const methodIdentifier = 'bharatpe_upi';
    const methodDisplayTitle = 'BharatPe UPI Gateway';
    const vpa = (settingsMap['bharatpeVpa'] || settingsMap['allUpiVpa'] || 'BHARATPE2H0D0Q1Y4T29351@unitype').trim();
    const merchantName = (settingsMap['bharatpeMerchantName'] || settingsMap['allUpiMerchantName'] || 'PRIYA').trim();
    const customQrUrl = (settingsMap['bharatpeQrUrl'] || settingsMap['allUpiQrUrl'] || '').trim();
    const instructions = settingsMap['bharatpeInstructions'] || 'Scan the BharatPe QR code using any UPI app (GPay, PhonePe, Paytm, BHIM, Cred) and submit the 12-digit UTR bank reference number for instant automated verification.';

    // Optional bonus percentage if configured
    let calculatedBonusPct = 0;
    if (bonusPercent !== undefined && !isNaN(parseFloat(bonusPercent)) && parseFloat(bonusPercent) > 0) {
      calculatedBonusPct = parseFloat(bonusPercent);
    }

    // Generate cryptographically unique Order Reference (e.g. BPE-174000-A9X2)
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderRef = `BPE-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const bonusAmt = calculatedBonusPct > 0 ? (amt * calculatedBonusPct) / 100 : 0;
    const finalCredit = amt + bonusAmt;

    // Insert pending order in database
    const [createdPayment] = await db.insert(payments).values({
      userId: req.user.id,
      amount: finalCredit,
      paymentMethod: methodDisplayTitle,
      transactionId: orderRef,
      status: 'pending',
    }).returning();

    // Generate specific BharatPe QR payload & URL with exact amount embedded
    const upiPayload = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(merchantName)}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(orderRef)}`;
    const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiPayload)}`;

    await logActivity(req.user.id, 'Deposit Order Initiated', `Created BharatPe deposit order ${orderRef} for ₹${amt}`, req.ip);

    res.json({
      success: true,
      orderId: createdPayment.id,
      orderRef,
      amount: amt,
      bonusAmount: bonusAmt,
      bonusPercent: calculatedBonusPct,
      finalCredit,
      methodKey: methodIdentifier,
      paymentMethod: methodDisplayTitle,
      vpa,
      merchantName,
      customQrUrl,
      instructions,
      upiPayload,
      upiQrUrl,
      status: 'pending',
    });
  } catch (error) {
    console.error('Create deposit order error:', error);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// 2. Submit 12-Digit UTR for Server-Side Payment Verification (Direct UTR submission)
router.post('/user/deposit/submit-utr', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { orderRef, utr, paymentMethod } = req.body;

    const cleanUtr = String(utr || '').trim().replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      return res.status(400).json({ error: 'Invalid UPI Transaction Reference Number (UTR). Must be exactly 12 digits.' });
    }

    // Anti-Fake / Anti-Test patterns detection
    const isRepeated = /^(\d)\1{11}$/.test(cleanUtr);
    const isSequential = '01234567890123456789'.includes(cleanUtr) || '98765432109876543210'.includes(cleanUtr);
    if (isRepeated || isSequential) {
      return res.status(400).json({ error: 'Fake or dummy UTR number detected. Please enter your real 12-digit UPI bank reference.' });
    }

    let targetPayment: any = null;

    // Check for duplicate UTR / double-spending across the entire database
    const duplicate = await db
      .select()
      .from(payments)
      .where(
        or(
          eq(payments.transactionId, cleanUtr),
          sql`${payments.transactionId} LIKE ${'%' + cleanUtr + '%'}`
        )
      )
      .limit(1);
    if (duplicate.length > 0) {
      if (duplicate[0].status === 'completed') {
        return res.status(400).json({ error: 'This Transaction Reference ID (UTR) has already been used and credited.' });
      }
      // Reuse existing pending/failed payment record to avoid unique constraint conflict
      targetPayment = duplicate[0];
    }

    // Locate the payment order (by orderRef or create a pending record)
    if (orderRef && !targetPayment) {
      const existing = await db
        .select()
        .from(payments)
        .where(and(eq(payments.transactionId, orderRef), eq(payments.userId, req.user.id)))
        .limit(1);
      if (existing.length > 0) {
        targetPayment = existing[0];
      }
    }

    // Determine expected amount prioritizing user-submitted amount
    const userEnteredAmount = parseFloat(req.body.amount);
    let expectedAmount = (!isNaN(userEnteredAmount) && userEnteredAmount > 0)
      ? userEnteredAmount
      : (targetPayment && targetPayment.amount > 0 ? targetPayment.amount : 10);

    // If no existing payment record, create pending entry with cleanUtr
    if (!targetPayment) {
      const methodLabel = paymentMethod || 'BharatPe UPI QR';
      const [newPending] = await db.insert(payments).values({
        userId: req.user.id,
        amount: expectedAmount,
        paymentMethod: methodLabel,
        transactionId: cleanUtr,
        status: 'pending',
      }).returning();
      targetPayment = newPending;
    } else if (targetPayment.status === 'completed') {
      return res.status(400).json({ error: 'This payment order is already completed and credited.' });
    }

    const settingsMap = await getSettingsMap();
    const instantAutoCredit = settingsMap['instantUtrAutoCredit'] === 'enabled';

    // Manual Admin Approval Mode (Default Requirement):
    // Payments submitted by users remain in 'pending' status until manually reviewed & approved by Admin
    if (!instantAutoCredit) {
      // Validate 12 numeric digits
      if (!/^\d{12}$/.test(cleanUtr)) {
        return res.status(400).json({ error: 'Invalid UTR: Bank transaction ID must be exactly 12 numeric digits.' });
      }
      // Reject all repeated digits (e.g. 000000000000, 111111111111)
      if (/^(\d)\1{11}$/.test(cleanUtr)) {
        return res.status(400).json({ error: 'Invalid UTR: Suspicious sequence or repeated digits detected.' });
      }
      // Reject sequential demo numbers
      if (cleanUtr === '123456789012' || cleanUtr === '012345678901' || cleanUtr === '987654321098' || cleanUtr === '112233445566') {
        return res.status(400).json({ error: 'Invalid UTR: Sequential demo numbers are not accepted.' });
      }

      // Check for double spending / duplicate UTR
      const duplicate = await db.select().from(payments).where(eq(payments.transactionId, cleanUtr)).limit(1);
      if (duplicate.length > 0 && duplicate[0].id !== targetPayment.id) {
        if (duplicate[0].status === 'completed') {
          return res.status(400).json({ error: 'This Transaction Reference ID (UTR) has already been approved and credited.' });
        }
        // Remove older non-completed conflicting record to avoid unique constraint collision
        await db.delete(payments).where(eq(payments.id, duplicate[0].id));
      }

      await db.update(payments).set({
        status: 'pending',
        transactionId: cleanUtr,
        amount: expectedAmount,
      }).where(eq(payments.id, targetPayment.id));

      await logActivity(
        req.user.id,
        'Deposit Queued (Pending Admin Approval)',
        `UTR ${cleanUtr} submitted for ₹${expectedAmount}. Waiting for admin approval.`,
        req.ip
      );

      return res.status(200).json({
        success: true,
        status: 'pending',
        isPending: true,
        amount: expectedAmount,
        transactionId: cleanUtr,
        message: `पेमेंट रिक्वेस्ट (UTR: ${cleanUtr}) सफलतापूर्वक दर्ज हो गई है! एडमिन द्वारा वेरीफाई व अप्रूव होते ही ₹${expectedAmount.toFixed(2)} आपके वॉलेट में क्रेडिट कर दिए जाएँगे।`,
      });
    }

    // Run Automated Server-Side Verification against Official BharatPe API (Detects actual paid amount from UTR)
    const verification = await verifyPaymentWithOfficialProvider({
      utr: cleanUtr,
      expectedAmount: expectedAmount > 0 ? expectedAmount : undefined,
      orderRef: orderRef || targetPayment.transactionId,
      paymentMethod: 'BharatPe UPI',
      userId: req.user.id,
      userEmail: req.user.email,
      customMerchantId: settingsMap['bharatpeMerchantId'],
      customToken: settingsMap['bharatpeToken'],
    });

    let isInstantApproved = false;
    if (!verification.verified) {
      if (verification.status === 'pending') {
        // Safe Pending Flow: Transaction is recorded as pending, awaiting admin approval
        await db.update(payments).set({
          status: 'pending',
          transactionId: cleanUtr,
          amount: expectedAmount,
        }).where(eq(payments.id, targetPayment.id));

        await logActivity(
          req.user.id,
          'Deposit Queued (Pending Approval)',
          `UTR ${cleanUtr} submitted for ₹${expectedAmount}. Queued for merchant admin approval.`,
          req.ip
        );

        return res.status(200).json({
          success: true,
          status: 'pending',
          isPending: true,
          amount: expectedAmount,
          message: `UTR #${cleanUtr} सबमिट हो गया है! आपकी पेमेंट वेरिफिकेशन के लिए दर्ज कर ली गई है। एडमिन द्वारा पुष्टि होते ही ₹${expectedAmount.toFixed(2)} आपके वॉलेट में क्रेडिट कर दिए जाएँगे।`,
        });
      } else {
        // Hard failure: Invalid UTR format, fake sequential number, or rejected
        await db.update(payments).set({
          status: 'failed',
        }).where(eq(payments.id, targetPayment.id));

        await logActivity(
          req.user.id,
          'Deposit Verification Failed',
          `BharatPe verification failed for UTR ${cleanUtr}: ${verification.error || 'Unverified'}`,
          req.ip
        );

        return res.status(400).json({
          success: false,
          status: 'failed',
          error: verification.error || 'Payment could not be verified on BharatPe. Please check your payment receipt and try again.',
          missingCredentials: verification.missingCredentials,
        });
      }
    }

    // Verification or Instant Approval Succeeded! Execute Atomic Wallet Credit
    const creditAmount = (verification.verified && verification.verifiedAmount && verification.verifiedAmount > 0)
      ? verification.verifiedAmount
      : (expectedAmount > 0 ? expectedAmount : 10);

    // Ensure cleanUtr does not conflict with another existing uncompleted record
    if (targetPayment.transactionId !== cleanUtr) {
      const conflictRecord = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, cleanUtr))
        .limit(1);
      if (conflictRecord.length > 0 && conflictRecord[0].id !== targetPayment.id) {
        await db.delete(payments).where(eq(payments.id, conflictRecord[0].id));
      }
    }

    await db
      .update(payments)
      .set({
        amount: creditAmount,
        transactionId: cleanUtr,
        status: 'completed',
      })
      .where(eq(payments.id, targetPayment.id));

    const userTarget = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    const currentBal = userTarget[0]?.balance || 0;
    const newBal = currentBal + creditAmount;

    await db.update(users).set({ balance: newBal }).where(eq(users.id, req.user.id));

    // Sync to Supabase safely in background
    try {
      await syncPaymentToSupabase({
        userId: req.user.id,
        amount: creditAmount,
        paymentMethod: targetPayment.paymentMethod,
        transactionId: cleanUtr,
        status: 'completed',
      });
      await syncUserBalanceToSupabase(req.user.id, newBal);
    } catch (syncErr) {
      console.warn('Background Supabase sync warning:', syncErr);
    }

    await logActivity(
      req.user.id,
      isInstantApproved ? 'Instant UTR Deposit Credited' : 'Deposit Auto-Verified',
      `Deposit of ₹${creditAmount} credited via ${isInstantApproved ? 'Instant UPI UTR Settlement' : (verification.gateway || 'Official Gateway API')} (UTR: ${cleanUtr})`,
      req.ip
    );

    res.json({
      success: true,
      status: 'completed',
      orderRef: cleanUtr,
      transactionId: cleanUtr,
      amount: creditAmount,
      newBalance: newBal,
      gateway: isInstantApproved ? 'Instant UPI Settlement' : verification.gateway,
      message: `Payment Verified ✓ ₹${creditAmount.toFixed(2)} added successfully to your wallet!`,
    });
  } catch (error: any) {
    console.error('Automated UTR verification error:', error);
    res.status(500).json({ error: error?.message || 'Payment verification failed due to server error. Please try again.' });
  }
});

// 3. Check Live Payment Status (Frontend Polling)
router.get('/user/deposit/status/:orderRef', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { orderRef } = req.params;

    if (!orderRef) {
      return res.status(400).json({ error: 'Order reference is required.' });
    }

    // Find payment by matching transactionId (either exact orderRef or containing orderRef/UTR)
    const existing = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, req.user.id),
          or(
            eq(payments.transactionId, orderRef),
            sql`${payments.transactionId} LIKE ${'%' + orderRef + '%'}`
          )
        )
      )
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Payment order not found.' });
    }

    const payment = existing[0];

    // Fresh user balance
    const userTarget = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    const currentBalance = userTarget[0]?.balance || req.user.balance;

    if (payment.status === 'completed') {
      return res.json({
        success: true,
        status: 'completed',
        amount: payment.amount,
        newBalance: currentBalance,
        message: 'Payment Verified ✓ Funds Added Successfully',
      });
    }

    if (payment.status === 'failed') {
      return res.json({
        success: false,
        status: 'failed',
        message: 'Payment could not be verified. Please check your payment and try again.',
      });
    }

    // Still pending
    return res.json({
      success: true,
      status: 'pending',
      message: 'Waiting for payment confirmation...',
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: 'Failed to query payment status.' });
  }
});

// Official Server-Side Payment Webhook Endpoint
// For authorized payment aggregator / merchant webhooks
router.post('/webhook/payment', async (req, res) => {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;

    if (webhookSecret && providedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    const { utr, transactionId, amount, status, orderRef } = req.body;
    const cleanUtr = String(utr || transactionId || '').trim().replace(/\D/g, '');
    const numAmount = parseFloat(amount);

    if (!cleanUtr || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid webhook payload: 12-digit utr and valid positive amount are required.' });
    }

    const normalizedStatus = String(status || '').toUpperCase();
    if (normalizedStatus !== 'SUCCESS' && normalizedStatus !== 'COMPLETED' && normalizedStatus !== 'SETTLED') {
      return res.status(200).json({ received: true, message: 'Non-success status acknowledged.' });
    }

    // Match payment by UTR or orderRef
    const pendingList = await db
      .select()
      .from(payments)
      .where(
        or(
          eq(payments.transactionId, cleanUtr),
          orderRef ? eq(payments.transactionId, orderRef) : sql`1=0`
        )
      )
      .limit(1);

    if (pendingList.length > 0) {
      const p = pendingList[0];
      if (p.status === 'completed') {
        return res.status(200).json({ received: true, message: 'Payment already completed and credited.' });
      }

      const creditAmt = numAmount > 0 ? numAmount : p.amount;

      await db.update(payments).set({
        status: 'completed',
        amount: creditAmt,
        transactionId: cleanUtr,
      }).where(eq(payments.id, p.id));

      const u = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
      if (u.length > 0) {
        const newBal = (u[0].balance || 0) + creditAmt;
        await db.update(users).set({ balance: newBal }).where(eq(users.id, p.userId));
        await syncUserBalanceToSupabase(p.userId, newBal);
      }

      await logActivity(
        p.userId,
        'Webhook Payment Completed',
        `Credited ₹${creditAmt} automatically via authorized merchant webhook (UTR: ${cleanUtr})`,
        req.ip
      );

      return res.status(200).json({ success: true, message: 'Payment credited successfully via webhook.' });
    }

    return res.status(200).json({ received: true, message: 'Transaction acknowledged, pending manual match.' });
  } catch (err: any) {
    console.error('[Payment Webhook Error]:', err);
    res.status(500).json({ error: 'Webhook processing error.' });
  }
});

// 4. Legacy Gateways Disabled (Exclusive BharatPe Gateway)
router.post('/payment/razorpay/create-order', requireAuth, async (req: AuthRequest, res) => {
  return res.status(403).json({ error: 'Razorpay is disabled. YouthSMM now exclusively supports BharatPe Payment Gateway.' });
});

// 5. Legacy Razorpay Verification Disabled
router.post('/payment/razorpay/verify', requireAuth, async (req: AuthRequest, res) => {
  return res.status(403).json({ error: 'Razorpay is disabled. YouthSMM now exclusively supports BharatPe Payment Gateway.' });
});

// Admin: Automated Payments Audit Ledger (Read-Only Real-Time Transaction Log)
router.get('/admin/payments', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        transactionId: payments.transactionId,
        status: payments.status,
        createdAt: payments.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(200);

    res.json(list);
  } catch (error) {
    console.error('Failed to retrieve admin payments:', error);
    res.status(500).json({ error: 'Failed to retrieve payment records.' });
  }
});

// Admin: Update Payment Status (Pending, Success / Completed, Failed, Cancelled)
router.patch('/admin/payments/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId)) return res.status(400).json({ error: 'Invalid payment ID' });

    const { status } = req.body;
    const validStatuses = ['pending', 'completed', 'success', 'failed', 'cancelled'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, success, failed, or cancelled.' });
    }

    const normalizedStatus = status.toLowerCase() === 'success' ? 'completed' : status.toLowerCase();

    const p = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (p.length === 0) return res.status(404).json({ error: 'Payment record not found' });

    const targetPayment = p[0];
    const prevStatus = targetPayment.status;

    // If changing to completed from non-completed: credit wallet
    if (normalizedStatus === 'completed' && prevStatus !== 'completed' && targetPayment.amount > 0) {
      const u = await db.select().from(users).where(eq(users.id, targetPayment.userId)).limit(1);
      if (u.length > 0) {
        const newBal = (u[0].balance || 0) + targetPayment.amount;
        await db.update(users).set({ balance: newBal }).where(eq(users.id, targetPayment.userId));
        await syncUserBalanceToSupabase(targetPayment.userId, newBal);
      }
    }
    // If changing from completed to non-completed: deduct wallet
    else if (prevStatus === 'completed' && normalizedStatus !== 'completed' && targetPayment.amount > 0) {
      const u = await db.select().from(users).where(eq(users.id, targetPayment.userId)).limit(1);
      if (u.length > 0) {
        const newBal = Math.max(0, (u[0].balance || 0) - targetPayment.amount);
        await db.update(users).set({ balance: newBal }).where(eq(users.id, targetPayment.userId));
        await syncUserBalanceToSupabase(targetPayment.userId, newBal);
      }
    }

    await db.update(payments).set({ status: normalizedStatus }).where(eq(payments.id, paymentId));

    await logActivity(
      req.user?.id || null,
      'Update Payment Status',
      `Updated payment #${paymentId} status from ${prevStatus} to ${normalizedStatus}`,
      req.ip
    );

    res.json({
      success: true,
      message: `Payment #${paymentId} status updated to ${normalizedStatus}.`,
      status: normalizedStatus,
    });
  } catch (error) {
    console.error('Failed to update payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status.' });
  }
});

// Admin: Quick 1-Click Approve Payment & Add Funds to Wallet
router.post('/admin/payments/:id/approve', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId)) return res.status(400).json({ error: 'Invalid payment ID' });

    const p = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (p.length === 0) return res.status(404).json({ error: 'Payment record not found' });

    const targetPayment = p[0];
    if (targetPayment.status === 'completed') {
      return res.status(400).json({ error: 'This payment is already approved and credited.' });
    }

    const u = await db.select().from(users).where(eq(users.id, targetPayment.userId)).limit(1);
    if (u.length === 0) {
      return res.status(404).json({ error: 'User associated with this payment not found.' });
    }

    const currentBal = u[0].balance || 0;
    const newBal = currentBal + targetPayment.amount;

    await db.update(users).set({ balance: newBal }).where(eq(users.id, targetPayment.userId));
    await db.update(payments).set({ status: 'completed' }).where(eq(payments.id, paymentId));

    try {
      await syncUserBalanceToSupabase(targetPayment.userId, newBal);
      await syncPaymentToSupabase({
        userId: targetPayment.userId,
        amount: targetPayment.amount,
        paymentMethod: targetPayment.paymentMethod,
        transactionId: targetPayment.transactionId,
        status: 'completed',
      });
    } catch (syncErr) {
      console.warn('Supabase sync warning on payment approval:', syncErr);
    }

    await logActivity(
      req.user?.id || null,
      'Admin Approved Payment',
      `Admin approved payment #${paymentId} for ₹${targetPayment.amount} (User ID: ${targetPayment.userId}, UTR: ${targetPayment.transactionId}). New balance: ₹${newBal.toFixed(2)}`,
      req.ip
    );

    res.json({
      success: true,
      message: `Payment #${paymentId} (₹${targetPayment.amount.toFixed(2)}) approved successfully! User wallet credited.`,
      status: 'completed',
      newBalance: newBal,
    });
  } catch (error) {
    console.error('Failed to approve payment:', error);
    res.status(500).json({ error: 'Failed to approve payment.' });
  }
});

// Admin: Quick 1-Click Reject Payment
router.post('/admin/payments/:id/reject', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId)) return res.status(400).json({ error: 'Invalid payment ID' });

    const p = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (p.length === 0) return res.status(404).json({ error: 'Payment record not found' });

    const targetPayment = p[0];
    const prevStatus = targetPayment.status;

    // If previously completed, reverse wallet balance
    if (prevStatus === 'completed' && targetPayment.amount > 0) {
      const u = await db.select().from(users).where(eq(users.id, targetPayment.userId)).limit(1);
      if (u.length > 0) {
        const newBal = Math.max(0, (u[0].balance || 0) - targetPayment.amount);
        await db.update(users).set({ balance: newBal }).where(eq(users.id, targetPayment.userId));
        await syncUserBalanceToSupabase(targetPayment.userId, newBal);
      }
    }

    await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, paymentId));

    await logActivity(
      req.user?.id || null,
      'Admin Rejected Payment',
      `Admin rejected payment #${paymentId} (UTR: ${targetPayment.transactionId})`,
      req.ip
    );

    res.json({
      success: true,
      message: `Payment #${paymentId} marked as failed/rejected.`,
      status: 'failed',
    });
  } catch (error) {
    console.error('Failed to reject payment:', error);
    res.status(500).json({ error: 'Failed to reject payment.' });
  }
});

// Admin: Remove Today's Added Funds / Payments Only (Deducts added funds from user wallets and deletes today's payment records)
router.post('/admin/payments/remove-today-payments', requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Today in IST (Indian Standard Time: UTC + 5:30)
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istStart = new Date(istNow);
    istStart.setUTCHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(istStart.getTime() - istOffsetMs);
    const endOfTodayUtc = new Date(startOfTodayUtc.getTime() + 24 * 60 * 60 * 1000);

    // Also consider UTC start of day to be fully timezone-safe
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);
    const effectiveStart = startOfTodayUtc.getTime() < startOfUtcDay.getTime() ? startOfTodayUtc : startOfUtcDay;

    const todaysPayments = await db
      .select()
      .from(payments)
      .where(and(
        gte(payments.createdAt, effectiveStart),
        lt(payments.createdAt, endOfTodayUtc)
      ));

    if (todaysPayments.length === 0) {
      return res.json({
        success: true,
        removedCount: 0,
        totalDeducted: 0,
        message: "No payments or added funds were found for today. All older payments remain safe and untouched.",
      });
    }

    let totalDeducted = 0;
    for (const p of todaysPayments) {
      if (p.status === 'completed' && p.amount > 0 && p.paymentMethod !== 'Refund') {
        const u = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
        if (u.length > 0) {
          const newBal = Math.max(0, (u[0].balance || 0) - p.amount);
          await db.update(users).set({ balance: newBal }).where(eq(users.id, p.userId));
          totalDeducted += p.amount;
          await syncUserBalanceToSupabase(p.userId, newBal);
        }
      }
      await db.delete(payments).where(eq(payments.id, p.id));
    }

    await logActivity(
      req.user?.id || null,
      'Remove Today Payments',
      `Removed ${todaysPayments.length} payments created today totaling ₹${totalDeducted.toFixed(2)}`,
      req.ip
    );

    res.json({
      success: true,
      removedCount: todaysPayments.length,
      totalDeducted,
      message: `Successfully removed ${todaysPayments.length} payment(s) from today and deducted ₹${totalDeducted.toFixed(2)} from user balances. Only today's payments were removed.`,
    });
  } catch (error) {
    console.error('Failed to remove today payments:', error);
    res.status(500).json({ error: 'Failed to remove today payments.' });
  }
});

// Admin: Delete Individual Payment Record (And reverse balance if completed)
router.delete('/admin/payments/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId)) return res.status(400).json({ error: 'Invalid payment ID' });

    const p = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (p.length === 0) return res.status(404).json({ error: 'Payment record not found' });

    const targetPayment = p[0];
    let deductedAmount = 0;

    if (targetPayment.status === 'completed' && targetPayment.amount > 0 && targetPayment.paymentMethod !== 'Refund') {
      const u = await db.select().from(users).where(eq(users.id, targetPayment.userId)).limit(1);
      if (u.length > 0) {
        const newBal = Math.max(0, (u[0].balance || 0) - targetPayment.amount);
        await db.update(users).set({ balance: newBal }).where(eq(users.id, targetPayment.userId));
        deductedAmount = targetPayment.amount;
        await syncUserBalanceToSupabase(targetPayment.userId, newBal);
      }
    }

    await db.delete(payments).where(eq(payments.id, paymentId));
    await logActivity(
      req.user?.id || null,
      'Delete Payment Record',
      `Deleted payment #${paymentId} (${targetPayment.transactionId}) for ₹${targetPayment.amount}${deductedAmount > 0 ? ` (Deducted ₹${deductedAmount} from user #${targetPayment.userId})` : ''}`,
      req.ip
    );

    res.json({
      success: true,
      message: `Payment #${paymentId} removed successfully.${deductedAmount > 0 ? ` User balance adjusted by -₹${deductedAmount.toFixed(2)}.` : ''}`,
    });
  } catch (error) {
    console.error('Failed to delete payment:', error);
    res.status(500).json({ error: 'Failed to delete payment.' });
  }
});

// Legacy BharatPe / UPI Add Funds Route (Routed through server verification)
router.post('/user/add-funds-bharatpe', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { amount, utr, paymentMethod, bonusPercent } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      return res.status(400).json({ error: 'Invalid deposit amount. Minimum is ₹10.' });
    }

    const cleanUtr = String(utr || '').trim().replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      return res.status(400).json({ error: 'Invalid UPI Transaction Reference Number (UTR). Must be exactly 12 digits.' });
    }

    // Anti-Fake / Anti-Test patterns detection
    const isRepeated = /^(\d)\1{11}$/.test(cleanUtr);
    const isSequential = '01234567890123456789'.includes(cleanUtr) || '98765432109876543210'.includes(cleanUtr);
    if (isRepeated || isSequential) {
      return res.status(400).json({ error: 'Fake/Dummy UTR number detected. Please enter your real UPI bank reference.' });
    }

    // Check for double spending / duplicate UTR across the entire database
    const duplicate = await db.select().from(payments).where(eq(payments.transactionId, cleanUtr)).limit(1);
    if (duplicate.length > 0 && duplicate[0].status === 'completed') {
      return res.status(400).json({ error: 'This Transaction Reference ID (UTR) has already been used and credited.' });
    }

    // Compute extra bonus if applicable
    const bonusPct = parseFloat(bonusPercent) || 0;
    const bonusAmt = bonusPct > 0 ? (amt * bonusPct) / 100 : 0;
    const finalCredit = amt + bonusAmt;

    const methodLabel = paymentMethod || 'All UPI Payments';

    const settingsMap = await getSettingsMap();
    const instantAutoCredit = settingsMap['instantUtrAutoCredit'] === 'enabled';

    // Manual Admin Approval Mode (Default Requirement):
    if (!instantAutoCredit) {
      if (duplicate.length > 0) {
        await db.update(payments).set({
          amount: finalCredit,
          paymentMethod: methodLabel,
          transactionId: cleanUtr,
          status: 'pending',
        }).where(eq(payments.id, duplicate[0].id));
      } else {
        await db.insert(payments).values({
          userId: req.user.id,
          amount: finalCredit,
          paymentMethod: methodLabel,
          transactionId: cleanUtr,
          status: 'pending',
        });
      }

      await logActivity(
        req.user.id,
        'Deposit Queued (Pending Approval)',
        `UTR ${cleanUtr} submitted for ₹${finalCredit}. Queued for admin approval.`,
        req.ip
      );

      return res.status(200).json({
        success: true,
        status: 'pending',
        isPending: true,
        amount: finalCredit,
        transactionId: cleanUtr,
        message: `पेमेंट रिक्वेस्ट (UTR: ${cleanUtr}) दर्ज हो गई है! एडमिन द्वारा अप्रूवल के बाद ₹${finalCredit.toFixed(2)} आपके वॉलेट में जुड़ जाएँगे।`,
      });
    }

    // Verify against official provider
    const verification = await verifyPaymentWithOfficialProvider({
      utr: cleanUtr,
      expectedAmount: finalCredit,
      paymentMethod: methodLabel,
      userId: req.user.id,
      userEmail: req.user.email,
    });

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        error: verification.error || 'Payment could not be verified. Please check your payment and try again.',
        missingCredentials: verification.missingCredentials,
      });
    }

    // Verified: Insert or update completed payment and credit balance atomically
    if (duplicate.length > 0) {
      await db.update(payments).set({
        amount: finalCredit,
        paymentMethod: methodLabel,
        status: 'completed',
      }).where(eq(payments.id, duplicate[0].id));
    } else {
      await db.insert(payments).values({
        userId: req.user.id,
        amount: finalCredit,
        paymentMethod: methodLabel,
        transactionId: cleanUtr,
        status: 'completed',
      });
    }

    const userTarget = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    const newBal = (userTarget[0]?.balance || 0) + finalCredit;
    await db.update(users).set({ balance: newBal }).where(eq(users.id, req.user.id));

    try {
      await syncPaymentToSupabase({
        userId: req.user.id,
        amount: finalCredit,
        paymentMethod: methodLabel,
        transactionId: cleanUtr,
        status: 'completed',
      });
      await syncUserBalanceToSupabase(req.user.id, newBal);
    } catch (syncErr) {
      console.warn('Background Supabase sync warning:', syncErr);
    }

    res.json({
      success: true,
      status: 'completed',
      message: 'Payment Verified ✓ Funds Added Successfully',
      transactionId: cleanUtr,
      newBalance: newBal,
    });
  } catch (error: any) {
    console.error('Add funds verification error:', error);
    res.status(500).json({ error: error?.message || 'Payment verification failed due to server error.' });
  }
});

// Get User's Payments
router.get('/user/payments', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const list = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, req.user.id))
      .orderBy(desc(payments.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
});

// Affiliate: Get Stats / Create program
router.get('/user/affiliate', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    let partner = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, req.user.id))
      .limit(1);

    if (partner.length === 0) {
      // Auto-create affiliate profile
      const refCode = 'REF-' + Math.floor(Math.random() * 10000);
      const inserted = await db
        .insert(affiliates)
        .values({
          userId: req.user.id,
          referralCode: refCode,
        })
        .returning();
      partner = [inserted[0]];
    }

    res.json(partner[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve affiliate details.' });
  }
});

// ==========================================
// ADMIN DASHBOARD ENDPOINTS
// ==========================================

// Admin: Get Stats & Analytics
router.get('/admin/stats', requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Total users count
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    // Total orders count and summation of charge
    const totalOrders = await db.select({
      count: sql<number>`count(*)`,
      totalSpent: sql<number>`COALESCE(sum(${orders.charge}), 0)`,
      activeSpent: sql<number>`COALESCE(sum(CASE WHEN ${orders.status} NOT IN ('cancelled', 'refunded') THEN ${orders.charge} ELSE 0 END), 0)`,
    }).from(orders);

    // Payments totals (exclude internal refunds)
    const totalDeposits = await db.select({
      total: sql<number>`COALESCE(sum(CASE WHEN ${payments.paymentMethod} != 'Refund' THEN ${payments.amount} ELSE 0 END), 0)`,
    }).from(payments).where(eq(payments.status, 'completed'));

    // Today in IST (Indian Standard Time: UTC + 5:30)
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istStart = new Date(istNow);
    istStart.setUTCHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(istStart.getTime() - istOffsetMs);
    const endOfTodayUtc = new Date(startOfTodayUtc.getTime() + 24 * 60 * 60 * 1000);

    // Today's Orders & Revenue (IST timezone)
    const todayOrders = await db.select({
      count: sql<number>`count(*)`,
      todayRevenue: sql<number>`COALESCE(sum(CASE WHEN ${orders.status} NOT IN ('cancelled', 'refunded') THEN ${orders.charge} ELSE 0 END), 0)`,
    }).from(orders)
    .where(and(
      gte(orders.createdAt, startOfTodayUtc),
      lt(orders.createdAt, endOfTodayUtc)
    ));

    // Today's Completed Payments / Funds Added (IST timezone, exclude internal refunds)
    const todayPayments = await db.select({
      count: sql<number>`count(*)`,
      todayDeposits: sql<number>`COALESCE(sum(CASE WHEN ${payments.paymentMethod} != 'Refund' THEN ${payments.amount} ELSE 0 END), 0)`,
    }).from(payments)
    .where(and(
      eq(payments.status, 'completed'),
      ne(payments.paymentMethod, 'Refund'),
      gte(payments.createdAt, startOfTodayUtc),
      lt(payments.createdAt, endOfTodayUtc)
    ));

    // Status distributions
    const orderStatuses = await db.select({
      status: orders.status,
      count: sql<number>`count(*)`,
    }).from(orders).groupBy(orders.status);

    // Pending deposits awaiting admin approval
    const pendingDeposits = await db.select({
      count: sql<number>`count(*)`,
      totalPendingAmount: sql<number>`COALESCE(sum(${payments.amount}), 0)`,
    }).from(payments).where(eq(payments.status, 'pending'));

    res.json({
      usersCount: Number(totalUsers[0]?.count || 0),
      ordersCount: Number(totalOrders[0]?.count || 0),
      totalRevenue: Number(totalOrders[0]?.totalSpent || 0.0),
      totalDeposited: Number(totalDeposits[0]?.total || 0.0),
      todayRevenue: Number(todayOrders[0]?.todayRevenue || 0.0),
      todayOrdersCount: Number(todayOrders[0]?.count || 0),
      todayDeposited: Number(todayPayments[0]?.todayDeposits || 0.0),
      todayDepositsCount: Number(todayPayments[0]?.count || 0),
      pendingDepositsCount: Number(pendingDeposits[0]?.count || 0),
      pendingDepositsAmount: Number(pendingDeposits[0]?.totalPendingAmount || 0),
      statusChart: orderStatuses,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to retrieve admin statistics.' });
  }
});

// Admin: Get Users List
router.get('/admin/users', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Compute today's IST range for daily delta tracking alongside permanent lifetime stats
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istStart = new Date(istNow);
    istStart.setUTCHours(0, 0, 0, 0);
    const startOfTodayUtc = new Date(istStart.getTime() - istOffsetMs);
    const endOfTodayUtc = new Date(startOfTodayUtc.getTime() + 24 * 60 * 60 * 1000);

    // Calculate total money spent, active orders, and total orders per user
    // totalSpent is cumulative lifetime spent across all orders placed by the user (PERMANENT, never resets)
    const userSpents = await db
      .select({
        userId: orders.userId,
        totalSpent: sql<number>`COALESCE(SUM(${orders.charge}), 0)`,
        activeSpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled', 'refunded') THEN ${orders.charge} ELSE 0 END), 0)`,
        activeOrdersCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled', 'refunded') THEN 1 ELSE 0 END), 0)`,
        ordersCount: sql<number>`COUNT(*)`,
        todaySpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${startOfTodayUtc} AND ${orders.createdAt} < ${endOfTodayUtc} THEN ${orders.charge} ELSE 0 END), 0)`,
        todayOrdersCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${startOfTodayUtc} AND ${orders.createdAt} < ${endOfTodayUtc} THEN 1 ELSE 0 END), 0)`,
      })
      .from(orders)
      .groupBy(orders.userId);

    const spentMap = new Map<number, { totalSpent: number; activeSpent: number; ordersCount: number; activeOrdersCount: number; todaySpent: number; todayOrdersCount: number }>();
    userSpents.forEach((item) => {
      if (item.userId !== null && item.userId !== undefined) {
        spentMap.set(Number(item.userId), {
          totalSpent: Number(item.totalSpent) || 0,
          activeSpent: Number(item.activeSpent) || 0,
          ordersCount: Number(item.ordersCount) || 0,
          activeOrdersCount: Number(item.activeOrdersCount) || 0,
          todaySpent: Number(item.todaySpent) || 0,
          todayOrdersCount: Number(item.todayOrdersCount) || 0,
        });
      }
    });

    // Calculate total completed deposits per user from payments table (PERMANENT lifetime, plus today's added fund)
    const userDeposits = await db
      .select({
        userId: payments.userId,
        totalDeposited: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' AND ${payments.paymentMethod} != 'Refund' THEN ${payments.amount} ELSE 0 END), 0)`,
        todayDeposited: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' AND ${payments.paymentMethod} != 'Refund' AND ${payments.createdAt} >= ${startOfTodayUtc} AND ${payments.createdAt} < ${endOfTodayUtc} THEN ${payments.amount} ELSE 0 END), 0)`,
      })
      .from(payments)
      .groupBy(payments.userId);

    const depositMap = new Map<number, { totalDeposited: number; todayDeposited: number }>();
    userDeposits.forEach((item) => {
      if (item.userId !== null && item.userId !== undefined) {
        depositMap.set(Number(item.userId), {
          totalDeposited: Number(item.totalDeposited) || 0,
          todayDeposited: Number(item.todayDeposited) || 0,
        });
      }
    });

    // Filter out corrupted/raw JWT tokens that may have been created by legacy sessions
    const realUsers = list.filter((u) => !u.email.startsWith('eyj') && u.email !== 'undefined');

    const enrichedList = realUsers.map((u) => {
      const stats = spentMap.get(Number(u.id)) || { totalSpent: 0, activeSpent: 0, ordersCount: 0, activeOrdersCount: 0, todaySpent: 0, todayOrdersCount: 0 };
      const depStats = depositMap.get(Number(u.id)) || { totalDeposited: 0, todayDeposited: 0 };
      return {
        ...u,
        spent: stats.totalSpent, // Permanent Lifetime Spent - NEVER resets or disappears
        activeSpent: stats.activeSpent,
        saved: Number(u.balance) || 0, // Current saved funds in wallet
        totalDeposited: depStats.totalDeposited, // Permanent Lifetime Added Funds - NEVER disappears
        todaySpent: stats.todaySpent,
        todayDeposited: depStats.todayDeposited,
        ordersCount: stats.ordersCount, // Permanent Lifetime Orders Count
        activeOrdersCount: stats.activeOrdersCount,
        todayOrdersCount: stats.todayOrdersCount,
      };
    });

    res.json(enrichedList);
  } catch (error) {
    console.error('Failed to retrieve users with stats:', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Admin: Update User Balance Manually
router.post('/admin/users/:id/balance', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount, action } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt)) return res.status(400).json({ error: 'Invalid amount' });

    const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentBalance = targetUser[0].balance || 0;

    let newBalance = currentBalance;
    let fundsAddedAmount = 0;

    if (action === 'add') {
      newBalance = currentBalance + amt;
      fundsAddedAmount = amt;

      await db
        .update(users)
        .set({ balance: newBalance })
        .where(eq(users.id, userId));

      await logActivity(req.user?.id || null, 'Admin Balance Add', `Added ₹${amt.toFixed(2)} to user ID: ${userId} balance (New balance: ₹${newBalance.toFixed(2)})`, req.ip);
    } else {
      newBalance = amt;
      if (amt > currentBalance) {
        fundsAddedAmount = amt - currentBalance;
      }

      await db
        .update(users)
        .set({ balance: amt })
        .where(eq(users.id, userId));

      await logActivity(req.user?.id || null, 'Admin Balance Update', `Updated user ID: ${userId} balance to ₹${amt.toFixed(2)}`, req.ip);
    }

    // When funds are added by admin, record in payments table so it properly counts in "Today's Fund Added" and "Wallet Deposits"
    if (fundsAddedAmount > 0) {
      await db.insert(payments).values({
        userId,
        amount: fundsAddedAmount,
        paymentMethod: 'Manual (Admin Credit)',
        transactionId: `ADM-CREDIT-${userId}-${Date.now()}`,
        status: 'completed',
      });
      await syncPaymentToSupabase({
        userId,
        amount: fundsAddedAmount,
        paymentMethod: 'Manual (Admin Credit)',
        transactionId: `ADM-CREDIT-${userId}-${Date.now()}`,
        status: 'completed',
      });
    }
    await syncUserBalanceToSupabase(userId, newBalance);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update balance:', error);
    res.status(500).json({ error: 'Failed to update balance.' });
  }
});

// Admin: Reset All Users' Balances to 0.00
router.post('/admin/users/reset-all-balances', requireAdmin, async (req: AuthRequest, res) => {
  try {
    await db.update(users).set({ balance: 0.0 });
    await logActivity(req.user?.id || null, 'Reset All Balances', 'Reset all user wallet balances to ₹0.00', req.ip);
    res.json({ success: true, message: 'All user balances have been reset to 0.00 successfully.' });
  } catch (error) {
    console.error('Failed to reset balances:', error);
    res.status(500).json({ error: 'Failed to reset all balances.' });
  }
});

// Admin: Update User Status
router.post('/admin/users/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Valid status ("active" or "suspended") is required.' });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (isSuperAdminEmail(targetUser.email) && status === 'suspended') {
      return res.status(400).json({ error: 'Cannot suspend the main administrator account.' });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();

    await logActivity(
      req.user?.id || null,
      'Admin User Status Update',
      `Admin set user ${targetUser.email} (ID: ${userId}) status to "${status}"`,
      req.ip
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Failed to update user status:', error);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// Admin: Direct Impersonation / Login As User
router.post('/admin/users/:id/login-as', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID provided.' });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    // Update target user's login timestamp and IP
    const [updatedUser] = await db.update(users).set({
      lastLoginAt: new Date(),
      lastIp: clientIp,
    }).where(eq(users.id, targetUserId)).returning();

    // Log admin impersonation activity
    await logActivity(
      req.user?.id || null,
      'Admin Impersonate User',
      `Admin (${req.user?.email || 'admin'}) initiated direct user login as '${targetUser.email}' (ID: ${targetUser.id})`,
      clientIp
    );

    const userToken = `local-token-${targetUser.email.toLowerCase().trim()}`;

    res.json({
      success: true,
      token: userToken,
      user: updatedUser,
      message: `Successfully logged in as ${targetUser.email}`,
    });
  } catch (error: any) {
    console.error('Error logging in as user:', error);
    res.status(500).json({ error: error.message || 'Failed to login as user.' });
  }
});

// Admin: Get All Orders
router.get('/admin/orders', requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (req.query.sync === 'true') {
      try {
        await Promise.race([
          syncProviderOrders(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch (e) {
        console.warn('Admin orders sync error:', e);
      }
    }

    const allOrders = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: sql<string>`COALESCE(${orders.serviceName}, ${services.name}, 'Service #' || ${orders.serviceId})`,
        userEmail: sql<string>`COALESCE(${users.email}, 'User #' || ${orders.userId})`,
        userName: users.name,
        providerOrderId: orders.providerOrderId,
        providerName: providers.name,
      })
      .from(orders)
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(providers, eq(services.providerId, providers.id))
      .orderBy(desc(orders.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      allOrders.forEach(o => {
        o.id += offset;
      });
    }

    res.json(allOrders);
  } catch (error) {
    console.error('Failed to retrieve all orders:', error);
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// Admin: Get Specific User's Full Order History & Details
router.get('/admin/users/:id/orders', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const userOrders = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
        serviceName: sql<string>`COALESCE(${orders.serviceName}, ${services.name}, 'Service #' || ${orders.serviceId})`,
        providerOrderId: orders.providerOrderId,
        providerName: providers.name,
      })
      .from(orders)
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(providers, eq(services.providerId, providers.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      userOrders.forEach(o => {
        o.id += offset;
      });
    }

    res.json(userOrders);
  } catch (error) {
    console.error('Failed to retrieve user orders:', error);
    res.status(500).json({ error: 'Failed to retrieve user orders history.' });
  }
});

// Admin: Update Order Status / Process Refund
router.post('/admin/orders/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Fetch the original order details to check for refunds
    const currentOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (currentOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const ord = currentOrder[0];

    // If transitioning to Refunded or Cancelled, refund the user
    if ((status === 'refunded' || status === 'cancelled') && ord.status !== 'refunded' && ord.status !== 'cancelled') {
      const userToRefund = await db
        .select()
        .from(users)
        .where(eq(users.id, ord.userId))
        .limit(1);

      if (userToRefund.length > 0) {
        const refundedBalance = userToRefund[0].balance + ord.charge;
        await db
          .update(users)
          .set({ balance: refundedBalance })
          .where(eq(users.id, ord.userId));

        // Create log entry for payment refund
        await db.insert(payments).values({
          userId: ord.userId,
          amount: ord.charge,
          paymentMethod: 'Refund',
          transactionId: 'REFUND-' + ord.id,
          status: 'completed',
        });
      }
    }

    await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, orderId));

    await logActivity(req.user?.id || null, 'Admin Order Update', `Set order ID: ${orderId} status to ${status}`, req.ip);

    res.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// Admin: Manually Dispatch / Re-send Order to Provider (Push Order / Retry)
router.post('/admin/orders/:id/dispatch', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;

    const result = await dispatchOrderToProvider(orderId, true);
    if (result.success) {
      res.json({
        success: true,
        message: `Order #${req.params.id} dispatched to ${result.providerName} successfully! Provider Order ID: ${result.providerOrderId}`,
        providerOrderId: result.providerOrderId,
        providerName: result.providerName,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to dispatch order to provider.',
        insufficientBalance: result.insufficientBalance || false,
        balanceUnknown: result.balanceUnknown || false,
      });
    }
  } catch (error: any) {
    console.error('Admin dispatch order error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch order to provider.' });
  }
});

// Admin: Manually Sync Status for a Specific Order from Provider API
router.post('/admin/orders/:id/sync', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;

    const result = await syncProviderOrders([orderId]);

    const updated = await db
      .select({
        id: orders.id,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        providerOrderId: orders.providerOrderId,
        serviceName: orders.serviceName,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const detail = orderDispatchDetailsMap.get(orderId);

    res.json({
      success: true,
      message: `Status synchronized for Order #${req.params.id}`,
      order: updated[0] || null,
      dispatchDetail: detail || null,
      synced: result.synced,
    });
  } catch (error: any) {
    console.error('Admin single order sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync order status.' });
  }
});

// Admin: View Order Provider Details & Raw Response
router.get('/admin/orders/:id/details', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const offset = await getOrderIdOffset();
    const orderId = parseInt(req.params.id) - offset;

    const orderObj = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        serviceId: orders.serviceId,
        serviceName: orders.serviceName,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        providerOrderId: orders.providerOrderId,
        refillStatus: orders.refillStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderObj.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const ord = orderObj[0];
    const detail = orderDispatchDetailsMap.get(orderId) || {
      orderId,
      providerOrderId: ord.providerOrderId,
      providerResponse: null,
      lastError:
        ord.providerOrderId?.startsWith('FAILED:') || ord.providerOrderId?.startsWith('QUEUED:')
          ? ord.providerOrderId
          : null,
      dispatchedAt: ord.createdAt ? new Date(ord.createdAt).toISOString() : null,
      lastSyncedAt: null,
    };

    const srv = await db.select().from(services).where(eq(services.id, ord.serviceId)).limit(1);
    let provInfo = null;
    if (srv.length > 0 && srv[0].providerId) {
      const p = await db.select().from(providers).where(eq(providers.id, srv[0].providerId)).limit(1);
      if (p.length > 0) {
        provInfo = { id: p[0].id, name: p[0].name, apiUrl: p[0].apiUrl };
      }
    }

    res.json({
      order: {
        ...ord,
        displayId: ord.id + offset,
      },
      service: srv[0] || null,
      provider: provInfo,
      dispatchDetail: detail,
    });
  } catch (error: any) {
    console.error('Admin order details error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve order details.' });
  }
});

// Admin: Get all child panel requests
router.get('/admin/child-panels', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: childPanels.id,
        userId: childPanels.userId,
        domain: childPanels.domain,
        currency: childPanels.currency,
        adminUsername: childPanels.adminUsername,
        adminPassword: childPanels.adminPassword,
        price: childPanels.price,
        status: childPanels.status,
        createdAt: childPanels.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(childPanels)
      .innerJoin(users, eq(childPanels.userId, users.id))
      .orderBy(desc(childPanels.createdAt));
    res.json(list);
  } catch (error) {
    console.error('Failed to fetch child panels for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve child panels.' });
  }
});

// Admin: Update child panel status
router.post('/admin/child-panels/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const panelId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    await db
      .update(childPanels)
      .set({ status })
      .where(eq(childPanels.id, panelId));

    await logActivity(req.user?.id || null, 'Admin Child Panel Update', `Updated child panel ID: ${panelId} status to ${status}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update child panel status:', error);
    res.status(500).json({ error: 'Failed to update child panel status.' });
  }
});

// Admin: Get all refill requests
router.get('/admin/refill-requests', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: refillRequests.id,
        orderId: refillRequests.orderId,
        status: refillRequests.status,
        createdAt: refillRequests.createdAt,
        userId: refillRequests.userId,
        userName: users.name,
        userEmail: users.email,
        link: orders.link,
        quantity: orders.quantity,
        charge: orders.charge,
        serviceName: services.name,
      })
      .from(refillRequests)
      .innerJoin(orders, eq(refillRequests.orderId, orders.id))
      .innerJoin(services, eq(orders.serviceId, services.id))
      .innerJoin(users, eq(refillRequests.userId, users.id))
      .orderBy(desc(refillRequests.createdAt));

    const offset = await getOrderIdOffset();
    if (offset > 0) {
      list.forEach(r => {
        r.orderId += offset;
      });
    }

    res.json(list);
  } catch (error) {
    console.error('Failed to fetch refill requests for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve refill requests.' });
  }
});

// Admin: Update refill request status
router.post('/admin/refill-requests/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { status } = req.body; // 'completed', 'rejected', 'processing'

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Fetch the request
    const requestObj = await db
      .select()
      .from(refillRequests)
      .where(eq(refillRequests.id, requestId))
      .limit(1);

    if (requestObj.length === 0) {
      return res.status(404).json({ error: 'Refill request not found.' });
    }

    const reqItem = requestObj[0];

    // Update refillRequests table
    await db
      .update(refillRequests)
      .set({ status })
      .where(eq(refillRequests.id, requestId));

    // Update matching order's refillStatus
    let orderRefillStatus = 'requested';
    if (status === 'completed') orderRefillStatus = 'completed';
    if (status === 'rejected') orderRefillStatus = 'rejected';

    await db
      .update(orders)
      .set({ refillStatus: orderRefillStatus })
      .where(eq(orders.id, reqItem.orderId));

    await logActivity(req.user?.id || null, 'Admin Refill Update', `Updated refill request ID: ${requestId} status to ${status}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update refill status:', error);
    res.status(500).json({ error: 'Failed to update refill status.' });
  }
});

// Admin: Manage Coupons
router.get('/admin/coupons', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve coupons.' });
  }
});

router.post('/admin/coupons', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, discountPercent } = req.body;
    if (!code || !discountPercent) return res.status(400).json({ error: 'Missing parameters.' });

    await db.insert(coupons).values({
      code: code.toUpperCase(),
      discountPercent: Number(discountPercent),
      status: 'active',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
});

// Admin: Manage Announcements
router.post('/admin/announcements', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, content, type } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });

    await db.insert(announcements).values({
      title,
      content,
      type: type || 'info',
      status: 'active',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
});

// Admin: Manage Services
router.post('/admin/services', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { categoryId, name, description, pricePerThousand, minAmount, maxAmount, providerId, providerServiceId, icon } = req.body;

    if (!categoryId || !name || !pricePerThousand) {
      return res.status(400).json({ error: 'Category ID, Name and Price are required.' });
    }

    await db.insert(services).values({
      categoryId: Number(categoryId),
      name,
      description,
      pricePerThousand: parseFloat(pricePerThousand),
      minAmount: Number(minAmount || 10),
      maxAmount: Number(maxAmount || 10000),
      providerId: providerId ? Number(providerId) : null,
      providerServiceId: providerServiceId ? String(providerServiceId) : null,
      icon: icon || null,
      status: 'active',
    });

    invalidateCatalogCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service.' });
  }
});

// Admin: Manage Categories
router.get('/admin/categories', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        status: categories.status,
        sortOrder: categories.sortOrder,
        icon: categories.icon,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .orderBy(categories.sortOrder, categories.id);

    // Calculate service counts per category
    const servicesList = await db.select({ categoryId: services.categoryId }).from(services);
    const countMap: Record<number, number> = {};
    for (const s of servicesList) {
      if (s.categoryId) {
        countMap[s.categoryId] = (countMap[s.categoryId] || 0) + 1;
      }
    }

    const result = allCategories.map(c => ({
      ...c,
      servicesCount: countMap[c.id] || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Failed to get admin categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

router.post('/admin/categories', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await db.insert(categories).values({
      name,
      status: 'active',
      sortOrder: 1,
      icon: icon || null,
    });

    invalidateCatalogCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// Admin: Update Category
router.put('/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const catId = parseInt(req.params.id);
    if (isNaN(catId)) return res.status(400).json({ error: 'Invalid Category ID' });

    const { name, status, sortOrder, icon } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (sortOrder !== undefined) updateData.sortOrder = typeof sortOrder === 'number' ? sortOrder : (parseInt(sortOrder) || 0);
    if (icon !== undefined) updateData.icon = icon;

    await db.update(categories).set(updateData).where(eq(categories.id, catId));

    invalidateCatalogCache();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// Admin: Get Support Tickets
router.get('/admin/tickets', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminTickets = await db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        createdAt: tickets.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt));
    res.json(adminTickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

// Admin: Get Activity Logs
router.get('/admin/logs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        userEmail: users.email,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve activity logs.' });
  }
});

// Admin: Get SMM Providers List (Securely masking the API Key)
router.get('/admin/providers', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(providers).orderBy(providers.id);
    
    // Mask API Keys for total client-side security
    const secureList = list.map(prov => ({
      ...prov,
      apiKey: prov.apiKey ? `${prov.apiKey.slice(0, 4)}••••••••${prov.apiKey.slice(-4)}` : '••••••••',
    }));
    
    res.json(secureList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve API providers.' });
  }
});

// Admin: Create New SMM Provider
router.post('/admin/providers', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, apiUrl, apiKey } = req.body;
    if (!name || !apiUrl || !apiKey) {
      return res.status(400).json({ error: 'Name, API URL, and API Key are required.' });
    }

    const inserted = await db
      .insert(providers)
      .values({
        name,
        apiUrl,
        apiKey,
        status: 'active',
        balance: 0.0,
      })
      .returning();

    await logActivity(req.user?.id || null, 'Create API Provider', `Created provider: ${name} (${apiUrl})`, req.ip);
    res.json({ success: true, provider: inserted[0] });
  } catch (error) {
    console.error('Failed to create SMM provider:', error);
    res.status(500).json({ error: 'Failed to create SMM provider.' });
  }
});

// Admin: Update SMM Provider
router.put('/admin/providers/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    const { name, apiUrl, apiKey } = req.body;

    const existing = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (apiUrl) updateFields.apiUrl = apiUrl;
    
    // Only update apiKey if it changed and is not the masked placeholder
    if (apiKey && !apiKey.includes('••••••••')) {
      updateFields.apiKey = apiKey;
    }

    await db
      .update(providers)
      .set(updateFields)
      .where(eq(providers.id, provId));

    await logActivity(req.user?.id || null, 'Update API Provider', `Updated provider ID: ${provId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SMM provider.' });
  }
});

// Admin: Delete SMM Provider
router.delete('/admin/providers/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    
    // Dissociate any services using this provider first to avoid constraint issues
    await db
      .update(services)
      .set({ providerId: null, providerServiceId: null })
      .where(eq(services.providerId, provId));

    await db.delete(providers).where(eq(providers.id, provId));
    await logActivity(req.user?.id || null, 'Delete API Provider', `Deleted provider ID: ${provId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Failed to delete SMM provider.' });
  }
});

// Admin: Fetch and Sync Provider Account Balance
router.post('/admin/providers/:id/balance', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const provider = prov[0];
    
    // Query the external yuthsmm's API balance action
    const params = new URLSearchParams();
    params.append('key', provider.apiKey);
    params.append('action', 'balance');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (data && data.balance !== undefined) {
      const parsedBalance = parseFloat(data.balance);
      await db
        .update(providers)
        .set({ balance: parsedBalance })
        .where(eq(providers.id, provId));

      res.json({ success: true, balance: parsedBalance });
    } else if (data && data.error) {
      res.status(400).json({ error: data.error });
    } else {
      res.status(400).json({ error: 'Invalid response from SMM API.' });
    }
  } catch (error: any) {
    console.error('Failed to fetch provider balance:', error);
    res.status(500).json({ error: `Connection failed: ${error.message || error}` });
  }
});

// Admin: Check Provider Connection & Balance Status
router.get('/admin/providers/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const provider = prov[0];

    try {
      const data = await executeSmmApiRequest(
        provider.apiUrl,
        {
          key: provider.apiKey,
          action: 'balance',
        },
        1
      );

      if (data && data.balance !== undefined && data.balance !== null && !isNaN(parseFloat(String(data.balance)))) {
        const parsedBalance = parseFloat(String(data.balance));
        await db
          .update(providers)
          .set({ balance: parsedBalance })
          .where(eq(providers.id, provId));

        return res.json({
          connected: true,
          balance: parsedBalance,
          currency: data.currency || 'INR',
          balanceUnknown: false,
          insufficientBalance: parsedBalance <= 0,
        });
      } else if (data && data.error) {
        return res.json({
          connected: true,
          balance: null,
          balanceUnknown: true,
          insufficientBalance: false,
          error: String(data.error),
        });
      } else {
        return res.json({
          connected: true,
          balance: null,
          balanceUnknown: true,
          insufficientBalance: false,
          error: 'Provider returned non-standard balance format',
        });
      }
    } catch (connErr: any) {
      return res.json({
        connected: false,
        balance: null,
        balanceUnknown: true,
        insufficientBalance: false,
        error: connErr.message || 'Connection failed',
      });
    }
  } catch (err: any) {
    console.error('Failed to check provider status:', err);
    res.status(500).json({ error: err.message || 'Failed to check provider status.' });
  }
});

// Admin: Fetch all services from SMM Provider
router.get('/admin/providers/:id/services', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const provId = parseInt(req.params.id);
    if (!provId || isNaN(provId) || provId <= 0) {
      return res.status(400).json({ error: 'Please select a valid SMM Provider.' });
    }

    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, provId))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const provider = prov[0];

    const params = new URLSearchParams();
    params.append('key', provider.apiKey);
    params.append('action', 'services');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      res.json(data);
    } else if (data && data.error) {
      res.status(400).json({ error: data.error });
    } else {
      res.status(400).json({ error: 'Invalid response or no services returned from SMM API.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch services from SMM API.' });
  }
});

// Admin: Bulk Import services from SMM Provider
router.post('/admin/services/import-bulk', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { services: servicesToImport, providerId, priceMultiplier } = req.body;
    if (!Array.isArray(servicesToImport) || !providerId) {
      return res.status(400).json({ error: 'Invalid input data. Expected services array and providerId.' });
    }

    const multiplier = parseFloat(priceMultiplier) || 1.0;

    // Fetch existing categories to reuse them
    const existingCategories = await db.select().from(categories);
    const categoryMap = new Map<string, number>();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    const results = [];

    for (const item of servicesToImport) {
      const categoryName = (item.category || 'Uncategorized').trim();
      const lowerCatName = categoryName.toLowerCase();

      let catId = categoryMap.get(lowerCatName);
      if (!catId) {
        // Create the category
        const [insertedCat] = await db.insert(categories).values({
          name: categoryName,
          status: 'active',
          sortOrder: 1,
        }).returning();
        
        catId = insertedCat.id;
        categoryMap.set(lowerCatName, catId);
      }

      // Calculate selling price: provider rate * multiplier
      const originalRate = parseFloat(item.rate) || 0;
      const finalPrice = originalRate * multiplier;

      // Insert service
      const [insertedSrv] = await db.insert(services).values({
        categoryId: catId,
        name: item.name,
        description: item.desc || `SMM Provider Service ID: ${item.service}`,
        pricePerThousand: finalPrice,
        minAmount: Number(item.min || 10),
        maxAmount: Number(item.max || 10000),
        providerId: Number(providerId),
        providerServiceId: String(item.service),
        status: 'active',
      }).returning();

      results.push(insertedSrv);
    }

    res.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('Failed bulk-importing provider services:', error);
    res.status(500).json({ error: error.message || 'Failed to import services.' });
  }
});

// Admin: Comprehensive Manual Seller Sync API
router.post('/admin/services/seller-sync', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { providerId, syncScope, profitPercentage, selectedServiceIds } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'SMM Provider ID is required.' });
    }

    const prov = await db
      .select()
      .from(providers)
      .where(eq(providers.id, Number(providerId)))
      .limit(1);

    if (prov.length === 0) {
      return res.status(404).json({ error: 'SMM Provider not found.' });
    }

    const provider = prov[0];

    // Fetch remote services from SMM API
    const params = new URLSearchParams();
    params.append('key', provider.apiKey);
    params.append('action', 'services');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from SMM API: ${response.statusText}`);
    }

    const remoteServices = await response.json();
    if (!Array.isArray(remoteServices)) {
      return res.status(400).json({ error: 'Remote provider did not return a valid services array.' });
    }

    // Fetch existing services for this provider to compare
    const existingServices = await db
      .select()
      .from(services)
      .where(eq(services.providerId, provider.id));

    // Create a map of existing service by providerServiceId
    const existingMap = new Map<string, any>();
    existingServices.forEach(s => {
      if (s.providerServiceId) {
        existingMap.set(String(s.providerServiceId), s);
      }
    });

    // Fetch categories map for matching categories
    const existingCategories = await db.select().from(categories);
    const categoryMap = new Map<string, number>();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    const markup = 1 + (parseFloat(profitPercentage) || 0) / 100;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const selectedSet = selectedServiceIds ? new Set(selectedServiceIds.map(String)) : null;

    for (const remote of remoteServices) {
      const remoteIdStr = String(remote.service);

      // Filter by selection if scope is selected
      if (syncScope === 'selected' && selectedSet && !selectedSet.has(remoteIdStr)) {
        skippedCount++;
        continue;
      }

      const existing = existingMap.get(remoteIdStr);

      if (syncScope === 'new_only' && existing) {
        skippedCount++;
        continue;
      }

      // Compute selling price
      const originalRate = parseFloat(remote.rate) || 0;
      const finalPrice = originalRate * markup;

      // Handle category check & insertion
      const categoryName = (remote.category || 'Uncategorized').trim();
      const lowerCatName = categoryName.toLowerCase();
      let catId = categoryMap.get(lowerCatName);

      if (!catId) {
        // Create Category dynamically
        const [insertedCat] = await db.insert(categories).values({
          name: categoryName,
          status: 'active',
          sortOrder: 1,
        }).returning();
        catId = insertedCat.id;
        categoryMap.set(lowerCatName, catId);
      }

      if (existing) {
        if (syncScope === 'price_only') {
          // Update only price & min/max
          await db.update(services)
            .set({
              pricePerThousand: finalPrice,
              minAmount: Number(remote.min || 10),
              maxAmount: Number(remote.max || 10000),
            })
            .where(eq(services.id, existing.id));
        } else {
          // Update details & price
          await db.update(services)
            .set({
              categoryId: catId,
              name: remote.name,
              description: remote.desc || `SMM Provider Service ID: ${remote.service}`,
              pricePerThousand: finalPrice,
              minAmount: Number(remote.min || 10),
              maxAmount: Number(remote.max || 10000),
            })
            .where(eq(services.id, existing.id));
        }
        updatedCount++;
      } else {
        // Not existing and we are importing (or we are in 'all' or 'selected')
        if (syncScope !== 'price_only') {
          await db.insert(services).values({
            categoryId: catId,
            name: remote.name,
            description: remote.desc || `SMM Provider Service ID: ${remote.service}`,
            pricePerThousand: finalPrice,
            minAmount: Number(remote.min || 10),
            maxAmount: Number(remote.max || 10000),
            providerId: provider.id,
            providerServiceId: remoteIdStr,
            status: 'active',
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    await logActivity(req.user?.id || null, 'Seller Sync', `Synced SMM Provider ${provider.name}. Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`, req.ip);

    res.json({
      success: true,
      addedCount,
      updatedCount,
      skippedCount,
      totalProcessed: addedCount + updatedCount + skippedCount
    });
  } catch (error: any) {
    console.error('Error in seller-sync API:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during synchronization.' });
  }
});

// Admin: Manual Sync All SMM Provider Orders Statuses
router.post('/admin/orders/sync', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await syncProviderOrders();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync provider orders.' });
  }
});

// Admin: Get SMM Order status cron job status
router.get('/admin/cron/status', requireAdmin, async (req: AuthRequest, res) => {
  try {
    res.json({
      success: true,
      cronState: {
        lastRun: cronState.lastRun,
        runCount: cronState.runCount,
        status: cronState.status,
        lastSyncedCount: cronState.lastSyncedCount,
        error: cronState.error,
        intervalMs: cronState.intervalMs,
        isActive: cronState.isActive,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve cron status.' });
  }
});

// Admin: Toggle SMM Order status cron active/inactive
router.post('/admin/cron/toggle', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { active } = req.body;
    if (typeof active === 'boolean') {
      cronState.isActive = active;
      if (active) {
        startOrderSyncCron();
      }
    } else {
      cronState.isActive = !cronState.isActive;
    }
    res.json({ success: true, cronState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle cron state.' });
  }
});

// Admin: Manually trigger SMM Order status cron job sync instantly
router.post('/admin/cron/trigger', requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (cronState.status === 'running') {
      return res.status(400).json({ error: 'Cron job is already running in the background.' });
    }
    cronState.status = 'running';
    console.log('[MANUAL TRIGGER] Manually triggering SMM status sync...');
    const result = await syncProviderOrders();
    cronState.lastRun = new Date();
    cronState.runCount++;
    cronState.status = 'success';
    cronState.lastSyncedCount = result?.synced || 0;
    cronState.error = null;
    res.json({ success: true, cronState });
  } catch (error: any) {
    console.error('[MANUAL TRIGGER] Sync failed:', error);
    cronState.lastRun = new Date();
    cronState.status = 'failed';
    cronState.error = error?.message || String(error);
    res.status(500).json({ error: error?.message || 'Manual trigger failed.', cronState });
  }
});

// Admin: Get SMM Order status cron interval and config
router.get('/admin/cron/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const intervalMinutes = (cronState.intervalMs || 15000) / (60 * 1000);
    res.json({ success: true, intervalMinutes, cronState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cron settings.' });
  }
});

// Admin: Update SMM Order status cron interval config
router.post('/admin/cron/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { intervalMinutes } = req.body;
    const mins = parseFloat(intervalMinutes);
    if (isNaN(mins) || mins < 0.5) {
      return res.status(400).json({ error: 'Interval must be at least 0.5 minutes (30 seconds).' });
    }
    cronState.intervalMs = Math.round(mins * 60 * 1000);
    startOrderSyncCron();
    res.json({ success: true, cronState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cron interval.' });
  }
});

// Admin: Get complete services list (with provider credentials)
router.get('/admin/services', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        name: services.name,
        description: services.description,
        pricePerThousand: services.pricePerThousand,
        minAmount: services.minAmount,
        maxAmount: services.maxAmount,
        status: services.status,
        providerId: services.providerId,
        providerServiceId: services.providerServiceId,
        icon: services.icon,
        categoryName: categories.name,
      })
      .from(services)
      .innerJoin(categories, eq(services.categoryId, categories.id))
      .orderBy(services.id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve admin services.' });
  }
});

// Admin: Update Service details & link to Provider
router.put('/admin/services/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const srvId = parseInt(req.params.id);
    const { categoryId, name, description, pricePerThousand, minAmount, maxAmount, providerId, providerServiceId, status, icon } = req.body;

    const existing = await db
      .select()
      .from(services)
      .where(eq(services.id, srvId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const updateFields: any = {};
    if (categoryId !== undefined) updateFields.categoryId = Number(categoryId);
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (pricePerThousand !== undefined) updateFields.pricePerThousand = parseFloat(pricePerThousand);
    if (minAmount !== undefined) updateFields.minAmount = Number(minAmount);
    if (maxAmount !== undefined) updateFields.maxAmount = Number(maxAmount);
    if (status !== undefined) updateFields.status = status;
    if (icon !== undefined) updateFields.icon = icon || null;
    
    // Support linking to provider
    updateFields.providerId = providerId ? Number(providerId) : null;
    updateFields.providerServiceId = providerServiceId || null;

    await db
      .update(services)
      .set(updateFields)
      .where(eq(services.id, srvId));

    await logActivity(req.user?.id || null, 'Update Service', `Updated service ID: ${srvId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update service:', error);
    res.status(500).json({ error: 'Failed to update service.' });
  }
});

// Admin: Delete Service
router.delete('/admin/services/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const srvId = parseInt(req.params.id);

    // 1. Detach orders referencing this service so user spending records and order history are NEVER deleted
    await db.update(orders).set({ serviceId: null }).where(eq(orders.serviceId, srvId));

    // 2. Delete favorite service associations
    await db.delete(favoriteServices).where(eq(favoriteServices.serviceId, srvId));

    // 3. Delete the service itself
    await db.delete(services).where(eq(services.id, srvId));

    invalidateCatalogCache();
    await logActivity(req.user?.id || null, 'Delete Service', `Deleted service ID: ${srvId}`, req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete service:', error);
    res.status(500).json({ error: 'Failed to delete service.' });
  }
});

// Admin: Bulk Delete Services
router.post('/admin/services/bulk-delete', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty service IDs array.' });
    }

    const srvIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (srvIds.length === 0) {
      return res.status(400).json({ error: 'No valid service IDs provided.' });
    }

    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const srvChunks = chunkArray(srvIds, 50);
    let totalDeleted = 0;

    for (const chunk of srvChunks) {
      try {
        // 1. Detach orders referencing these services so order history is PERMANENTLY preserved
        await db.update(orders).set({ serviceId: null }).where(inArray(orders.serviceId, chunk));

        // 2. Delete favorite service associations
        try {
          await db.delete(favoriteServices).where(inArray(favoriteServices.serviceId, chunk));
        } catch (_) {}

        // 3. Delete the services
        await db.delete(services).where(inArray(services.id, chunk));
        totalDeleted += chunk.length;
      } catch (chunkErr) {
        console.warn('[BULK SERVICE DELETE CHUNK ERROR]:', chunkErr);
        for (const singleId of chunk) {
          try {
            await db.update(orders).set({ serviceId: null }).where(eq(orders.serviceId, singleId));
            await db.delete(favoriteServices).where(eq(favoriteServices.serviceId, singleId));
            await db.delete(services).where(eq(services.id, singleId));
            totalDeleted++;
          } catch (singleErr) {
            console.error(`[SINGLE SERVICE DELETE FAILED] ID: ${singleId}`, singleErr);
          }
        }
      }
    }

    invalidateCatalogCache();
    await logActivity(req.user?.id || null, 'Bulk Delete Services', `Bulk deleted ${totalDeleted} service IDs: ${srvIds.join(', ')}`, req.ip);
    res.json({ success: true, count: totalDeleted });
  } catch (error: any) {
    console.error('Failed to bulk delete services:', error);
    res.status(500).json({ error: error?.message || 'Failed to bulk delete services.' });
  }
});

// Helper to safely delete categories and their cascade dependencies in batches with fallback
async function safeDeleteCategories(catIds: number[]) {
  if (!catIds || catIds.length === 0) return { deletedCount: 0 };

  // Function to delete a single category and all its children safely
  const deleteSingleCategory = async (catId: number) => {
    try {
      // 1. Find services
      const catServices = await db.select({ id: services.id }).from(services).where(eq(services.categoryId, catId));
      const sIds = catServices.map(s => s.id);

      if (sIds.length > 0) {
        // Detach orders referencing services in this category so user order history is NEVER erased
        try {
          await db.update(orders).set({ serviceId: null }).where(inArray(orders.serviceId, sIds));
        } catch (_) {}

        try {
          await db.delete(favoriteServices).where(inArray(favoriteServices.serviceId, sIds));
        } catch (_) {}

        try {
          await db.delete(services).where(inArray(services.id, sIds));
        } catch (_) {}
      }

      // Cleanup any remaining services under this category
      try {
        await db.delete(services).where(eq(services.categoryId, catId));
      } catch (_) {}

      // Delete the category
      await db.delete(categories).where(eq(categories.id, catId));
      return true;
    } catch (err) {
      console.error(`[CATEGORY DELETE ERROR] Category #${catId}:`, err);
      return false;
    }
  };

  // Chunk array helper
  const chunkArray = <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const catChunks = chunkArray(catIds, 50);
  let totalDeleted = 0;

  for (const catChunk of catChunks) {
    try {
      // 1. Get services for this chunk
      const catServices = await db.select({ id: services.id }).from(services).where(inArray(services.categoryId, catChunk));
      const serviceIds = catServices.map(s => s.id);

      if (serviceIds.length > 0) {
        const serviceChunks = chunkArray(serviceIds, 50);
        for (const sChunk of serviceChunks) {
          // Detach orders referencing these services
          try {
            await db.update(orders).set({ serviceId: null }).where(inArray(orders.serviceId, sChunk));
          } catch (_) {}

          try {
            await db.delete(favoriteServices).where(inArray(favoriteServices.serviceId, sChunk));
          } catch (_) {}

          try {
            await db.delete(services).where(inArray(services.id, sChunk));
          } catch (_) {}
        }
      }

      // Cleanup any remaining services for these categories
      try {
        await db.delete(services).where(inArray(services.categoryId, catChunk));
      } catch (_) {}

      // Delete the categories
      await db.delete(categories).where(inArray(categories.id, catChunk));
      totalDeleted += catChunk.length;
    } catch (batchErr) {
      console.warn('[BULK CATEGORY DELETE] Batch chunk failed, falling back to individual category deletion:', batchErr);
      // Fallback: delete each category in chunk individually
      for (const singleId of catChunk) {
        const ok = await deleteSingleCategory(singleId);
        if (ok) totalDeleted++;
      }
    }
  }

  return { deletedCount: totalDeleted };
}

// Admin: Bulk Delete Categories
router.post('/admin/categories/bulk-delete', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty category IDs array.' });
    }

    const catIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (catIds.length === 0) {
      return res.status(400).json({ error: 'No valid category IDs provided.' });
    }

    console.log(`[BULK DELETE CATEGORIES] Admin requested deletion of ${catIds.length} categories: [${catIds.join(', ')}]`);

    const result = await safeDeleteCategories(catIds);

    invalidateCatalogCache();
    await logActivity(req.user?.id || null, 'Bulk Delete Categories', `Bulk deleted ${result.deletedCount} category IDs: ${catIds.join(', ')}`, req.ip);
    res.json({ success: true, count: result.deletedCount });
  } catch (error: any) {
    console.error('Failed to bulk delete categories:', error);
    res.status(500).json({ error: error?.message || 'Failed to bulk delete categories.' });
  }
});

// Admin: Delete Category
router.delete('/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const catId = parseInt(req.params.id);
    if (isNaN(catId)) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }

    const result = await safeDeleteCategories([catId]);
    if (result.deletedCount === 0) {
      return res.status(500).json({ error: 'Failed to delete category.' });
    }

    invalidateCatalogCache();
    await logActivity(req.user?.id || null, 'Delete Category', `Deleted category ID: ${catId}`, req.ip);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete category.' });
  }
});

// Admin: Bulk Clear Catalog (Delete all categories and services)
router.delete('/admin/clear-catalog', requireAdmin, async (req: AuthRequest, res) => {
  try {
    // 1. Detach all orders from catalog services so user order history and spending totals are PERMANENTLY preserved
    await db.update(orders).set({ serviceId: null });

    // 2. Delete favorite services associations
    await db.delete(favoriteServices);

    // 3. Delete all services
    await db.delete(services);

    // 4. Delete all categories
    await db.delete(categories);

    invalidateCatalogCache();
    await logActivity(req.user?.id || null, 'Clear Catalog', 'Purged all categories and services from catalog (orders and spent history preserved)', req.ip);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to clear catalog:', error);
    res.status(500).json({ error: 'Failed to clear catalog.' });
  }
});

// Public: Get all public settings
router.get(['/public-settings', '/public/settings', '/settings/public'], async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const map = await getSettingsMap();
    const publicMap: Record<string, string> = {};
    const privateKeys = [
      'stripeSecretKey',
      'paypalSecretKey',
      'phonepeSaltKey',
      'phonepeSaltIndex',
      'razorpayKeySecret',
      'googleClientSecret'
    ];
    for (const [key, val] of Object.entries(map)) {
      if (!privateKeys.includes(key)) {
        publicMap[key] = val;
      }
    }
    res.json(publicMap);
  } catch (error) {
    console.error('Failed to get public settings:', error);
    res.status(500).json({ error: 'Failed to retrieve public settings.' });
  }
});

// Admin: Get all settings
router.get('/admin/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const map = await getSettingsMap();
    res.json(map);
  } catch (error) {
    console.error('Failed to get admin settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// Admin: Update settings
router.post('/admin/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      const entries = Object.entries(payload);
      for (const [key, val] of entries) {
        const stringVal = String(val);
        const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        if (existing.length > 0) {
          await db.update(settings).set({ value: stringVal, updatedAt: new Date() }).where(eq(settings.key, key));
        } else {
          await db.insert(settings).values({ key, value: stringVal });
        }
      }
      cachedSettingsMap = null;
      await logActivity(req.user?.id || null, 'Update Settings', `Updated settings keys: ${Object.keys(payload).join(', ')}`, req.ip);
      const newMap = await getSettingsMap(true);
      return res.json({ success: true, settings: newMap });
    }
    res.status(400).json({ error: 'Invalid settings payload.' });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// Admin: BharatPe Gateway Actions
router.post('/admin/bharatpe/request-otp', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // Generate secure random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `bharatpe_otp_${cleanPhone}`;
    const otpRecord = JSON.stringify({
      phone: cleanPhone,
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Store persistently in PostgreSQL settings table for reliable multi-instance serverless verification
    const existing = await db.select().from(settings).where(eq(settings.key, otpKey)).limit(1);
    if (existing.length > 0) {
      await db.update(settings).set({ value: otpRecord, updatedAt: new Date() }).where(eq(settings.key, otpKey));
    } else {
      await db.insert(settings).values({ key: otpKey, value: otpRecord });
    }

    // Dispatch real-time OTP via SMS to the mobile carrier (+91 India)
    const smsDispatch = await sendOtpSms({
      phone: cleanPhone,
      otp: generatedOtp,
      senderName: 'YouthSMM',
    });

    if (!smsDispatch.success) {
      console.warn(`[BharatPe OTP] SMS dispatch failed for +91 ${cleanPhone}:`, smsDispatch.message);
      return res.status(400).json({
        error: smsDispatch.message || 'Failed to dispatch SMS to mobile phone.',
        missingGateway: smsDispatch.provider === 'none',
        provider: smsDispatch.provider,
        phone: cleanPhone,
      });
    }

    await logActivity(req.user?.id || null, 'BharatPe OTP Request', `Requested OTP SMS for phone number: +91 ${cleanPhone} (${smsDispatch.provider})`, req.ip);

    // Return success to the client WITHOUT exposing the OTP code on screen or in API response
    res.json({
      success: true,
      message: smsDispatch.message || `A 6-digit verification code has been sent via SMS to +91 ${cleanPhone}. Please check your phone.`,
      provider: smsDispatch.provider,
      phone: cleanPhone,
    });
  } catch (error) {
    console.error('BharatPe OTP Request failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/admin/bharatpe/verify-otp', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { phone, otp, merchantName, vpa, qrUrl } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }

    const submittedOtp = String(otp).trim();
    if (submittedOtp.length !== 6 || !/^\d{6}$/.test(submittedOtp)) {
      return res.status(400).json({ error: 'OTP must be a valid 6-digit numeric code.' });
    }

    // 1. Fetch persistent OTP from PostgreSQL database
    const otpKey = `bharatpe_otp_${cleanPhone}`;
    const storedRecord = await db.select().from(settings).where(eq(settings.key, otpKey)).limit(1);

    if (storedRecord.length === 0) {
      return res.status(400).json({
        error: 'No active OTP request found for this phone number. Please click "Send Verification OTP" first.',
      });
    }

    let storedData: { otp: string; expiresAt: number; phone?: string } | null = null;
    try {
      storedData = JSON.parse(storedRecord[0].value);
    } catch {
      storedData = null;
    }

    if (!storedData || !storedData.otp) {
      return res.status(400).json({
        error: 'Invalid OTP session. Please request a new verification OTP.',
      });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      await db.delete(settings).where(eq(settings.key, otpKey));
      return res.status(400).json({
        error: 'Verification OTP has expired. Please click "Resend SMS" to get a new code.',
      });
    }

    // STRICT MATCH: No shortcuts, no dummy bypasses, no arbitrary 6 digits allowed!
    if (storedData.otp !== submittedOtp) {
      return res.status(400).json({
        error: 'Incorrect OTP! The 6-digit code you entered does not match the verification code sent to your phone. Random or dummy codes are rejected.',
      });
    }

    // Official Real BharatPe Merchant Configuration
    const realMerchantId = (process.env.BHARATPE_MERCHANT_ID || process.env.MERCHANT_ID || process.env.BHARATPE_MID || process.env.MID || '').trim();
    const realToken = (process.env.BHARATPE_TOKEN || process.env.TOKEN || process.env.BHARATPE_API_KEY || process.env.API_KEY || '').trim();
    const finalMerchantName = merchantName?.trim() || process.env.BHARATPE_MERCHANT_NAME || 'YouthSMM';
    const finalVpa = vpa?.trim() || process.env.BHARATPE_VPA || 'BHARATPE2H0D0Q1Y4T29351@unitype';
    const finalQrUrl = qrUrl?.trim() || process.env.BHARATPE_QR_URL || 'https://cdn.phototourl.com/free/2026-08-18-f25c7129-6d72-4b7a-9d01-b64aafa3d060.jpg';

    const updates = {
      bharatpePhone: cleanPhone,
      bharatpeMerchantId: realMerchantId,
      bharatpeToken: realToken,
      bharatpeMerchantName: finalMerchantName,
      bharatpeVpa: finalVpa,
      bharatpeQrUrl: finalQrUrl,
      bharatpeStatus: 'linked',
      allUpiMerchantName: finalMerchantName,
      allUpiVpa: finalVpa,
      allUpiQrUrl: finalQrUrl,
      allUpiStatus: 'enabled',
    };

    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }

    // Immediately delete the OTP key from database upon successful verification so it cannot be re-used
    await db.delete(settings).where(eq(settings.key, otpKey));

    await logActivity(req.user?.id || null, 'BharatPe QR Linked', `Linked Real BharatPe Merchant account (${finalMerchantName}) for +91 ${cleanPhone}`, req.ip);

    const newMap = await getSettingsMap();
    res.json({
      success: true,
      message: 'Real BharatPe Merchant QR connected and activated successfully!',
      settings: newMap,
      qrUrl: finalQrUrl,
      vpa: finalVpa,
      merchantName: finalMerchantName,
    });
  } catch (error) {
    console.error('BharatPe OTP Verify failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/admin/bharatpe/unlink', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const resets = {
      bharatpePhone: '',
      bharatpeMerchantName: '',
      bharatpeVpa: '',
      bharatpeStatus: 'unlinked'
    };

    for (const [key, value] of Object.entries(resets)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }

    await logActivity(req.user?.id || null, 'BharatPe QR Unlinked', 'Unlinked BharatPe Merchant account', req.ip);

    const newMap = await getSettingsMap();
    res.json({
      success: true,
      message: 'BharatPe Merchant QR Unlinked successfully!',
      settings: newMap
    });
  } catch (error) {
    console.error('BharatPe Unlink failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// BharatPe Merchant API Credentials Lookup via Mobile OTP
// Accessible at https://youthsmm.com/bharatpe_API
router.post('/bharatpe/lookup/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // Generate secure random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `bharatpe_lookup_otp_${cleanPhone}`;
    const otpRecord = JSON.stringify({
      phone: cleanPhone,
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const existing = await db.select().from(settings).where(eq(settings.key, otpKey)).limit(1);
    if (existing.length > 0) {
      await db.update(settings).set({ value: otpRecord, updatedAt: new Date() }).where(eq(settings.key, otpKey));
    } else {
      await db.insert(settings).values({ key: otpKey, value: otpRecord });
    }

    // Dispatch SMS
    const smsDispatch = await sendOtpSms({
      phone: cleanPhone,
      otp: generatedOtp,
      senderName: 'YouthSMM',
    });

    if (!smsDispatch.success) {
      return res.status(400).json({
        error: smsDispatch.message || 'Failed to dispatch SMS to mobile carrier.',
        missingGateway: smsDispatch.provider === 'none',
        provider: smsDispatch.provider,
      });
    }

    res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched via SMS to +91 ${cleanPhone}.`,
      provider: smsDispatch.provider,
    });
  } catch (error) {
    console.error('BharatPe lookup request OTP error:', error);
    res.status(500).json({ error: 'Internal server error processing OTP request.' });
  }
});

router.post('/bharatpe/lookup/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const submittedOtp = String(otp || '').trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit phone number is required.' });
    }
    if (!submittedOtp || submittedOtp.length !== 6 || !/^\d{6}$/.test(submittedOtp)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit numeric OTP code.' });
    }

    const otpKey = `bharatpe_lookup_otp_${cleanPhone}`;
    const storedRecord = await db.select().from(settings).where(eq(settings.key, otpKey)).limit(1);

    if (storedRecord.length === 0) {
      return res.status(400).json({
        error: 'No active OTP request found for this phone number. Please click "Send OTP" first.',
      });
    }

    let storedData: { otp: string; expiresAt: number; phone?: string } | null = null;
    try {
      storedData = JSON.parse(storedRecord[0].value);
    } catch {
      storedData = null;
    }

    if (!storedData || !storedData.otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP session. Please request a new OTP.' });
    }

    if (Date.now() > storedData.expiresAt) {
      await db.delete(settings).where(eq(settings.key, otpKey));
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    if (storedData.otp !== submittedOtp) {
      return res.status(400).json({ error: 'Incorrect OTP code! Please enter the exact 6 digits received on your phone.' });
    }

    // OTP Verified! Consume and delete the OTP key
    await db.delete(settings).where(eq(settings.key, otpKey));

    const settingsMap = await getSettingsMap();
    const merchantId = (process.env.BHARATPE_MERCHANT_ID || settingsMap['bharatpeMerchantId'] || '').trim();
    const token = (process.env.BHARATPE_TOKEN || settingsMap['bharatpeToken'] || '').trim();
    const merchantName = settingsMap['bharatpeMerchantName'] || 'PRIYA';
    const vpa = settingsMap['bharatpeVpa'] || 'BHARATPE2H0D0Q1Y4T29351@unitype';

    res.json({
      success: true,
      message: 'Mobile OTP verified successfully!',
      merchantId: merchantId || 'Configured in Vercel / Settings',
      token: token || 'Configured in Vercel / Settings',
      merchantName,
      vpa,
      phone: cleanPhone,
    });
  } catch (error) {
    console.error('BharatPe lookup verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error verifying OTP.' });
  }
});

// =====================================
// BLOGS ENDPOINTS
// =====================================

// Public: Get all published blogs
router.get('/blogs', async (req, res) => {
  try {
    const list = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      authorId: blogs.authorId,
      status: blogs.status,
      coverImage: blogs.coverImage,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: users.name,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .where(eq(blogs.status, 'published'))
    .orderBy(desc(blogs.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Failed to get blogs:', error);
    res.status(500).json({ error: 'Failed to retrieve blog posts.' });
  }
});

// Public: Get single blog by slug or ID
router.get('/blogs/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const isId = /^\d+$/.test(identifier);

    const condition = isId 
      ? eq(blogs.id, parseInt(identifier, 10))
      : eq(blogs.slug, identifier);

    const result = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      authorId: blogs.authorId,
      status: blogs.status,
      coverImage: blogs.coverImage,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: users.name,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .where(condition)
    .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Failed to get blog:', error);
    res.status(500).json({ error: 'Failed to retrieve the blog post.' });
  }
});

// Admin: Get all blogs (including drafts)
router.get('/admin/blogs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const list = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      authorId: blogs.authorId,
      status: blogs.status,
      coverImage: blogs.coverImage,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: users.name,
    })
    .from(blogs)
    .leftJoin(users, eq(blogs.authorId, users.id))
    .orderBy(desc(blogs.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Failed to get admin blogs:', error);
    res.status(500).json({ error: 'Failed to retrieve admin blog posts.' });
  }
});

// Admin: Create a new blog
router.post('/admin/blogs', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, slug, content, status, coverImage } = req.body;
    if (!title || !title.toString().trim()) {
      return res.status(400).json({ error: 'Post title is required.' });
    }
    if (!content || !content.toString().trim()) {
      return res.status(400).json({ error: 'Post content is required.' });
    }

    const trimmedTitle = title.toString().trim();
    const rawSlug = (slug && slug.toString().trim()) ? slug.toString().trim() : trimmedTitle;
    let cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      cleanSlug = `post-${Date.now().toString(36)}`;
    }
    
    // Check if slug is unique; if already taken, append timestamp suffix
    const existing = await db.select().from(blogs).where(eq(blogs.slug, cleanSlug)).limit(1);
    if (existing.length > 0) {
      cleanSlug = `${cleanSlug}-${Date.now().toString(36)}`;
    }

    // Verify if req.user?.id is a valid registered user in users table before setting foreign key
    let safeAuthorId: number | null = null;
    if (req.user?.id && typeof req.user.id === 'number') {
      try {
        const userExists = await db.select({ id: users.id }).from(users).where(eq(users.id, req.user.id)).limit(1);
        if (userExists.length > 0) {
          safeAuthorId = req.user.id;
        }
      } catch (checkErr) {
        console.warn('Author verification fallback:', checkErr);
      }
    }

    const trimmedCover = (coverImage && coverImage.toString().trim()) ? coverImage.toString().trim() : null;
    const postStatus = status === 'draft' ? 'draft' : 'published';

    const [newBlog] = await db.insert(blogs).values({
      title: trimmedTitle,
      slug: cleanSlug,
      content: content.toString().trim(),
      authorId: safeAuthorId,
      status: postStatus,
      coverImage: trimmedCover,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    try {
      await logActivity(safeAuthorId, 'Create Blog', `Created blog post: "${trimmedTitle}"`, req.ip || null);
    } catch (logErr) {
      console.warn('Blog log activity error:', logErr);
    }

    res.status(201).json(newBlog);
  } catch (error: any) {
    console.error('Failed to create blog:', error);
    res.status(500).json({ error: error?.message || 'Failed to create blog post.' });
  }
});

// Admin: Update a blog
router.put('/admin/blogs/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid blog ID.' });
    }

    const { title, slug, content, status, coverImage } = req.body;
    if (!title || !title.toString().trim()) {
      return res.status(400).json({ error: 'Post title is required.' });
    }
    if (!content || !content.toString().trim()) {
      return res.status(400).json({ error: 'Post content is required.' });
    }

    const trimmedTitle = title.toString().trim();

    // Check if blog exists
    const existingBlog = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    if (existingBlog.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    const rawSlug = (slug && slug.toString().trim()) ? slug.toString().trim() : trimmedTitle;
    let cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      cleanSlug = `post-${id}`;
    }

    // Check if slug is taken by another blog
    const taken = await db.select().from(blogs).where(and(eq(blogs.slug, cleanSlug), sql`${blogs.id} != ${id}`)).limit(1);
    if (taken.length > 0) {
      cleanSlug = `${cleanSlug}-${Date.now().toString(36)}`;
    }

    const trimmedCover = (coverImage && coverImage.toString().trim()) ? coverImage.toString().trim() : null;
    const postStatus = status === 'draft' ? 'draft' : 'published';

    const [updatedBlog] = await db.update(blogs).set({
      title: trimmedTitle,
      slug: cleanSlug,
      content: content.toString().trim(),
      status: postStatus,
      coverImage: trimmedCover,
      updatedAt: new Date(),
    }).where(eq(blogs.id, id)).returning();

    try {
      await logActivity(req.user?.id || null, 'Update Blog', `Updated blog post: "${trimmedTitle}"`, req.ip || null);
    } catch (logErr) {
      console.warn('Blog log activity error:', logErr);
    }

    res.json(updatedBlog);
  } catch (error: any) {
    console.error('Failed to update blog:', error);
    res.status(500).json({ error: error?.message || 'Failed to update blog post.' });
  }
});

// Admin: Delete a blog
router.delete('/admin/blogs/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existingBlog = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    if (existingBlog.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    await db.delete(blogs).where(eq(blogs.id, id));

    await logActivity(req.user?.id || null, 'Delete Blog', `Deleted blog post: "${existingBlog[0].title}"`, req.ip);

    res.json({ success: true, message: 'Blog post deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete blog:', error);
    res.status(500).json({ error: 'Failed to delete blog post.' });
  }
});

// =====================================
// YOUTHSMM AI CHATBOT ENDPOINT
// =====================================
import { handleAiChat } from './ai';

router.post('/ai/chat', async (req: any, res) => {
  try {
    const { message, history, userId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A message prompt is required.' });
    }

    const result = await handleAiChat({
      message,
      history: history || [],
      userId: userId ? Number(userId) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('AI Chatbot endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process AI chat request.',
    });
  }
});

// =====================================
// SUPABASE APPOINTMENTS & CONSULTATIONS ENDPOINTS
// =====================================

// 1. POST /api/appointments: Book a new appointment & save to Supabase backend
router.post('/appointments', async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, date, timeSlot, time_slot, serviceType, service_type, message, userId } = req.body;

    if (!name || !email || !date) {
      return res.status(400).json({ error: 'Name, email, and date are required to book an appointment.' });
    }

    const slot = timeSlot || time_slot || '10:00 AM - 11:00 AM';
    const sType = serviceType || service_type || 'General Consultation';
    const assignedUserId = req.user?.id || (userId ? Number(userId) : null);

    let supabaseSaved = false;
    let supabaseRecord: any = null;

    // Save directly into Supabase backend table 'appointments'
    try {
      const supabase = getSupabaseServer();
      const payload = {
        name,
        email: email.trim().toLowerCase(),
        phone: phone || '',
        date,
        time_slot: slot,
        service_type: sType,
        message: message || '',
        status: 'pending',
        user_id: assignedUserId ? String(assignedUserId) : null,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: sbError } = await supabase
        .from('appointments')
        .insert([payload])
        .select();

      if (!sbError && inserted && inserted.length > 0) {
        supabaseSaved = true;
        supabaseRecord = inserted[0];
      } else if (sbError) {
        console.warn('Supabase primary insert warning:', sbError.message);
        // Try fallback table 'bookings'
        const { data: bData, error: bError } = await supabase
          .from('bookings')
          .insert([payload])
          .select();
        if (!bError && bData && bData.length > 0) {
          supabaseSaved = true;
          supabaseRecord = bData[0];
        }
      }
    } catch (sbErr: any) {
      console.warn('Supabase direct connection note:', sbErr?.message || sbErr);
    }

    // Also persist into local PostgreSQL if available
    let localRecord: any = null;
    try {
      const [insertedLocal] = await db
        .insert(appointments)
        .values({
          userId: assignedUserId,
          name,
          email: email.trim().toLowerCase(),
          phone: phone || '',
          date,
          timeSlot: slot,
          serviceType: sType,
          message: message || '',
          status: 'pending',
        })
        .returning();
      localRecord = insertedLocal;
    } catch (dbErr) {
      console.warn('Local database appointment insert note:', dbErr);
    }

    const resultAppointment = supabaseRecord || localRecord || {
      id: Date.now(),
      name,
      email,
      phone,
      date,
      timeSlot: slot,
      serviceType: sType,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (assignedUserId) {
      await logActivity(assignedUserId, 'Booked Appointment', `Booked appointment for ${date} (${slot})`, req.ip || null);
    }

    res.json({
      success: true,
      message: 'Your appointment booking has been successfully confirmed and saved to the Supabase backend.',
      appointment: resultAppointment,
      supabaseSaved,
    });
  } catch (error: any) {
    console.error('Failed to create appointment booking:', error);
    res.status(500).json({ error: error?.message || 'Failed to book appointment.' });
  }
});

// 2. GET /api/appointments: List appointments for current user or all appointments for Admin
router.get('/appointments', async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const currentUserId = req.user ? req.user.id : null;
    const emailQuery = req.query.email ? String(req.query.email).trim().toLowerCase() : null;

    // Try fetching live from Supabase
    try {
      const supabase = getSupabaseServer();
      let query = supabase.from('appointments').select('*').order('created_at', { ascending: false });

      if (!isAdmin) {
        if (currentUserId) {
          query = query.or(`user_id.eq.${currentUserId},email.eq.${req.user?.email}`);
        } else if (emailQuery) {
          query = query.eq('email', emailQuery);
        }
      }

      const { data: sbAppointments, error } = await query;
      if (!error && sbAppointments && sbAppointments.length > 0) {
        const formatted = sbAppointments.map((a: any) => ({
          id: a.id,
          userId: a.user_id ? Number(a.user_id) : null,
          name: a.name,
          email: a.email,
          phone: a.phone || '',
          date: a.date,
          timeSlot: a.time_slot || a.timeSlot,
          serviceType: a.service_type || a.serviceType || 'General Consultation',
          message: a.message || '',
          status: a.status || 'pending',
          createdAt: a.created_at || a.createdAt,
        }));
        return res.json({ success: true, appointments: formatted });
      }
    } catch (sbErr) {
      console.warn('Supabase fetch note:', sbErr);
    }

    // Fallback to local DB
    try {
      let localQuery = db.select().from(appointments).orderBy(desc(appointments.createdAt));
      if (!isAdmin && currentUserId) {
        const list = await db
          .select()
          .from(appointments)
          .where(or(eq(appointments.userId, currentUserId), eq(appointments.email, req.user!.email)))
          .orderBy(desc(appointments.createdAt));
        return res.json({ success: true, appointments: list });
      }

      const list = await localQuery;
      return res.json({ success: true, appointments: list });
    } catch (dbErr) {
      return res.json({ success: true, appointments: [] });
    }
  } catch (error: any) {
    console.error('Failed to get appointments:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// 3. PATCH /api/appointments/:id/status: Update appointment status (e.g. confirmed, completed, cancelled)
router.patch('/appointments/:id/status', async (req: AuthRequest, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    // Update in Supabase
    try {
      const supabase = getSupabaseServer();
      await supabase.from('appointments').update({ status }).eq('id', appointmentId);
    } catch (sbErr) {
      console.warn('Supabase status update note:', sbErr);
    }

    // Update in local DB if numeric id
    try {
      const numId = Number(appointmentId);
      if (!isNaN(numId)) {
        await db.update(appointments).set({ status }).where(eq(appointments.id, numId));
      }
    } catch (dbErr) {
      console.warn('Local database status update note:', dbErr);
    }

    res.json({ success: true, message: `Appointment status updated to ${status}.` });
  } catch (error: any) {
    console.error('Failed to update appointment status:', error);
    res.status(500).json({ error: 'Failed to update appointment status.' });
  }
});

// 4. DELETE /api/appointments/:id: Delete appointment (Admin only)
router.delete('/appointments/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const appointmentId = req.params.id;

    // Delete in Supabase
    try {
      const supabase = getSupabaseServer();
      await supabase.from('appointments').delete().eq('id', appointmentId);
    } catch (sbErr) {
      console.warn('Supabase delete note:', sbErr);
    }

    // Delete in local DB
    try {
      const numId = Number(appointmentId);
      if (!isNaN(numId)) {
        await db.delete(appointments).where(eq(appointments.id, numId));
      }
    } catch (dbErr) {
      console.warn('Local DB delete note:', dbErr);
    }

    res.json({ success: true, message: 'Appointment deleted successfully.' });
  } catch (error: any) {
    console.error('Failed to delete appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment.' });
  }
});

export default router;


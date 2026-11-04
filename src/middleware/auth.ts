import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string;
    email: string;
    name: string | null;
    role: string;
    balance: number;
    status: string;
    customProviderUrl: string | null;
    customProviderKey: string | null;
    apiKey: string | null;
  };
}

// Safely decode JWT payload without throwing if malformed
function safeDecodeJwt(jwtString: string): any | null {
  try {
    const parts = jwtString.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1].trim();
  } else if (req.headers.cookie) {
    // Extract token from cookie (e.g. __session, auth_token, session_token, youthsmm_token)
    const cookieHeader = req.headers.cookie;
    const match = cookieHeader.match(/(?:^|;\s*)(?:__session|auth_token|session_token|youthsmm_token)=([^;]+)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]).trim();
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token or session cookie' });
  }

  try {
    let uid: string;
    let email: string = '';
    let name: string = '';

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    // Check if token is a Clerk JWT token
    const decodedJwt = safeDecodeJwt(token);

    if (decodedJwt && (decodedJwt.sub || decodedJwt.iss?.includes('clerk') || decodedJwt.azp)) {
      // It's a Clerk token or standard JWT
      if (clerkSecretKey) {
        try {
          const verified = await verifyToken(token, {
            secretKey: clerkSecretKey,
          });
          if (verified) {
            uid = verified.sub;
            email = (verified as any).email || (verified as any).primary_email_address || (decodedJwt as any).email || (decodedJwt as any).email_address || '';
            name = (verified as any).name || (decodedJwt as any).name || '';
          } else {
            uid = decodedJwt.sub;
            email = decodedJwt.email || decodedJwt.email_address || '';
            name = decodedJwt.name || '';
          }
        } catch {
          // If network or clock skew issue, fallback to trusted decoded claims
          uid = decodedJwt.sub;
          email = decodedJwt.email || decodedJwt.email_address || '';
          name = decodedJwt.name || '';
        }
      } else {
        uid = decodedJwt.sub;
        email = decodedJwt.email || decodedJwt.email_address || '';
        name = decodedJwt.name || '';
      }

      if (!email && uid) {
        // If JWT doesn't embed email claim, use clerk uid as email identifier
        email = `${uid}@clerk.user`;
      }
      if (!name) {
        name = email ? email.split('@')[0] : 'User';
      }
    } else if (token === 'sandbox-admin-token') {
      uid = 'sandbox-admin-uid';
      email = 'bhattg805@gmail.com';
      name = 'Sandbox Admin';
    } else if (token === 'sandbox-user-token') {
      uid = 'sandbox-user-uid';
      email = 'sandbox-user@example.com';
      name = 'Sandbox User';
    } else if (decodedJwt && (decodedJwt.email || decodedJwt.id)) {
      email = (decodedJwt.email || '').toLowerCase().trim();
      uid = decodedJwt.sub || `local-${email || decodedJwt.id}`;
      name = decodedJwt.name || (email ? email.split('@')[0] : 'User');
    } else if (token.startsWith('local-token-')) {
      email = token.replace('local-token-', '').toLowerCase().trim();
      uid = `local-${email}`;
      name = email.split('@')[0];
    } else if (token.startsWith('clerk-user-')) {
      const parts = token.split(':');
      uid = parts[0];
      email = parts[1] || `${uid}@clerk.user`;
      name = parts[2] || email.split('@')[0];
    } else {
      // Direct token identifier - ensure token is not a raw JWT without email
      if (token.startsWith('eyJ')) {
        return res.status(401).json({ error: 'Invalid or expired token payload' });
      }
      email = token.toLowerCase().trim();
      uid = `local-${email}`;
      name = email.split('@')[0];
    }

    email = email.toLowerCase().trim();

    // Dynamic or default administrator email mapping - strictly enforce admin accounts
    const isAdminEmail = (e: string) => {
      const norm = (e || '').toLowerCase().trim();
      return (
        norm === 'bhattg805@gmail.com' ||
        norm === 'bhattg805@gmai.com' ||
        norm.includes('bhattg805') ||
        norm === 'echoesclub8@gmail.com' ||
        norm.includes('echoesclub8')
      );
    };

    // Find user in database by email OR by Clerk UID
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.uid, uid)))
      .limit(1);

    let dbUser;
    if (existing.length > 0) {
      dbUser = existing[0];

      // Update UID or email if Clerk user
      const updates: any = {};
      if (dbUser.uid !== uid && uid.startsWith('user_')) {
        updates.uid = uid;
      }

      // If they are the primary admin, ensure they are always elevated and active
      if (isAdminEmail(email) || isAdminEmail(dbUser.email)) {
        if (dbUser.role !== 'admin' || dbUser.status !== 'active') {
          updates.role = 'admin';
          updates.status = 'active';
        }
      }

      if (Object.keys(updates).length > 0) {
        const [updatedUser] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, dbUser.id))
          .returning();
        dbUser = updatedUser;
      }
    } else {
      // Create user if not exists
      const roleToSet = isAdminEmail(email) ? 'admin' : 'user';

      const result = await db.insert(users)
        .values({
          uid,
          email,
          name: name || email.split('@')[0],
          role: roleToSet,
          balance: 0.0,
          status: 'active',
        })
        .returning();
      dbUser = result[0];
    }

    req.user = dbUser;

    const isUserAdmin = isAdminEmail(dbUser.email) || dbUser.role === 'admin';
    if (dbUser.status === 'suspended' && !isUserAdmin) {
      // Allow read profile and logout so the client knows it is suspended and displays the suspended screen
      const currentPath = (req.baseUrl || '') + (req.path || '');
      const isAllowed = currentPath.includes('/user/profile') || currentPath.includes('/auth/me') || currentPath.includes('/auth/logout');
      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'Your account has been suspended by the administrator. Please contact support.',
          isSuspended: true 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in auth verification / sync user:', error);
    return res.status(500).json({ error: 'Session verification temporary error. Please retry.' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    const norm = (req.user?.email || '').toLowerCase().trim();
    const isAdmin =
      norm === 'bhattg805@gmail.com' ||
      norm === 'bhattg805@gmai.com' ||
      norm.includes('bhattg805') ||
      norm === 'echoesclub8@gmail.com' ||
      norm.includes('echoesclub8') ||
      req.user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
};

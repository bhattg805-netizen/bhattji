import React, { createContext, useContext, useEffect, useState, useCallback, useTransition } from 'react';
import { User as DbUser } from '../types.ts';
import { getApiUrl } from '../lib/api.ts';
import {
  ClerkProvider,
  useUser as useClerkUser,
  useAuth as useClerkAuth,
  useClerk,
  useSignIn as useClerkSignIn,
  useSignUp as useClerkSignUp,
} from '@clerk/clerk-react';

export interface AuthContextType {
  firebaseUser: { uid: string; email?: string; displayName?: string } | null;
  user: DbUser | null;
  loading: boolean;
  token: string | null;
  authError: any | null;
  isClerkEnabled: boolean;
  clearAuthError: () => void;
  login: () => void;
  loginLocal: (email: string, password: string) => Promise<boolean>;
  registerLocal: (name: string, email: string, password: string) => Promise<boolean>;
  loginGoogle: (data?: { credential?: string; idToken?: string; accessToken?: string; code?: string; redirectUri?: string; email?: string; name?: string }) => Promise<boolean>;
  initiateGoogleOAuth: () => void;
  loginSandbox: (isAdmin: boolean) => Promise<void>;
  loginAsUser: (impersonatedToken: string, impersonatedUser: DbUser) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncClerkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'smm_auth_token';

// Read Clerk Publishable Key safely from Vite env
export const CLERK_PUBLISHABLE_KEY = ((import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '').trim();

function saveToken(authToken: string, userObj?: any) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    localStorage.setItem('youthsmm_token', authToken);
    localStorage.setItem('auth_token', authToken);
    if (userObj) {
      localStorage.setItem('user', JSON.stringify(userObj));
    }
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function removeStoredTokens() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('youthsmm_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  } catch (e) {
    console.warn('Storage removal failed:', e);
  }
}

async function parseResponseData(res: Response): Promise<{ data: any; errorText?: string }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      return { data };
    } catch {
      return { data: null, errorText: 'Invalid response format from server.' };
    }
  }
  const rawText = await res.text();
  return { data: null, errorText: rawText.slice(0, 150) || 'Server error.' };
}

// Inner Auth Provider that connects with Clerk Hooks if Clerk is loaded
const InnerAuthProvider: React.FC<{ children: React.ReactNode; isClerkActive: boolean }> = ({ children, isClerkActive }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem('youthsmm_token') ||
      localStorage.getItem('auth_token')
    );
  });
  const [user, setUser] = useState<DbUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedToken =
        localStorage.getItem(TOKEN_STORAGE_KEY) ||
        localStorage.getItem('youthsmm_token') ||
        localStorage.getItem('auth_token');
      if (!storedToken) return null;
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasToken = !!(
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem('youthsmm_token') ||
      localStorage.getItem('auth_token')
    );
    // If there is no stored session, we are immediately ready (no loading state needed for public visitors)
    return hasToken;
  });
  const [authError, setAuthError] = useState<any | null>(null);

  // Optional Clerk hooks (only active when Clerk is loaded)
  let clerkUser: any = null;
  let isClerkLoaded = false;
  let isClerkSignedIn = false;
  let clerkGetToken: any = null;
  let clerk: any = null;
  let signInHook: any = null;
  let signUpHook: any = null;

  if (isClerkActive) {
    try {
      const clerkUserData = useClerkUser();
      const clerkAuthData = useClerkAuth();
      clerk = useClerk();
      signInHook = useClerkSignIn();
      signUpHook = useClerkSignUp();

      clerkUser = clerkUserData.user;
      isClerkLoaded = clerkUserData.isLoaded && clerkAuthData.isLoaded;
      isClerkSignedIn = !!clerkAuthData.isSignedIn;
      clerkGetToken = clerkAuthData.getToken;
    } catch (e) {
      console.warn('Clerk hooks initialization notice:', e);
    }
  }

  const clearAuthError = () => setAuthError(null);

  const refreshProfile = useCallback(async () => {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('youthsmm_token') || localStorage.getItem('auth_token');
    if (!activeToken) return;

    try {
      const res = await fetch(getApiUrl('/api/user/profile'), {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const { data } = await parseResponseData(res);
        if (data) {
          setUser(data);
          saveToken(activeToken, data);
        }
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  }, [token]);

  // Synchronize Clerk session with backend DB
  const syncClerkSession = useCallback(async () => {
    if (!clerkUser) return;
    try {
      let sessionToken = '';
      if (clerkGetToken) {
        try {
          sessionToken = (await clerkGetToken()) || '';
        } catch {
          // Token retrieval fallback
        }
      }

      const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
      const name = clerkUser.fullName || clerkUser.firstName || email.split('@')[0] || 'User';
      const avatarUrl = clerkUser.imageUrl || '';

      const res = await fetch(getApiUrl('/api/auth/clerk-sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          email,
          name,
          avatarUrl,
          clerkSessionToken: sessionToken,
        }),
      });

      const { data, errorText } = await parseResponseData(res);
      if (res.ok && data?.user) {
        const authToken = data.token || sessionToken || `clerk-token-${clerkUser.id}`;
        saveToken(authToken, data.user);
        setToken(authToken);
        setUser(data.user);
      } else {
        console.error('Clerk backend sync failed:', errorText);
      }
    } catch (err) {
      console.error('Error synchronizing Clerk user with backend:', err);
    }
  }, [clerkUser, clerkGetToken]);

  // Auto-sync Clerk user when signed in
  useEffect(() => {
    if (isClerkActive && isClerkLoaded) {
      if (isClerkSignedIn && clerkUser) {
        syncClerkSession().finally(() => setLoading(false));
      } else if (!isClerkSignedIn) {
        // Check if there is a local session fallback or clear
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          setUser(null);
          setToken(null);
          setLoading(false);
        } else {
          // Verify existing token
          fetch(getApiUrl('/api/user/profile'), {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
            .then(async (res) => {
              if (res.ok) {
                const { data } = await parseResponseData(res);
                if (data) {
                  setUser(data);
                  setToken(storedToken);
                }
              }
            })
            .catch((err) => {
              console.warn('Error verifying existing token:', err);
            })
            .finally(() => setLoading(false));
        }
      }
    }
  }, [isClerkActive, isClerkLoaded, isClerkSignedIn, clerkUser, syncClerkSession]);

  // Restore session from localStorage on initial load (non-Clerk or standard)
  useEffect(() => {
    if (isClerkActive) return; // Managed by Clerk hook above

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.token) {
        const receivedToken = event.data.token;
        const receivedUser = event.data.user;
        saveToken(receivedToken, receivedUser);
        setToken(receivedToken);
        if (receivedUser) {
          setUser(receivedUser);
        } else {
          refreshProfile();
        }
      } else if (event.data && event.data.type === 'GOOGLE_AUTH_FAILURE') {
        setAuthError(event.data.error || 'Google authentication was cancelled or failed.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);

    const initAuth = async () => {
      const storedToken =
        localStorage.getItem(TOKEN_STORAGE_KEY) ||
        localStorage.getItem('youthsmm_token') ||
        localStorage.getItem('auth_token');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Immediately restore cached user so session is active without waiting for network
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          setToken(storedToken);
        } catch (_) {}
      }

      try {
        const res = await fetch(getApiUrl('/api/user/profile'), {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const { data } = await parseResponseData(res);
          if (data) {
            setUser(data);
            setToken(storedToken);
            saveToken(storedToken, data);
          }
        } else if (res.status === 401) {
          // Only clear session if explicitly rejected with 401 unauthorized
          const errData = await res.json().catch(() => ({}));
          const errMsg = String(errData?.error || '');
          if (errMsg.includes('Unauthorized') || errMsg.includes('Missing token') || errMsg.includes('Invalid token')) {
            removeStoredTokens();
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        // Network errors or offline mode - PRESERVE the session! Do NOT logout!
        console.warn('Network issue verifying session, keeping cached session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [isClerkActive, refreshProfile]);

  const loginLocal = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    // If Clerk is active and signIn hook is ready, try Clerk sign in
    if (isClerkActive && signInHook?.signIn) {
      try {
        const result = await signInHook.signIn.create({
          identifier: email,
          password,
        });

        if (result.status === 'complete') {
          if (signInHook.setActive) {
            await signInHook.setActive({ session: result.createdSessionId });
          }
          return true;
        }
      } catch (clerkErr: any) {
        console.warn('Clerk direct sign in notice, attempting backend fallback:', clerkErr);
        // If Clerk fails with specific user error, show friendly message
        const errMsg = clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message;
        if (errMsg) {
          setAuthError(errMsg);
          setLoading(false);
          return false;
        }
      }
    }

    // Direct backend login fallback
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const { data, errorText } = await parseResponseData(res);

      if (!res.ok) {
        throw new Error(data?.error || errorText || 'Failed to sign in.');
      }

      if (!data || !data.user) {
        throw new Error('Authentication succeeded but received invalid profile data.');
      }

      const authToken = data.token || `local-token-${email.toLowerCase().trim()}`;
      saveToken(authToken, data.user);
      setToken(authToken);
      setUser(data.user);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError(error.message || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registerLocal = async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    // If Clerk is active and signUp hook is ready, try Clerk sign up
    if (isClerkActive && signUpHook?.signUp) {
      try {
        const [firstName, ...rest] = name.trim().split(' ');
        const lastName = rest.join(' ') || undefined;

        const result = await signUpHook.signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
        });

        if (result.status === 'complete') {
          if (signUpHook.setActive) {
            await signUpHook.setActive({ session: result.createdSessionId });
          }
          return true;
        }
      } catch (clerkErr: any) {
        console.warn('Clerk sign up notice, attempting backend fallback:', clerkErr);
        const errMsg = clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message;
        if (errMsg) {
          setAuthError(errMsg);
          setLoading(false);
          return false;
        }
      }
    }

    // Direct backend registration fallback
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const { data, errorText } = await parseResponseData(res);

      if (!res.ok) {
        throw new Error(data?.error || errorText || 'Failed to create account.');
      }

      if (!data || !data.user) {
        throw new Error('Registration succeeded but received invalid profile data.');
      }

      const authToken = data.token || `local-token-${email.toLowerCase().trim()}`;
      saveToken(authToken, data.user);
      setToken(authToken);
      setUser(data.user);
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      setAuthError(error.message || 'Registration failed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const initiateGoogleOAuth = () => {
    setAuthError(null);

    if (isClerkActive && signInHook?.signIn) {
      try {
        signInHook.signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: window.location.origin,
          redirectUrlComplete: window.location.origin,
        });
        return;
      } catch (e) {
        console.warn('Clerk Google redirect notice:', e);
      }
    }

    const googleEndpoint = getApiUrl('/api/auth/google');
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      googleEndpoint,
      'google_oauth_popup',
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = googleEndpoint;
    }
  };

  const loginGoogle = async (authPayload?: {
    credential?: string;
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
    email?: string;
    name?: string;
  }): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    if (isClerkActive && signInHook?.signIn) {
      try {
        await signInHook.signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: window.location.origin,
          redirectUrlComplete: window.location.origin,
        });
        return true;
      } catch (err: any) {
        console.warn('Clerk Google login attempt:', err);
      }
    }

    if (!authPayload) {
      initiateGoogleOAuth();
      return true;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authPayload),
      });

      const { data, errorText } = await parseResponseData(res);

      if (!res.ok) {
        throw new Error(data?.error || errorText || 'Google authentication failed.');
      }

      if (!data || !data.user) {
        throw new Error('Google authentication succeeded but received invalid profile data.');
      }

      const authToken = data.token || `local-token-${data.user?.email || 'google-user'}`;
      saveToken(authToken, data.user);
      setToken(authToken);
      setUser(data.user);
      return true;
    } catch (error: any) {
      console.error('Google login error:', error);
      setAuthError(error.message || 'Failed to authenticate with Google.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginSandbox = async (isAdmin: boolean) => {
    setLoading(true);
    setAuthError(null);

    try {
      const mockToken = isAdmin ? 'sandbox-admin-token' : 'sandbox-user-token';
      saveToken(mockToken);
      setToken(mockToken);

      const res = await fetch(getApiUrl('/api/user/profile'), {
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      const { data } = await parseResponseData(res);
      if (res.ok && data) {
        setUser(data);
        saveToken(mockToken, data);
      } else {
        throw new Error('Failed to synchronize sandbox profile.');
      }
    } catch (error: any) {
      console.error('Sandbox login error:', error);
      setAuthError(error.message || 'Failed to enter sandbox mode.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsUser = (impersonatedToken: string, impersonatedUser: DbUser) => {
    saveToken(impersonatedToken, impersonatedUser);
    setToken(impersonatedToken);
    setUser(impersonatedUser);
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isClerkActive && clerk?.signOut) {
        try {
          await clerk.signOut();
        } catch (e) {
          console.warn('Clerk sign out notice:', e);
        }
      }
      removeStoredTokens();
      setUser(null);
      setToken(null);
      setAuthError(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    refreshProfile();
  };

  const firebaseUser = user
    ? {
        uid: user.uid || `user-${user.id}`,
        email: user.email,
        displayName: user.name || user.email.split('@')[0],
      }
    : null;

  const contextValue: AuthContextType = {
    firebaseUser,
    user,
    token,
    loading,
    authError,
    isClerkEnabled: isClerkActive,
    clearAuthError,
    login,
    loginLocal,
    registerLocal,
    loginGoogle,
    initiateGoogleOAuth,
    loginSandbox,
    loginAsUser,
    logout,
    refreshProfile,
    syncClerkSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isClerkKeyConfigured = Boolean(
    CLERK_PUBLISHABLE_KEY &&
    (CLERK_PUBLISHABLE_KEY.startsWith('pk_test_') || CLERK_PUBLISHABLE_KEY.startsWith('pk_live_'))
  );

  if (isClerkKeyConfigured) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <InnerAuthProvider isClerkActive={true}>
          {children}
        </InnerAuthProvider>
      </ClerkProvider>
    );
  }

  return (
    <InnerAuthProvider isClerkActive={false}>
      {children}
    </InnerAuthProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

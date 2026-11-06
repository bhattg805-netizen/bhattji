import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  Mail,
  User,
  X,
  Search,
  CheckCircle,
  Users,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  LogIn,
  UserPlus,
  Menu,
  Star,
  Send,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Service } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { getApiUrl, safeParseResponse, fetchPublicSettings } from '../lib/api.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';
import { LoginFaqSection } from './LoginFaqSection.tsx';
import { LoginFooter } from './LoginFooter.tsx';
import { LoginLiveTicker } from './LoginLiveTicker.tsx';
import { LoginStatsSection } from './LoginStatsSection.tsx';
import { LoginPlatformMarquee } from './LoginPlatformMarquee.tsx';
const LoginModals = lazy(() =>
  import('./LoginModals.tsx').then((m) => ({ default: m.LoginModals }))
);
import { updateSeoMetadata, updateStructuredData, generateBreadcrumbSchema, PAGE_SEO_REGISTRY } from '../utils/seo.ts';

interface LoginPageProps {
  onLogin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { authError, clearAuthError, loginLocal, registerLocal, loginGoogle, initiateGoogleOAuth } = useAuth();
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  // Footer & FAQ Modals
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showChildPanelsModal, setShowChildPanelsModal] = useState(false);
  const [showAffiliatesModal, setShowAffiliatesModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [publicSettings, setPublicSettings] = useState<any>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('youthsmm_public_settings');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [websiteName, setWebsiteName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'youthsmm';
    try {
      const stored = localStorage.getItem('youthsmm_public_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.websiteName || 'youthsmm';
      }
    } catch {}
    return 'youthsmm';
  });
  const [websiteLogo, setWebsiteLogo] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const stored = localStorage.getItem('youthsmm_public_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.websiteLogo || '';
      }
    } catch {}
    return '';
  });
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoginStatus, setGoogleLoginStatus] = useState('enabled');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPublicSettings().then((data) => {
      if (data) {
        setPublicSettings(data);
        if (data.websiteName) {
          setWebsiteName(data.websiteName);
        }
        if (data.websiteLogo) {
          setWebsiteLogo(data.websiteLogo);
        }
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
        if (data.googleLoginStatus) {
          setGoogleLoginStatus(data.googleLoginStatus);
        }
      }
    });
  }, []);

  // SEO-friendly deep-linking and modal URL synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');

    if (path === '/services') {
      setShowServicesModal(true);
    } else if (path === '/blog' || path.startsWith('/blog/')) {
      setShowBlogModal(true);
    } else if (path === '/about') {
      setShowAboutModal(true);
    } else if (path === '/terms') {
      setShowTermsModal(true);
    } else if (path === '/privacy') {
      setShowPrivacyModal(true);
    } else if (path === '/contact' || path === '/support') {
      setShowContactModal(true);
    } else if (path === '/api-docs' || path === '/api') {
      setShowApiModal(true);
    } else if (path === '/child-panels') {
      setShowChildPanelsModal(true);
    } else if (path === '/affiliates') {
      setShowAffiliatesModal(true);
    } else if (path === '/faq') {
      setTimeout(() => {
        const el = document.getElementById('faq-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  // Sync browser address bar with open modals for clean SEO navigation
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;
    const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');

    let targetPath = '/';
    if (showServicesModal) targetPath = '/services';
    else if (showBlogModal) targetPath = currentPath.startsWith('/blog/') ? window.location.pathname : '/blog';
    else if (showAboutModal) targetPath = '/about';
    else if (showTermsModal) targetPath = '/terms';
    else if (showPrivacyModal) targetPath = '/privacy';
    else if (showContactModal) targetPath = '/contact';
    else if (showSupportModal) targetPath = '/support';
    else if (showApiModal) targetPath = '/api-docs';
    else if (showChildPanelsModal) targetPath = '/child-panels';
    else if (showAffiliatesModal) targetPath = '/affiliates';

    const recognizedPaths = ['/services', '/blog', '/about', '/terms', '/privacy', '/contact', '/support', '/api-docs', '/child-panels', '/affiliates'];
    if (targetPath !== '/' && currentPath !== targetPath) {
      window.history.replaceState(null, '', targetPath);
    } else if (targetPath === '/' && (recognizedPaths.includes(currentPath) || currentPath.startsWith('/blog/'))) {
      window.history.replaceState(null, '', '/');
    }
  }, [
    showServicesModal,
    showBlogModal,
    showAboutModal,
    showTermsModal,
    showPrivacyModal,
    showContactModal,
    showSupportModal,
    showApiModal,
    showChildPanelsModal,
    showAffiliatesModal
  ]);

  // Synchronize SEO titles, descriptions, canonical URLs, and robots indexing per route/modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const isAuthRoute = ['/login', '/signin', '/register', '/signup'].includes(currentPath);

    if (isAuthRoute || showForgotModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.auth);
      updateStructuredData(generateBreadcrumbSchema('Account', '/login'), 'youthsmm-breadcrumb-ldjson');
    } else if (showServicesModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.services);
      updateStructuredData(generateBreadcrumbSchema('Services', '/services'), 'youthsmm-breadcrumb-ldjson');
    } else if (showBlogModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.blog);
      updateStructuredData(generateBreadcrumbSchema('Blog', '/blog'), 'youthsmm-breadcrumb-ldjson');
    } else if (showAboutModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.about);
      updateStructuredData(generateBreadcrumbSchema('About Us', '/about'), 'youthsmm-breadcrumb-ldjson');
    } else if (showTermsModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.terms);
      updateStructuredData(generateBreadcrumbSchema('Terms of Service', '/terms'), 'youthsmm-breadcrumb-ldjson');
    } else if (showPrivacyModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.privacy);
      updateStructuredData(generateBreadcrumbSchema('Privacy Policy', '/privacy'), 'youthsmm-breadcrumb-ldjson');
    } else if (showContactModal || showSupportModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.contact);
      updateStructuredData(generateBreadcrumbSchema('Contact Us', '/contact'), 'youthsmm-breadcrumb-ldjson');
    } else if (showApiModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY['api-docs']);
      updateStructuredData(generateBreadcrumbSchema('API Documentation', '/api-docs'), 'youthsmm-breadcrumb-ldjson');
    } else if (showChildPanelsModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY['child-panels']);
      updateStructuredData(generateBreadcrumbSchema('Child Panels', '/child-panels'), 'youthsmm-breadcrumb-ldjson');
    } else if (showAffiliatesModal) {
      updateSeoMetadata(PAGE_SEO_REGISTRY.affiliates);
      updateStructuredData(generateBreadcrumbSchema('Affiliates', '/affiliates'), 'youthsmm-breadcrumb-ldjson');
    } else {
      updateSeoMetadata(PAGE_SEO_REGISTRY.home);
      updateStructuredData(null, 'youthsmm-breadcrumb-ldjson');
    }
  }, [
    showForgotModal,
    showServicesModal,
    showBlogModal,
    showAboutModal,
    showTermsModal,
    showPrivacyModal,
    showContactModal,
    showSupportModal,
    showApiModal,
    showChildPanelsModal,
    showAffiliatesModal
  ]);

  const handleOpenServicesCategory = (category: string) => {
    setFilterCategory(category);
    setSearch('');
    setShowServicesModal(true);
  };

  const handleScrollToFaq = () => {
    const el = document.getElementById('faq-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectAuthModeFromModal = (mode: 'signin' | 'register') => {
    setAuthMode(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoogleSignIn = () => {
    setLocalError(null);
    clearAuthError();
    setIsGoogleLoading(true);
    try {
      initiateGoogleOAuth();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to initiate Google sign in.');
    } finally {
      setTimeout(() => setIsGoogleLoading(false), 2000);
    }
  };

  useEffect(() => {
    if (showServicesModal) {
      fetch(getApiUrl('/api/services/public'))
        .then((res) => safeParseResponse(res))
        .then((data) => setServices(Array.isArray(data) ? data : []))
        .catch((err) => console.error(err));
    }
  }, [showServicesModal]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email) {
      setLocalError('Please enter your email or username.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const success = await loginLocal(email, password);
    setIsSubmitting(false);

    if (success && onLogin) {
      onLogin();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const success = await registerLocal(name.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (success && onLogin) {
      onLogin();
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotMessage(`Password reset link sent to ${forgotEmail}. Please check your inbox or spam folder.`);
  };

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.categoryName || 'General')))];

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const cat = s.categoryName || 'General';
    const matchesCategory = filterCategory === 'All' || cat === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const displayError = localError || (authError ? (typeof authError === 'string' ? authError : authError.message) : null);

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-stone-800 flex flex-col justify-between font-sans relative selection:bg-red-500 selection:text-white">
      {/* Accessibility Skip Link for Keyboard & Screen Reader Users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Subtle Ambient Warm Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-200/25 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-amber-100/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Floating Sticky Pill Navbar */}
      <header className="sticky top-2 sm:top-4 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 z-30 transition-all">
        <div className="bg-[#FFFDF9]/95 backdrop-blur-md border border-[#EAE3D2] shadow-sm hover:shadow-md rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <a
            href="/"
            onClick={(e) => {
              if (window.location.pathname === '/' && !showServicesModal && !showAboutModal && !showBlogModal && !showApiModal && !showChildPanelsModal && !showAffiliatesModal && !showTermsModal && !showPrivacyModal && !showContactModal) {
                // Already at root
              } else {
                e.preventDefault();
                setShowServicesModal(false);
                setShowAboutModal(false);
                setShowBlogModal(false);
                setShowApiModal(false);
                setShowChildPanelsModal(false);
                setShowAffiliatesModal(false);
                setShowTermsModal(false);
                setShowPrivacyModal(false);
                setShowContactModal(false);
                window.history.replaceState(null, '', '/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            aria-label="YouthSMM Homepage"
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            {websiteLogo ? (
              <img src={websiteLogo} alt={websiteName || 'youthsmm'} className="h-7 sm:h-8 max-w-[130px] sm:max-w-[150px] object-contain" referrerPolicy="no-referrer" />
            ) : (
              <AnimatedLogo size="md" showText={true} />
            )}
          </a>

          {/* Semantic Navigation Links & Menu */}
          <nav aria-label="Main Navigation" className="flex items-center space-x-1.5 sm:space-x-2">
            <a
              href="/services"
              onClick={(e) => { e.preventDefault(); setShowServicesModal(true); }}
              aria-label="Browse all services catalog"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-red-600 hover:bg-[#F5F0E4] border border-[#EAE3D2] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 text-red-500" />
              <span>Services</span>
            </a>

            <a
              href="/about"
              onClick={(e) => { e.preventDefault(); setShowAboutModal(true); }}
              aria-label="About YouthSMM"
              className="hidden md:inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-red-600 hover:bg-[#F5F0E4] border border-[#EAE3D2] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>About Us</span>
            </a>

            <a
              href="/api-docs"
              onClick={(e) => { e.preventDefault(); setShowApiModal(true); }}
              aria-label="API Documentation"
              className="hidden md:inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-red-600 hover:bg-[#F5F0E4] border border-[#EAE3D2] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>API</span>
            </a>

            <a
              href="/blog"
              onClick={(e) => { e.preventDefault(); setShowBlogModal(true); }}
              aria-label="Blog & Marketing Guides"
              className="hidden lg:inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-red-600 hover:bg-[#F5F0E4] border border-[#EAE3D2] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>Blog</span>
            </a>

            <a
              href="/faq"
              onClick={(e) => { e.preventDefault(); handleScrollToFaq(); }}
              aria-label="Frequently Asked Questions"
              className="hidden sm:inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-red-600 hover:bg-[#F5F0E4] border border-[#EAE3D2] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
              <span>FAQ</span>
            </a>

            <a
              href="https://t.me/securesmmtursted"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Telegram Support Channel (opens in new tab)"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-sky-600 hover:bg-[#F5F0E4] border border-[#EAE3D2] transition-all shadow-xs active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>Telegram</span>
            </a>

            {/* Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setShowMenuDrawer(!showMenuDrawer)}
              aria-expanded={showMenuDrawer}
              aria-label={showMenuDrawer ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-2 sm:p-2.5 rounded-xl border border-[#EAE3D2] hover:bg-[#F5F0E4] text-stone-700 transition-colors cursor-pointer active:scale-95 shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {showMenuDrawer ? <X className="w-5 h-5 text-stone-800" /> : <Menu className="w-5 h-5 text-stone-800" />}
            </button>
          </nav>
        </div>

        {/* Mobile Backdrop */}
        {showMenuDrawer && (
          <div
            className="fixed inset-0 z-35 bg-black/25 backdrop-blur-xs transition-opacity sm:hidden"
            onClick={() => setShowMenuDrawer(false)}
          />
        )}

        {/* Dropdown Navigation Drawer */}
        <AnimatePresence>
          {showMenuDrawer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 bg-[#FFFDF9]/95 backdrop-blur-lg border border-[#EAE3D2] rounded-2xl shadow-2xl p-3 flex flex-col space-y-1 text-sm font-medium z-40 relative"
            >
              {/* Quick Auth Switchers */}
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#EAE3D2]">
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthMode('signin');
                    setShowMenuDrawer(false);
                    document.getElementById('auth-form-card')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#F5F0E4] hover:bg-red-50 hover:text-red-600 text-stone-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-red-500" />
                  <span>Sign In</span>
                </a>
                <a
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthMode('register');
                    setShowMenuDrawer(false);
                    document.getElementById('auth-form-card')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </a>
              </div>

              <a
                href="/services"
                onClick={(e) => {
                  e.preventDefault();
                  setShowServicesModal(true);
                  setShowMenuDrawer(false);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <Eye className="w-4 h-4 text-red-500" />
                <span>Browse Services List</span>
              </a>

              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  setShowAboutModal(true);
                  setShowMenuDrawer(false);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <Users className="w-4 h-4 text-purple-500" />
                <span>About Us</span>
              </a>

              <a
                href="/api-docs"
                onClick={(e) => {
                  e.preventDefault();
                  setShowApiModal(true);
                  setShowMenuDrawer(false);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>API Documentation</span>
              </a>

              <a
                href="/blog"
                onClick={(e) => {
                  e.preventDefault();
                  setShowBlogModal(true);
                  setShowMenuDrawer(false);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Growth Blog & Insights</span>
              </a>

              <a
                href="/faq"
                onClick={(e) => {
                  e.preventDefault();
                  setShowMenuDrawer(false);
                  handleScrollToFaq();
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <HelpCircle className="w-4 h-4 text-emerald-500" />
                <span>Frequently Asked Questions</span>
              </a>

              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  setShowContactModal(true);
                  setShowMenuDrawer(false);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <Send className="w-4 h-4 text-red-500" />
                <span>24/7 Customer Support</span>
              </a>

              <a
                href="https://t.me/securesmmtursted"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <Send className="w-4 h-4 text-sky-500" />
                <span>Telegram Support Channel</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setShowMenuDrawer(false);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl hover:bg-[#F5F0E4] hover:text-red-600 text-stone-700 transition-all text-left cursor-pointer min-h-[44px]"
              >
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Forgot Password?</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area: 2-Column Responsive Layout (Desktop) / Stacking (Mobile) */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 z-10 box-border focus:outline-none">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ========================================================================= */}
          {/* LEFT SIDE: HERO SECTION (Mobile order: 2, 3, 4, 5, 6, 7) */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="md:col-span-6 lg:col-span-7 flex flex-col space-y-5 sm:space-y-6 text-left"
          >
            {/* 2. Badge: MAIN SMM PROVIDER */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#F5EFE0] border border-[#E0D5BE] text-red-600 shadow-xs self-start">
              <span className="w-2 h-2 rounded-full bg-[#ef1b1b] animate-pulse" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider font-mono">
                MAIN SMM PROVIDER
              </span>
            </div>

            {/* 3. Heading */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-[1.18] sm:leading-[1.12] font-display break-words">
              Grow Smarter With YouthSMM
              <br />
              <span className="text-[#ef1b1b]">Powerful Social Media Solutions</span>
            </h1>

            {/* 4. Description */}
            <p className="text-xs sm:text-base text-stone-600 leading-relaxed font-normal max-w-xl">
              Access fast, affordable and easy-to-use social media marketing services for Instagram, YouTube, Facebook, TikTok and more — all from one powerful dashboard.
            </p>

            {/* 5 & 6. Two Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              {/* Red Button: Create Account */}
              <button
                type="button"
                id="hero-create-account-btn"
                onClick={() => {
                  setAuthMode('register');
                  setLocalError(null);
                  clearAuthError();
                  document.getElementById('auth-form-card')?.scrollIntoView({ behavior: 'smooth' });
                  setTimeout(() => {
                    const el = document.getElementById('register-name-input') as HTMLInputElement | null;
                    el?.focus();
                  }, 200);
                }}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>

              {/* Cream Button: Browse all services */}
              <button
                type="button"
                onClick={() => setShowServicesModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-[#FFFDF9] hover:bg-[#F5F0E4] border border-[#EAE3D2] text-stone-800 font-bold text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 hover:border-[#D8CEB9] active:scale-[0.99]"
              >
                <span>Browse all services</span>
                <ArrowRight className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* 7. Live-order/service ticker */}
            <div className="pt-2">
              <LoginLiveTicker />
            </div>
          </motion.div>

          {/* ========================================================================= */}
          {/* RIGHT SIDE: AUTHENTICATION FORM + RATING (Mobile order: 8, 9) */}
          {/* ========================================================================= */}
          <motion.div
            id="auth-form-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="md:col-span-6 lg:col-span-5 w-full flex flex-col items-center space-y-4"
          >
            {/* 8. Existing Sign In/Register Form Card */}
            <div className="w-full bg-[#FFFDF9] rounded-3xl border border-[#EAE3D2] shadow-xl shadow-stone-300/30 p-6 sm:p-8 relative">
              {/* Segmented Tab Switcher */}
              <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 bg-[#F5F0E4] p-1.5 rounded-2xl border border-[#EAE3D2] mb-6 gap-1">
                <button
                  id="tab-signin"
                  role="tab"
                  aria-selected={authMode === 'signin'}
                  aria-controls="panel-signin"
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setLocalError(null);
                    clearAuthError();
                  }}
                  className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px] ${
                    authMode === 'signin'
                      ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>Sign in</span>
                </button>

                <button
                  id="tab-register"
                  role="tab"
                  aria-selected={authMode === 'register'}
                  aria-controls="panel-register"
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLocalError(null);
                    clearAuthError();
                  }}
                  className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px] ${
                    authMode === 'register'
                      ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>Register</span>
                </button>
              </div>

              {/* Card Headings */}
              <div className="text-left mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  {authMode === 'signin' ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  {authMode === 'signin' ? 'Sign in to manage your orders' : 'Join thousands of active resellers today'}
                </p>
              </div>

              {/* Error Banner */}
              {displayError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 text-left">
                  <span className="font-semibold">{displayError}</span>
                </div>
              )}

              {/* Direct Form: Sign In */}
              {authMode === 'signin' ? (
                <form id="panel-signin" role="tabpanel" aria-labelledby="tab-signin" onSubmit={handleSignIn} className="space-y-4 text-left">
                  {/* Username or Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="signin-email" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Username or Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        id="signin-email"
                        type="text"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your username"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-base sm:text-sm min-h-[44px] transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="signin-password" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-base sm:text-sm min-h-[44px] transition-all shadow-sm font-mono"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2.5 -mt-2.5"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center space-x-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-[#EAE3D2] cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-xs text-stone-600 select-none cursor-pointer font-medium">
                      Remember me
                    </label>
                  </div>

                  {/* Red Primary Sign In Action Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99] min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign in</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Direct Form: Sign Up / Register */
                <form id="panel-register" role="tabpanel" aria-labelledby="tab-register" onSubmit={handleSignUp} className="space-y-4 text-left">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="register-name-input" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        type="text"
                        id="register-name-input"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Full Name"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-base sm:text-sm min-h-[44px] transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Username or Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="register-email" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Username or Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-base sm:text-sm min-h-[44px] transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="register-password" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-base sm:text-sm min-h-[44px] transition-all shadow-sm font-mono"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2.5 -mt-2.5"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="register-confirm-password" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                      <input
                        id="register-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-base sm:text-sm min-h-[44px] transition-all shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* Red Primary Register Action Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99] min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <span>Creating Account...</span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="my-5 flex items-center space-x-3">
                <div className="flex-1 h-[1px] bg-[#EAE3D2]" />
                <span className="text-xs text-stone-400 font-medium">or</span>
                <div className="flex-1 h-[1px] bg-[#EAE3D2]" />
              </div>

              {/* Google Sign In Button */}
              {googleLoginStatus !== 'disabled' && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isSubmitting}
                  className="w-full py-3 px-4 rounded-xl border border-[#EAE3D2] bg-[#FFFDF9] hover:bg-[#F5F0E4] text-stone-800 font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2.5 disabled:opacity-50 active:scale-[0.99]"
                >
                  {isGoogleLoading ? (
                    <span className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      <span>Connecting with Google...</span>
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              )}

              {/* Bottom Links: Forgot Password · Create Account / Sign In */}
              <div className="mt-6 flex items-center justify-center space-x-2 text-xs font-semibold">
                {authMode === 'signin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                    <span className="text-stone-400">&middot;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setLocalError(null);
                        clearAuthError();
                      }}
                      className="text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-stone-500">Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setLocalError(null);
                        clearAuthError();
                      }}
                      className="text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 9. Existing Trustpilot Review Badge & Metrics */}
            <div className="flex flex-col items-center space-y-2 text-center w-full pt-1">
              <div className="flex items-center space-x-2 bg-[#FFFDF9]/90 border border-[#EAE3D2] shadow-sm px-3.5 py-1.5 rounded-xl">
                {/* 5 Green Trustpilot Stars */}
                <div className="flex items-center space-x-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="w-4 h-4 bg-[#00b67a] flex items-center justify-center rounded-[2px]">
                      <Star className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  ))}
                </div>
                <span className="font-bold text-stone-900 text-xs">4.8</span>
                <div className="flex items-center text-[#00b67a] text-[11px] font-bold">
                  <span>★ Trustpilot</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 font-medium tracking-tight">
                Trusted by <span className="font-bold text-stone-800">thousands of resellers</span> &nbsp;&middot;&nbsp; 
                <span className="font-bold text-stone-800">2,487</span> services &nbsp;&middot;&nbsp; 
                <span className="font-bold text-stone-800">24/7</span> support
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      
      {/* 1. STATISTICS SECTION */}
      <div className="content-auto">
        <LoginStatsSection
          stats={{
            ordersDelivered: publicSettings?.statsOrdersDelivered || '25,000',
            registeredUsers: publicSettings?.statsRegisteredUsers || '10,000',
            activeServices: publicSettings?.statsActiveServices || '2,487',
            ordersToday: publicSettings?.statsOrdersToday || '1,188',
          }}
        />
      </div>

      {/* 2. AUTO-MOVING SOCIAL PLATFORMS MARQUEE */}
      <div className="content-auto">
        <LoginPlatformMarquee />
      </div>

      {/* 3. FAQ SECTION */}
      <div className="content-auto">
        <LoginFaqSection />
      </div>

      {/* 4. FOOTER */}
      <div className="content-auto">
        <LoginFooter
          websiteName={websiteName}
          websiteLogo={websiteLogo}
          onOpenCategory={handleOpenServicesCategory}
          onOpenAboutUs={() => setShowAboutModal(true)}
          onOpenBlog={() => setShowBlogModal(true)}
          onOpenApi={() => setShowApiModal(true)}
          onOpenChildPanels={() => setShowChildPanelsModal(true)}
          onOpenAffiliates={() => setShowAffiliatesModal(true)}
          onOpenTerms={() => setShowTermsModal(true)}
          onOpenPrivacy={() => setShowPrivacyModal(true)}
          onOpenSupport={() => setShowSupportModal(true)}
          onOpenContact={() => setShowContactModal(true)}
          onScrollToFaq={handleScrollToFaq}
        />
      </div>

      {/* Information & Policy Modals */}
      {(showAboutModal ||
        showBlogModal ||
        showApiModal ||
        showChildPanelsModal ||
        showAffiliatesModal ||
        showTermsModal ||
        showPrivacyModal ||
        showContactModal ||
        showSupportModal) && (
        <Suspense fallback={null}>
          <LoginModals
            showAboutModal={showAboutModal}
            setShowAboutModal={setShowAboutModal}
            showBlogModal={showBlogModal}
            setShowBlogModal={setShowBlogModal}
            showApiModal={showApiModal}
            setShowApiModal={setShowApiModal}
            showChildPanelsModal={showChildPanelsModal}
            setShowChildPanelsModal={setShowChildPanelsModal}
            showAffiliatesModal={showAffiliatesModal}
            setShowAffiliatesModal={setShowAffiliatesModal}
            showTermsModal={showTermsModal}
            setShowTermsModal={setShowTermsModal}
            showPrivacyModal={showPrivacyModal}
            setShowPrivacyModal={setShowPrivacyModal}
            showContactModal={showContactModal}
            setShowContactModal={setShowContactModal}
            showSupportModal={showSupportModal}
            setShowSupportModal={setShowSupportModal}
            websiteName={websiteName}
            customTerms={publicSettings?.termsOfService}
            customPrivacy={publicSettings?.privacyPolicy}
            onSelectAuthMode={handleSelectAuthModeFromModal}
          />
        </Suspense>
      )}

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-password-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#FFFDF9] border border-[#EAE3D2] rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2]">
                <h3 id="forgot-password-modal-title" className="text-base font-bold text-stone-900">Reset your password</h3>
                <button
                  type="button"
                  aria-label="Close password reset modal"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 rounded-lg hover:bg-[#F5F0E4] text-stone-400 hover:text-stone-700 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {forgotMessage ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-medium">{forgotMessage}</p>
                  <button
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotMessage(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer min-h-[44px]"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="py-4 space-y-4">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Enter the email address registered with your account. We'll send you verification instructions.
                  </p>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-email" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Registered Email
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-xs transition-all min-h-[44px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all cursor-pointer min-h-[44px]"
                  >
                    Send Reset Link
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Services Inspection Modal */}
      <AnimatePresence>
        {showServicesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowServicesModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="services-catalog-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-4xl bg-[#FFFDF9] border border-[#EAE3D2] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] z-10 text-left"
            >
              <div className="p-6 border-b border-[#EAE3D2] flex items-center justify-between">
                <div>
                  <h3 id="services-catalog-modal-title" className="text-lg font-bold text-stone-900 font-display">Services catalog</h3>
                  <p className="text-xs text-stone-500">Inspect the complete catalog of active social media marketing services.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close services catalog modal"
                  onClick={() => setShowServicesModal(false)}
                  className="p-1.5 rounded-xl hover:bg-[#F5F0E4] text-stone-400 hover:text-stone-700 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-[#FAF7EE] border-b border-[#EAE3D2] flex flex-col md:flex-row gap-3 items-center">
                <div className="w-full md:flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                  <input
                    type="text"
                    aria-label="Search active services"
                    placeholder="Search active services..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#EAE3D2] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-red-500 transition-colors shadow-sm min-h-[44px]"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar self-start md:self-center">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] ${
                        filterCategory === cat
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white hover:bg-[#F5F0E4] text-stone-600 border border-[#EAE3D2]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="rounded-2xl border border-[#EAE3D2] overflow-x-auto touch-scroll-x shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-[#EAE3D2] bg-[#FAF7EE] text-stone-600 text-xs font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Service Name</th>
                        <th className="px-4 py-3 text-right">Price per 1k</th>
                        <th className="px-4 py-3 text-center">Min / Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE3D2] text-xs">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((srv) => (
                          <tr key={srv.id} className="hover:bg-[#FAF7EE]/60 transition-colors">
                            <td className="px-4 py-3 text-stone-400 font-mono">#{srv.id}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-stone-900">{srv.name}</div>
                              {srv.description && (
                                <div className="text-[10px] text-stone-500 mt-0.5">{srv.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                              ${srv.pricePerThousand.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center text-stone-500 font-mono">
                              {srv.minAmount} / {srv.maxAmount}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-stone-400 font-mono">
                            No matching services found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-[#EAE3D2] bg-[#FAF7EE] flex justify-between items-center text-xs">
                <div className="text-stone-500 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-red-500" />
                  <span>Public Services Explorer</span>
                </div>
                <button
                  onClick={() => setShowServicesModal(false)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all cursor-pointer shadow-sm"
                >
                  Close Catalog
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

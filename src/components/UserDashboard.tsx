import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Package,
  RotateCcw,
  Wallet,
  Ticket,
  Users,
  FileCode,
  Globe,
  HelpCircle,
  Phone,
  BookOpen,
  Info,
  LogOut,
  Bell,
  Search,
  Check,
  Copy,
  ChevronDown,
  User as UserIcon,
  FileText,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Gift,
  Award,
  Sparkles,
  Zap,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Music,
  Send,
  Smartphone,
  CreditCard,
  QrCode,
  Menu,
  Star,
  Settings,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Plus,
  Headphones,
  DollarSign,
  Bot,
  Calendar,
  Database,
  Clock,
  Layers,
  Key,
  Crown,
} from 'lucide-react';
import { User, Category, Service, Order, Ticket as TicketType, Payment, Announcement, DashboardBanner } from '../types.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';
import { getCategoryIcon } from '../lib/icons.tsx';
import { ServiceCategoryIcon } from './ServiceCategoryIcon.tsx';
import {
  TikTokColorIcon,
  TikTokIcon,
  SpotifyIcon,
  TwitterXIcon,
  InstagramIcon,
  YouTubeIcon,
  TelegramIcon,
  FacebookIcon,
  WhatsAppIcon,
} from './BrandIcons.tsx';
import { AiChatBot } from './AiChatBot.tsx';
import { WhatsAppSupportButton } from './WhatsAppSupportButton.tsx';
import { AddFundsSection } from './AddFundsSection.tsx';
import { fetchPublicSettings, getApiUrl } from '../lib/api.ts';
import { getServiceSpeedAndTiming } from '../utils/serviceTiming.ts';

interface UserDashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
  onRefreshProfile: () => void;
  isAdmin: boolean;
  onToggleAdminView: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  token,
  onLogout,
  onRefreshProfile,
  isAdmin,
  onToggleAdminView,
}) => {
  const [activeTab, setActiveTab] = useState('new-order');
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('youthsmm_cached_categories');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [services, setServices] = useState<Service[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('youthsmm_cached_services');
        const stored = localStorage.getItem('youthsmm_cached_services_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [syncingOrders, setSyncingOrders] = useState(false);

  // Blogs & news
  const [blogs, setBlogs] = useState<any[]>([]);
  const [fetchingBlogs, setFetchingBlogs] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

  // Public Settings from Admin
  const [publicSettings, setPublicSettings] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('youthsmm_public_settings');
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return {};
  });

  // Theme State: YouthSMM Bold Red & Charcoal Dark (#101010, #1C1C1C, #FF3030)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('user_theme_mode');
    if (saved === 'cream' || saved === 'light') return false;
    return true; // Default to YouthSMM Bold Red & Dark Theme
  });

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('user_theme_mode', next ? 'dark' : 'cream');
  };

  // Currency State (Supports INR, USD, EUR, PKR)
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'PKR'>(() => {
    const saved = localStorage.getItem('smm_currency');
    return (saved as 'INR' | 'USD' | 'EUR' | 'PKR') || 'INR';
  });

  const currencySymbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    PKR: '₨',
  };

  const currencyRates: Record<string, number> = {
    INR: 1.0,   // Base is INR (1.0)
    USD: Number(publicSettings.inrToUsdRate) || 0.012, // 1 INR ~ 0.012 USD
    EUR: Number(publicSettings.inrToEurRate) || 0.011, // 1 INR ~ 0.011 EUR
    PKR: Number(publicSettings.inrToPkrRate) || 3.32,  // 1 INR ~ 3.32 PKR
  };

  const changeCurrency = (curr: 'INR' | 'USD' | 'EUR' | 'PKR') => {
    setCurrency(curr);
    localStorage.setItem('smm_currency', curr);
    setCurrencyDropdownOpen(false);
  };

  const formatAmount = (val: number | string | undefined) => {
    const num = Number(val) || 0;
    const rate = currencyRates[currency] || 1.0;
    const converted = num * rate;
    const locale = currency === 'PKR' ? 'en-PK' : currency === 'INR' ? 'en-IN' : 'en-US';
    return `${currencySymbols[currency]} ${converted.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatAmountFourDecimals = (val: number | string | undefined) => {
    const num = Number(val) || 0;
    const rate = currencyRates[currency] || 1.0;
    const converted = num * rate;
    const locale = currency === 'PKR' ? 'en-PK' : currency === 'INR' ? 'en-IN' : 'en-US';
    return `${currencySymbols[currency]} ${converted.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  // Header Dropdowns & Modals
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Multi-Banner list for User Dashboard Carousel (Supports Add New & Edit from Admin)
  const activePromoBanners: DashboardBanner[] = React.useMemo(() => {
    if (publicSettings.dashboardBanners) {
      try {
        const parsed = typeof publicSettings.dashboardBanners === 'string'
          ? JSON.parse(publicSettings.dashboardBanners)
          : publicSettings.dashboardBanners;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const enabled = parsed.filter((b: any) => b.status === 'enabled');
          if (enabled.length > 0) return enabled;
        }
      } catch (_) {}
    }
    if (publicSettings.bannerStatus !== 'disabled') {
      return [{
        id: 'default',
        status: 'enabled',
        badge: publicSettings.bannerBadge || 'FREE WALLET CREDIT',
        title: publicSettings.bannerTitle || `Earn up to ${formatAmount(200)} in free credit`,
        subtitle: publicSettings.bannerSubtitle || `Leave a review for ${formatAmount(25)} · make a promo video for ${formatAmount(200)}`,
        btnText: publicSettings.bannerBtnText || 'Earn now →',
        btnLink: publicSettings.bannerBtnLink || 'affiliate',
        theme: 'purple',
        icon: 'gift',
      }];
    }
    return [];
  }, [publicSettings, formatAmount]);

  // Auto-rotate promo banners every 6 seconds if multiple active
  useEffect(() => {
    if (activePromoBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % activePromoBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activePromoBanners.length]);

  const currentPromoBanner = activePromoBanners.length > 0
    ? activePromoBanners[activeBannerIndex % activePromoBanners.length]
    : null;

  const handleBannerClick = (banner: DashboardBanner) => {
    const link = banner.btnLink?.trim() || '';
    if (!link) {
      setShowRewardsModal(true);
      return;
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
    } else if (link === 'affiliate') {
      setActiveTab('affiliate');
    } else if (link === 'deposit' || link === 'add-funds') {
      setActiveTab('deposit');
    } else if (['new-order', 'orders', 'services', 'tickets', 'child-panel', 'api'].includes(link)) {
      setActiveTab(link as any);
    } else if (/^\+?\d{10,13}$/.test(link.replace(/[\s-]/g, ''))) {
      const cleanNum = link.replace(/\D/g, '');
      const waNum = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(`Hello, I want to claim offer: ${banner.title}`)}`, '_blank');
    } else {
      setShowRewardsModal(true);
    }
  };

  const getBannerGradient = (theme?: string) => {
    switch (theme) {
      case 'emerald':
        return 'from-emerald-900 via-teal-800 to-emerald-700';
      case 'rose':
        return 'from-rose-900 via-red-800 to-rose-700';
      case 'amber':
        return 'from-amber-800 via-orange-700 to-rose-700';
      case 'blue':
        return 'from-blue-900 via-indigo-800 to-cyan-800';
      case 'purple':
      default:
        return 'from-purple-800 via-indigo-700 to-purple-700';
    }
  };

  const renderBannerIconItem = (iconName?: string) => {
    switch (iconName) {
      case 'sparkles':
        return <Sparkles className="w-7 h-7" />;
      case 'zap':
        return <Zap className="w-7 h-7 text-yellow-300" />;
      case 'flame':
        return <Zap className="w-7 h-7 text-red-300" />;
      case 'wallet':
        return <Wallet className="w-7 h-7" />;
      case 'tag':
        return <Award className="w-7 h-7" />;
      case 'gift':
      default:
        return <Gift className="w-7 h-7" />;
    }
  };
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);

  // Child Panels and Refill History
  const [childPanelsList, setChildPanelsList] = useState<any[]>([]);
  const [childPanelForm, setChildPanelForm] = useState({ domain: '', currency: 'INR', adminUsername: '', adminPassword: '' });
  const [orderingChildPanel, setOrderingChildPanel] = useState(false);
  const [refillRequestsList, setRefillRequestsList] = useState<any[]>([]);

  // Order History Filter & Search states
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [copiedOrderId, setCopiedOrderId] = useState<number | null>(null);
  const [copiedDetailsId, setCopiedDetailsId] = useState<number | null>(null);
  const [requestingRefill, setRequestingRefill] = useState<number | null>(null);

  // Order & UI Form States
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [newOrder, setNewOrder] = useState({ categoryId: '', serviceId: '', link: '', quantity: '', coupon: '' });
  const [placedOrderConfirmation, setPlacedOrderConfirmation] = useState<{
    id: number;
    serviceName?: string;
    link?: string;
    quantity?: number;
    charge?: number;
    status?: string;
    providerOrderId?: string | null;
    providerName?: string;
  } | null>(null);
  const [orderServiceSearch, setOrderServiceSearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);
  const serviceDropdownRef = React.useRef<HTMLDivElement>(null);
  const quickSearchRef = React.useRef<HTMLDivElement>(null);
  const isSubmittingOrderRef = React.useRef(false);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
      if (quickSearchRef.current && !quickSearchRef.current.contains(event.target as Node)) {
        setIsQuickSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [massInput, setMassInput] = useState('');
  const [depositCurrency, setDepositCurrency] = useState<'INR' | 'USD'>('INR');
  const [addFunds, setAddFunds] = useState({ amount: '', method: 'UPI' });
  const [bharatpeUtr, setBharatpeUtr] = useState('');
  const [bharatpeAmount, setBharatpeAmount] = useState('');
  const [bharatpeActiveQr, setBharatpeActiveQr] = useState(false);
  const [bpDepositLoading, setBpDepositLoading] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Tickets
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');

  // API Key & Custom Provider
  const [customProviderUrl, setCustomProviderUrl] = useState(user.customProviderUrl || '');
  const [customProviderKey, setCustomProviderKey] = useState(user.customProviderKey || '');
  const [updatingProvider, setUpdatingProvider] = useState(false);
  const [generatingApiKey, setGeneratingApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Search & Filter for Services Tab
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');

  // UI Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState({ referralCode: '', earnings: 0, visits: 0 });

  // Public Settings Fetch & Real-Time Sync
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const stored = localStorage.getItem('youthsmm_public_settings');
        if (stored) setPublicSettings(JSON.parse(stored));
      } catch (_) {}
    };

    fetchPublicSettings().then((data) => {
      if (data) setPublicSettings(data);
    });

    const handleUpdate = () => {
      syncFromStorage();
      fetchPublicSettings().then((data) => {
        if (data) setPublicSettings(data);
      });
    };

    window.addEventListener('youthsmm_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const handleCatalogUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('youthsmm_catalog_updated', handleCatalogUpdate);

    return () => {
      window.removeEventListener('youthsmm_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('youthsmm_catalog_updated', handleCatalogUpdate);
    };
  }, []);

  // Sync custom provider inputs
  useEffect(() => {
    setCustomProviderUrl(user.customProviderUrl || '');
    setCustomProviderKey(user.customProviderKey || '');
  }, [user]);

  // Initial Data Fetch
  useEffect(() => {
    fetchDashboardData();
  }, [token, activeTab]);

  const ordersRef = useRef<Order[]>(orders);
  ordersRef.current = orders;

  // Real-time automatic status synchronization with SMM Provider
  // Automatically polls every 10s while on the Orders tab or when active in-progress orders exist
  useEffect(() => {
    if (!token) return;

    const pollInterval = setInterval(async () => {
      try {
        const currentOrders = ordersRef.current;
        const hasActiveOrders = currentOrders.some(o => {
          const s = (o.status || '').toLowerCase();
          return s === 'processing' || s === 'pending' || s === 'inprogress' || s === 'in_progress';
        });

        if (activeTab === 'orders' || hasActiveOrders) {
          const headers = { Authorization: `Bearer ${token}` };
          const res = await fetch('/api/user/orders', { headers });
          if (res.ok) {
            const latestOrders = await res.json();
            setOrders(latestOrders);
          }
        }
      } catch (err) {
        // Silent background polling
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [token, activeTab]);

  const safeJson = async (res: Response) => {
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  };

  const handleSyncOrders = async () => {
    if (syncingOrders || !token) return;
    setSyncingOrders(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/user/orders/sync', {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.orders) {
          setOrders(data.orders);
        }
        if (data.synced > 0) {
          showSuccess(`${data.synced} order(s) updated to latest provider status!`);
        } else {
          showSuccess('All orders are synchronized with the SMM provider.');
        }
      } else {
        await fetchDashboardData();
      }
    } catch (err) {
      await fetchDashboardData();
    } finally {
      setSyncingOrders(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const authToken = token || localStorage.getItem('smm_auth_token') || localStorage.getItem('youthsmm_token') || localStorage.getItem('auth_token') || '';
      const headers = { Authorization: `Bearer ${authToken}` };

      // Fast-load categories and services immediately & independently for sub-50ms appearance
      const loadCatalogFast = () => {
        fetch('/api/user/categories', { headers, cache: 'no-store' })
          .then(async res => {
            if (res.ok) {
              const data = await safeJson(res);
              if (Array.isArray(data)) {
                setCategories(data);
                try { localStorage.setItem('youthsmm_cached_categories', JSON.stringify(data)); } catch (_) {}
              }
            }
          })
          .catch(e => console.warn('Catalog categories fetch error:', e));

        fetch('/api/user/services', { headers, cache: 'no-store' })
          .then(async res => {
            if (res.ok) {
              const data = await safeJson(res);
              if (Array.isArray(data)) {
                setServices(data);
                try {
                  localStorage.removeItem('youthsmm_cached_services');
                  localStorage.setItem('youthsmm_cached_services_v2', JSON.stringify(data));
                } catch (_) {}
              }
            }
          })
          .catch(e => console.warn('Catalog services fetch error:', e));
      };

      if (activeTab === 'new-order' || activeTab === 'mass-order') {
        loadCatalogFast();

        // Background non-blocking fetch for secondary widgets
        fetch('/api/user/announcements', { headers })
          .then(async r => { if (r.ok) setAnnouncements(await safeJson(r)); })
          .catch(() => {});
        fetch('/api/user/favorites', { headers })
          .then(async r => { if (r.ok) setFavorites(await safeJson(r)); })
          .catch(() => {});
        fetch('/api/user/orders', { headers })
          .then(async r => { if (r.ok) setOrders(await safeJson(r)); })
          .catch(() => {});
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/user/orders', { headers });
        if (res.ok) setOrders(await safeJson(res));
      } else if (activeTab === 'add-funds') {
        const res = await fetch('/api/user/payments', { headers });
        if (res.ok) setPayments(await safeJson(res));
      } else if (activeTab === 'tickets') {
        const res = await fetch('/api/user/tickets', { headers });
        if (res.ok) setTickets(await safeJson(res));
      } else if (activeTab === 'services') {
        loadCatalogFast();
        fetch('/api/user/favorites', { headers })
          .then(async r => { if (r.ok) setFavorites(await safeJson(r)); })
          .catch(() => {});
      } else if (activeTab === 'affiliate') {
        const res = await fetch('/api/user/affiliate', { headers });
        if (res.ok) setAffiliateCode(await safeJson(res));
      } else if (activeTab === 'child-panels') {
        const res = await fetch('/api/user/child-panels', { headers });
        if (res.ok) setChildPanelsList(await safeJson(res));
      } else if (activeTab === 'refill-history') {
        const res = await fetch('/api/user/refill-requests', { headers });
        if (res.ok) setRefillRequestsList(await safeJson(res));
      } else if (activeTab === 'blogs') {
        fetchUserBlogs();
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchUserBlogs = async () => {
    setFetchingBlogs(true);
    try {
      const res = await fetch('/api/blogs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBlogs(await safeJson(res));
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setFetchingBlogs(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // Helper to calculate order metrics: percentage, speed, and counters
  const getOrderMetrics = (ord: Order) => {
    const quantity = Number(ord.quantity) || 1;
    const start = Number(ord.startCount) || 0;
    const remains = ord.remains !== undefined && ord.remains !== null ? Number(ord.remains) : 0;
    
    let percentage = 0;
    const normStatus = (ord.status || 'pending').toLowerCase();
    
    if (normStatus === 'completed') {
      percentage = 100;
    } else if (normStatus === 'cancelled' || normStatus === 'refunded') {
      percentage = 0;
    } else if (normStatus === 'pending') {
      percentage = 8;
    } else if (normStatus === 'processing' || normStatus === 'inprogress' || normStatus === 'in_progress') {
      if (remains > 0 && remains < quantity) {
        percentage = Math.min(99, Math.max(15, Math.round(((quantity - remains) / quantity) * 100)));
      } else {
        percentage = 65; // Active delivery speed
      }
    } else if (normStatus === 'partial') {
      percentage = Math.min(99, Math.max(0, Math.round(((quantity - remains) / quantity) * 100)));
    }

    // End count calculation
    let end = start;
    if (normStatus === 'completed') {
      end = start + quantity;
    } else if (remains < quantity) {
      end = start + (quantity - remains);
    } else {
      end = start;
    }

    // Speed extraction
    let speedText = 'Instant Speed (10k-50k/Day)';
    const serviceLower = (ord.serviceName || '').toLowerCase();
    const speedMatch = ord.serviceName?.match(/\(([^)]*(?:day|hour|hr|instant|speed|k\/d|k\/day)[^)]*)\)/i);
    if (speedMatch && speedMatch[1]) {
      speedText = speedMatch[1];
    } else if (serviceLower.includes('instant')) {
      speedText = '⚡ Instant Turbo (0-15 Min)';
    } else if (serviceLower.includes('100k')) {
      speedText = '⚡ 100k/Day Ultra Fast';
    } else if (serviceLower.includes('50k')) {
      speedText = '⚡ 50k/Day High Speed';
    } else if (serviceLower.includes('20k') || serviceLower.includes('10k')) {
      speedText = '⚡ 10k-20k/Day Fast';
    } else if (serviceLower.includes('drip') || serviceLower.includes('gradual')) {
      speedText = '💧 Drip-Feed Gradual';
    } else if (normStatus === 'completed') {
      speedText = '⚡ Instant High Speed';
    }

    return {
      percentage,
      start,
      end,
      remains,
      speedText,
      normStatus
    };
  };

  const copyOrderId = (id: number) => {
    navigator.clipboard.writeText(String(id));
    setCopiedOrderId(id);
    showSuccess(`Order ID #${id} copied!`);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const copyOrderDetails = (ord: Order) => {
    const text = `Order ID: #${ord.id}\nService: ${ord.serviceName || 'SMM Service'}\nLink: ${ord.link}\nQuantity: ${ord.quantity}\nCharge: ${formatAmount(ord.charge)}\nStatus: ${ord.status}\nDate: ${ord.createdAt}`;
    navigator.clipboard.writeText(text);
    setCopiedDetailsId(ord.id);
    showSuccess(`Order #${ord.id} details copied to clipboard!`);
    setTimeout(() => setCopiedDetailsId(null), 2000);
  };

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOrders = (filtered: Order[]) => {
    if (selectedOrderIds.length === filtered.length && filtered.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filtered.map(o => o.id));
    }
  };

  const handleRequestRefill = async (orderId: number) => {
    try {
      setRequestingRefill(orderId);
      const res = await fetch(`/api/orders/${orderId}/refill`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('youthsmm_token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || `Refill requested for Order #${orderId}`);
        fetchDashboardData();
      } else {
        showError(data.error || 'Failed to request refill.');
      }
    } catch (err: any) {
      showError(err.message || 'Error requesting refill');
    } finally {
      setRequestingRefill(null);
    }
  };

  // Greeting helper based on exact local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return { text: 'Good morning', emoji: '🌅' };
    if (hour >= 12 && hour < 17) return { text: 'Good afternoon', emoji: '☀️' };
    if (hour >= 17 && hour < 22) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
  };

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingOrderRef.current) return;
    if (!newOrder.serviceId || !newOrder.link || !newOrder.quantity) {
      showError('Please select a service and provide a valid target link & quantity.');
      return;
    }
    isSubmittingOrderRef.current = true;

    let cleanLink = newOrder.link.trim();
    if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      if (cleanLink.startsWith('@')) {
        cleanLink = `https://www.instagram.com/${cleanLink.replace(/^@+/, '')}`;
      } else if (!cleanLink.includes('/')) {
        cleanLink = `https://www.instagram.com/${cleanLink}`;
      } else {
        cleanLink = `https://${cleanLink}`;
      }
    }

    setLoading(true);
    const authToken = token || localStorage.getItem('smm_auth_token') || localStorage.getItem('youthsmm_token') || localStorage.getItem('auth_token') || '';
    try {
      const res = await fetch('/api/orders/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          serviceId: parseInt(newOrder.serviceId),
          link: cleanLink,
          quantity: parseInt(newOrder.quantity),
          couponCode: newOrder.coupon,
        }),
      });

      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      if (res.ok && data.success) {
        showSuccess(data.message || 'Order placed successfully & active in progress!');
        if (data.order) {
          setPlacedOrderConfirmation({
            id: data.order.id,
            serviceName: data.order.serviceName,
            link: data.order.link,
            quantity: data.order.quantity,
            charge: data.order.charge,
            status: data.order.status,
            providerOrderId: data.providerOrderId || data.order.providerOrderId,
            providerName: data.providerName,
          });
        }
        setNewOrder({ categoryId: '', serviceId: '', link: '', quantity: '', coupon: '' });
        onRefreshProfile();
        fetchDashboardData();
      } else {
        showError(data.error || 'Unable to place order. Please check your balance and try again.');
      }
    } catch (err: any) {
      showError(err?.message || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSubmittingOrderRef.current = false;
      }, 1000);
    }
  };

  // Mass Order Handler
  const handleMassOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!massInput.trim()) {
      showError('Input cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders/mass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ massInput }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Mass orders processed successfully!');
        setMassInput('');
        onRefreshProfile();
        fetchDashboardData();
      } else {
        showError(data.error || 'Failed to process mass orders.');
      }
    } catch (err) {
      showError('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Add Funds Handler
  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(addFunds.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showError('Please enter a valid deposit amount.');
      return;
    }
    const finalAmountDb = depositCurrency === 'INR' ? amountVal : (amountVal * 83.0);
    const finalMethodLabel = `${addFunds.method} (${depositCurrency})`;

    setLoading(true);
    try {
      const res = await fetch('/api/user/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: finalAmountDb,
          method: finalMethodLabel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || 'Deposit completed!');
        setAddFunds({ amount: '', method: 'UPI' });
        onRefreshProfile();
        fetchDashboardData();
      } else {
        showError(data.error || 'Payment transaction failed.');
      }
    } catch (err) {
      showError('Deposit failed.');
    } finally {
      setLoading(false);
    }
  };

  // BharatPe UPI QR Deposit
  const handleBharatpeDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(bharatpeAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showError('Please enter a valid deposit amount.');
      return;
    }
    const finalAmountDb = depositCurrency === 'INR' ? amountVal : (amountVal * 83.0);

    if (!bharatpeUtr || !/^\d{12}$/.test(bharatpeUtr)) {
      showError('Please enter a valid 12-digit UPI Transaction Ref (UTR).');
      return;
    }
    setBpDepositLoading(true);
    try {
      const res = await fetch('/api/user/add-funds-bharatpe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: finalAmountDb,
          utr: bharatpeUtr,
          paymentMethod: 'BharatPe UPI QR'
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || 'Deposit successful!');
        setBharatpeUtr('');
        setBharatpeAmount('');
        setBharatpeActiveQr(false);
        onRefreshProfile();
        fetchDashboardData();
      } else {
        showError(data.error || 'Failed to verify transaction.');
      }
    } catch (err) {
      showError('Failed to verify payment.');
    } finally {
      setBpDepositLoading(false);
    }
  };

  // Create Ticket Handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) {
      showError('Subject and Message are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ticketForm),
      });
      if (res.ok) {
        showSuccess('Support ticket created successfully!');
        setTicketForm({ subject: '', message: '' });
        fetchDashboardData();
      } else {
        showError('Failed to create ticket.');
      }
    } catch (err) {
      showError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  // Generate API Key Handler
  const handleGenerateApiKey = async () => {
    setGeneratingApiKey(true);
    try {
      const res = await fetch('/api/user/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('New API Key generated successfully!');
        onRefreshProfile();
      } else {
        showError(data.error || 'Failed to generate API Key.');
      }
    } catch (err) {
      showError('Error generating API Key.');
    } finally {
      setGeneratingApiKey(false);
    }
  };

  // Baseline preset categories is empty so user panel is 100% clean when catalog is empty/deleted
  const DEFAULT_PLATFORM_CATEGORIES: Category[] = [];

  // Helper to match text or tokens against selected platform with aliases (fb, insta, yt, etc.)
  const isMatchingPlatform = (text?: string | null, platformId?: string | null): boolean => {
    if (!platformId || platformId === 'All') return true;
    if (!text) return false;
    const t = text.toLowerCase();
    const p = platformId.toLowerCase();

    if (p === 'facebook') {
      return (
        t.includes('facebook') ||
        t.includes('face book') ||
        t.includes('face-book') ||
        t.includes('meta') ||
        t.includes('fanpage') ||
        t.includes('fan page') ||
        t.includes('page like') ||
        t.includes('page follower') ||
        /\bfb\b/i.test(t) ||
        /(?:^|[^a-z0-9])fb(?:[^a-z0-9]|$)/i.test(t) ||
        t.includes('fb ') ||
        t.includes(' fb') ||
        t.includes('fb-') ||
        t.includes('fb_') ||
        t.includes('fb/') ||
        t.includes('[fb') ||
        t.includes('(fb') ||
        t.startsWith('fb') ||
        t === 'fb'
      );
    }
    if (p === 'instagram') {
      return (
        t.includes('instagram') ||
        t.includes('insta') ||
        /\big\b/i.test(t) ||
        t.includes('ig ') ||
        t.includes(' ig') ||
        t.includes('[ig') ||
        t.includes('(ig') ||
        t.includes('reels')
      );
    }
    if (p === 'youtube') {
      return (
        t.includes('youtube') ||
        /\byt\b/i.test(t) ||
        t.includes('yt ') ||
        t.includes(' yt') ||
        t.includes('[yt') ||
        t.includes('(yt') ||
        t.includes('shorts')
      );
    }
    if (p === 'telegram') {
      return (
        t.includes('telegram') ||
        /\btg\b/i.test(t) ||
        t.includes('tg ') ||
        t.includes(' tg') ||
        t.includes('[tg') ||
        t.includes('(tg') ||
        t.includes('channel')
      );
    }
    if (p === 'twitter') {
      return (
        t.includes('twitter') ||
        t.includes('𝕏') ||
        t.includes('x.com') ||
        t.includes('tweet') ||
        /\bx\b/i.test(t)
      );
    }
    if (p === 'tiktok') {
      return t.includes('tiktok') || t.includes('tik tok') || /\btt\b/i.test(t);
    }
    if (p === 'spotify') {
      return t.includes('spotify') || t.includes('song') || t.includes('podcast');
    }

    return t.includes(p);
  };

  // Complete list of categories cleanly reflecting active categories and services from the database
  const allCategories = useMemo(() => {
    const list = [...categories];
    services.forEach(s => {
      const sCatId = s.categoryId ?? (s as any).category_id;
      const exists = list.some(c => String(c.id) === String(sCatId) || (s.categoryName && c.name.toLowerCase() === s.categoryName.toLowerCase()));
      if (!exists && sCatId) {
        const catName = s.categoryName || `Category #${sCatId}`;
        list.push({
          id: Number(sCatId),
          name: catName,
          status: 'active',
          sortOrder: list.length + 1,
          icon: (s as any).categoryIcon || (s as any).category_icon || s.icon || 'globe',
          createdAt: new Date().toISOString(),
        });
      }
    });
    return list;
  }, [categories, services]);

  const isServiceInPlatform = (s: Service, platformId: string): boolean => {
    if (!platformId || platformId === 'All') return true;
    if (isMatchingPlatform(s.name, platformId)) return true;
    if (isMatchingPlatform(s.description, platformId)) return true;
    if (isMatchingPlatform(s.icon, platformId)) return true;
    if (s.categoryName && isMatchingPlatform(s.categoryName, platformId)) return true;
    if ((s as any).category_name && isMatchingPlatform((s as any).category_name, platformId)) return true;
    if ((s as any).category && isMatchingPlatform((s as any).category, platformId)) return true;
    if ((s as any).categoryIcon && isMatchingPlatform((s as any).categoryIcon, platformId)) return true;
    if ((s as any).category_icon && isMatchingPlatform((s as any).category_icon, platformId)) return true;
    const sCatId = s.categoryId ?? (s as any).category_id;
    if (sCatId !== undefined && sCatId !== null) {
      const parentCat = allCategories.find(c => String(c.id) === String(sCatId)) ||
        categories.find(c => String(c.id) === String(sCatId));
      if (parentCat) {
        if (isMatchingPlatform(parentCat.name, platformId)) return true;
        if (isMatchingPlatform(parentCat.icon, platformId)) return true;
      }
    }
    return false;
  };

  const isCategoryInPlatform = (c: Category, platformId: string): boolean => {
    if (!platformId || platformId === 'All') return true;
    if (isMatchingPlatform(c.name, platformId)) return true;
    if (isMatchingPlatform(c.icon, platformId)) return true;
    // Category matches if ANY service inside it belongs to this platform!
    return services.some(s => {
      const sCatId = s.categoryId ?? (s as any).category_id;
      const idMatch = sCatId !== undefined && sCatId !== null && String(sCatId) === String(c.id);
      const nameMatch = Boolean(
        (s.categoryName && c.name && s.categoryName.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
        ((s as any).category_name && c.name && (s as any).category_name.trim().toLowerCase() === c.name.trim().toLowerCase()) ||
        ((s as any).category && c.name && (s as any).category.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      return (idMatch || nameMatch) && isServiceInPlatform(s, platformId);
    });
  };

  // Memoized Selected Category & Service calculation
  const selectedCategory = useMemo(() => {
    if (!newOrder.categoryId) return null;
    return allCategories.find(c => String(c.id) === String(newOrder.categoryId));
  }, [allCategories, newOrder.categoryId]);

  const selectedService = useMemo(() => {
    return services.find(s => s.id === Number(newOrder.serviceId));
  }, [services, newOrder.serviceId]);

  const estimatedPrice = useMemo(() => {
    return selectedService
      ? ((Number(newOrder.quantity) || 0) / 1000) * selectedService.pricePerThousand
      : 0;
  }, [selectedService, newOrder.quantity]);

  const selectedServiceTiming = useMemo(() => {
    return selectedService
      ? getServiceSpeedAndTiming(
          {
            id: selectedService.id,
            name: selectedService.name,
            description: selectedService.description,
            categoryName: selectedCategory?.name || selectedService.categoryName,
          },
          Number(newOrder.quantity) || undefined
        )
      : null;
  }, [selectedService, selectedCategory, newOrder.quantity]);

  // Filtered categories by platform
  const filteredCategories = useMemo(() => {
    if (selectedPlatform === 'All') return allCategories;
    return allCategories.filter(c => isCategoryInPlatform(c, selectedPlatform));
  }, [allCategories, services, selectedPlatform]);

  const displayedCategories = useMemo(() => {
    return filteredCategories;
  }, [filteredCategories]);

  // Filtered services for new order
  const availableServices = useMemo(() => {
    if (newOrder.categoryId) {
      const catId = String(newOrder.categoryId);
      const catServices = services.filter(s => {
        const sCatId = String(s.categoryId ?? (s as any).category_id ?? '');
        return sCatId === catId;
      });
      if (catServices.length > 0) {
        if (selectedPlatform !== 'All') {
          const platformFiltered = catServices.filter(s => isServiceInPlatform(s, selectedPlatform));
          if (platformFiltered.length > 0) return platformFiltered;
        }
        return catServices;
      }
    }
    if (selectedPlatform !== 'All') {
      return services.filter(s => isServiceInPlatform(s, selectedPlatform));
    }
    return services;
  }, [services, allCategories, newOrder.categoryId, selectedPlatform]);

  const displayedServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return availableServices;
    const q = serviceSearchQuery.toLowerCase().trim();
    return availableServices.filter(s =>
      s.name.toLowerCase().includes(q) || String(s.id).includes(q)
    );
  }, [availableServices, serviceSearchQuery]);

  // Quick search matching services & categories above Category step
  const matchingQuickServices = useMemo(() => {
    const q = quickSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return services.filter(s => {
      const cat = categories.find(c => c.id === s.categoryId);
      return (
        s.name.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        (cat && cat.name.toLowerCase().includes(q))
      );
    });
  }, [services, categories, quickSearchQuery]);

  // Handle Platform selection: auto-selects matching category and service into the form boxes
  const handleSelectPlatform = (platformId: string) => {
    setSelectedPlatform(platformId);

    // 1. Get filtered categories for this platform
    const platformCategories = platformId === 'All'
      ? allCategories
      : allCategories.filter(c => isCategoryInPlatform(c, platformId));

    if (platformCategories.length > 0) {
      const targetCat = platformCategories[0];
      const targetCatId = String(targetCat.id);

      // Find services belonging to this category and platform
      const catServices = services.filter(s => {
        const sCatId = String(s.categoryId ?? (s as any).category_id ?? '');
        const matchesCat = sCatId === targetCatId;
        const matchesPlat = platformId === 'All' || isServiceInPlatform(s, platformId);
        return matchesCat && matchesPlat;
      });

      const targetSrv = catServices.length > 0
        ? catServices[0]
        : (platformId === 'All'
            ? services[0]
            : services.find(s => isServiceInPlatform(s, platformId)));

      setNewOrder(prev => ({
        ...prev,
        categoryId: targetCatId,
        serviceId: targetSrv ? String(targetSrv.id) : '',
      }));
    } else {
      // If no category explicitly matched, see if any service matches this platform directly
      const directSrv = platformId === 'All'
        ? services[0]
        : services.find(s => isServiceInPlatform(s, platformId));

      if (directSrv) {
        const sCatId = directSrv.categoryId ?? (directSrv as any).category_id;
        setNewOrder(prev => ({
          ...prev,
          categoryId: sCatId ? String(sCatId) : '',
          serviceId: String(directSrv.id),
        }));
      } else {
        setNewOrder(prev => ({ ...prev, categoryId: '', serviceId: '' }));
      }
    }
  };

  // Auto-populate Category & Service on load or when catalog loads if not yet selected
  useEffect(() => {
    if (services.length > 0 && (!newOrder.categoryId || !newOrder.serviceId)) {
      const platformCategories = selectedPlatform === 'All'
        ? allCategories
        : allCategories.filter(c => isCategoryInPlatform(c, selectedPlatform));

      if (platformCategories.length > 0) {
        const targetCat = platformCategories[0];
        const targetCatId = String(targetCat.id);
        const catServices = services.filter(s => {
          const sCatId = String(s.categoryId ?? (s as any).category_id ?? '');
          const matchesCat = sCatId === targetCatId;
          const matchesPlat = selectedPlatform === 'All' || isServiceInPlatform(s, selectedPlatform);
          return matchesCat && matchesPlat;
        });

        const targetSrv = catServices.length > 0
          ? catServices[0]
          : (selectedPlatform === 'All'
              ? services[0]
              : services.find(s => isServiceInPlatform(s, selectedPlatform)));

        setNewOrder(prev => {
          if (prev.categoryId && prev.serviceId && services.some(s => s.id === Number(prev.serviceId))) {
            return prev;
          }
          return {
            ...prev,
            categoryId: targetCatId,
            serviceId: targetSrv ? String(targetSrv.id) : '',
          };
        });
      } else {
        const directSrv = selectedPlatform === 'All'
          ? services[0]
          : services.find(s => isServiceInPlatform(s, selectedPlatform));
        if (directSrv) {
          const sCatId = directSrv.categoryId ?? (directSrv as any).category_id;
          setNewOrder(prev => {
            if (prev.categoryId && prev.serviceId && services.some(s => s.id === Number(prev.serviceId))) {
              return prev;
            }
            return {
              ...prev,
              categoryId: sCatId ? String(sCatId) : '',
              serviceId: String(directSrv.id),
            };
          });
        }
      }
    }
  }, [services, allCategories, selectedPlatform]);


  // Calculate user total orders & total spent
  const totalOrdersCount = orders.length;
  const calculatedTotalSpent = useMemo(() => {
    return orders.reduce((acc, o) => acc + (Number(o.charge) || 0), 0);
  }, [orders]);
  const totalSpentFormatted = useMemo(() => formatAmount(calculatedTotalSpent), [formatAmount, calculatedTotalSpent]);

  // Memoized Order History calculations
  const normOrders = useMemo(() => {
    return orders.map(ord => ({
      ...ord,
      ...getOrderMetrics(ord)
    }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearchQuery.trim().toLowerCase();
    return normOrders.filter(ord => {
      const matchesSearch = !q ||
        String(ord.id).includes(q) ||
        (ord.serviceName || '').toLowerCase().includes(q) ||
        (ord.link || '').toLowerCase().includes(q);
      
      if (!matchesSearch) return false;

      if (orderStatusFilter === 'all') return true;
      if (orderStatusFilter === 'completed') return ord.normStatus === 'completed';
      if (orderStatusFilter === 'processing') return ['processing', 'inprogress', 'in_progress'].includes(ord.normStatus);
      if (orderStatusFilter === 'pending') return ord.normStatus === 'pending';
      if (orderStatusFilter === 'partial') return ord.normStatus === 'partial';
      if (orderStatusFilter === 'cancelled') return ['cancelled', 'refunded'].includes(ord.normStatus);
      return true;
    });
  }, [normOrders, orderSearchQuery, orderStatusFilter]);

  const orderCounts = useMemo(() => {
    return {
      all: orders.length,
      completed: orders.filter(o => (o.status || '').toLowerCase() === 'completed').length,
      processing: orders.filter(o => ['processing', 'inprogress', 'in_progress'].includes((o.status || '').toLowerCase())).length,
      pending: orders.filter(o => (o.status || '').toLowerCase() === 'pending').length,
      partial: orders.filter(o => (o.status || '').toLowerCase() === 'partial').length,
      cancelled: orders.filter(o => ['cancelled', 'refunded'].includes((o.status || '').toLowerCase())).length,
    };
  }, [orders]);

  // Memoized Services Catalog filter & speed computation
  const filteredCatalogServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    const list = q ? services.filter(s => s.name.toLowerCase().includes(q) || String(s.id).includes(q)) : services;
    return list.map(s => ({
      ...s,
      timing: getServiceSpeedAndTiming(s)
    }));
  }, [services, serviceSearch]);

  // Platform quick tabs with animated logo configurations
  const platforms = [
    { id: 'All', label: 'All Platforms', icon: Sparkles, color: 'from-amber-500 to-red-500', activeBg: 'bg-gradient-to-r from-red-600 to-rose-600', iconColor: 'text-amber-500 dark:text-amber-400' },
    { id: 'TikTok', label: 'TikTok', icon: TikTokColorIcon, color: 'from-black via-zinc-900 to-black', activeBg: 'bg-gradient-to-r from-black via-zinc-900 to-black', iconColor: 'text-[#FE2C55]' },
    { id: 'Instagram', label: 'Instagram', icon: InstagramIcon, color: 'from-[#f09433] via-[#dc2743] to-[#bc1888]', activeBg: 'bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]', iconColor: 'text-[#E1306C]' },
    { id: 'YouTube', label: 'YouTube', icon: YouTubeIcon, color: 'from-red-600 to-red-700', activeBg: 'bg-gradient-to-r from-red-600 to-red-700', iconColor: 'text-[#FF0000]' },
    { id: 'Telegram', label: 'Telegram', icon: TelegramIcon, color: 'from-sky-400 to-blue-500', activeBg: 'bg-gradient-to-r from-sky-500 to-blue-600', iconColor: 'text-[#229ED9]' },
    { id: 'Facebook', label: 'Facebook', icon: FacebookIcon, color: 'from-blue-600 to-blue-700', activeBg: 'bg-gradient-to-r from-blue-600 to-blue-800', iconColor: 'text-[#1877F2]' },
    { id: 'Spotify', label: 'Spotify', icon: SpotifyIcon, color: 'from-emerald-500 to-green-600', activeBg: 'bg-gradient-to-r from-emerald-600 to-green-700', iconColor: 'text-[#1DB954]' },
    { id: 'Twitter', label: 'Twitter / 𝕏', icon: TwitterXIcon, color: 'from-gray-700 to-gray-900', activeBg: 'bg-gradient-to-r from-gray-900 to-black', iconColor: 'text-gray-900 dark:text-white' },
  ];

  // Navigation Items
  const navItems = [
    { id: 'new-order', label: 'New Order', icon: Zap, iconBg: 'bg-red-500 text-white' },
    { id: 'orders', label: 'Orders', icon: Package, iconBg: 'bg-indigo-600 text-white' },
    { id: 'services', label: 'Services', icon: List, iconBg: 'bg-sky-500 text-white' },
    { id: 'add-funds', label: 'Add Funds', icon: Wallet, iconBg: 'bg-emerald-500 text-white' },
    { id: 'ai-chat', label: 'AI Chat Support', icon: Bot, iconBg: 'bg-gradient-to-r from-red-600 to-rose-600 text-white' },
    { id: 'tickets', label: 'Tickets', icon: Ticket, iconBg: 'bg-rose-400 text-white' },
    { id: 'api-docs', label: 'Api', icon: FileCode, iconBg: 'bg-red-600 text-white' },
    { id: 'refill-history', label: 'Refill History', icon: RotateCcw, iconBg: 'bg-amber-500 text-white' },
    { id: 'child-panels', label: 'Child Panels', icon: Globe, iconBg: 'bg-teal-500 text-white' },
    { id: 'affiliate', label: 'Affiliates', icon: Users, iconBg: 'bg-purple-500 text-white' },
    { id: 'blogs', label: 'Blogs & News', icon: BookOpen, iconBg: 'bg-pink-500 text-white' },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, iconBg: 'bg-blue-500 text-white' },
    { id: 'contact-us', label: 'Support Channels', icon: Phone, iconBg: 'bg-emerald-600 text-white' },
  ];

  const currentTabObj = navItems.find(n => n.id === activeTab) || navItems[0];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#101010] text-gray-100' : 'bg-[#FAF7EE] text-stone-800'} flex flex-col font-sans selection:bg-[#FF3030] selection:text-white transition-colors duration-200`}>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR */}
      {/* ========================================================================= */}
      <header className={`w-full ${isDarkMode ? 'bg-[#141414] border-b border-[#242424] text-white shadow-md shadow-black/40' : 'bg-[#FFFDF9] border-b border-[#EAE3D2] text-stone-800'} px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40 select-none shadow-xs`}>
        {/* Left Side: Brand Logo & Current Breadcrumb */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-1.5 sm:p-2 rounded-xl border transition-all shadow-xs shrink-0 ${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-gray-200 hover:bg-[#252525]' : 'bg-white border-[#EAE3D2] text-stone-700 hover:bg-[#F5F0E4]'}`}
            aria-label="Toggle Menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Desktop Logo & Branding (Shown on sm/md and above) */}
          <div 
            onClick={() => setActiveTab('new-order')}
            className="hidden sm:flex items-center space-x-2.5 cursor-pointer group shrink-0"
          >
            {publicSettings.websiteLogo ? (
              <img 
                src={publicSettings.websiteLogo} 
                alt={publicSettings.websiteName || 'YouthSMM'} 
                className="h-8 max-w-[140px] object-contain" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <AnimatedLogo size="sm" showText={true} theme={isDarkMode ? 'dark' : 'light'} />
            )}
          </div>

          {/* Desktop Divider & Active Tab Title (Exactly like Screenshot) */}
          <div className={`hidden sm:flex items-center space-x-2 pl-4 border-l ${isDarkMode ? 'border-[#292929]' : 'border-[#EAE3D2]'} min-w-0`}>
            <span className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              {currentTabObj.label}
            </span>
          </div>

          {/* Mobile Only: Active Tab Title right next to menu button */}
          <div className="sm:hidden flex items-center min-w-0 pl-1">
            <span className={`text-sm font-bold tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              {currentTabObj.label}
            </span>
          </div>
        </div>

        {/* Right Side: Quick Action Icons & Currency Button */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Notification Bell */}
          <button
            onClick={() => setActiveTab('new-order')}
            title="Announcements & Notifications"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-xs transition-all hover:scale-105 cursor-pointer relative ${
              isDarkMode 
                ? 'bg-[#1C1C1C] border border-[#292929] text-gray-200 hover:bg-[#252525] hover:border-[#FF3030]/40' 
                : 'bg-white border border-[#EAE3D2] text-stone-700 hover:bg-[#F5F0E4]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {announcements.length > 0 && (
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 rounded-full bg-[#FF3030] animate-ping" />
            )}
          </button>

          {/* Currency Pill Switcher (INR / USD / EUR) */}
          <div className="relative">
            <button
              onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#FF3030] hover:bg-[#E02424] text-white font-extrabold text-[11px] sm:text-xs flex items-center space-x-1 sm:space-x-1.5 shadow-md shadow-red-950/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{currency}</span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-90" />
            </button>

            {currencyDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setCurrencyDropdownOpen(false)} 
                />
                <div className={`absolute right-0 mt-2 w-36 rounded-xl border shadow-2xl z-50 py-1.5 divide-y animate-in fade-in zoom-in-95 duration-150 ${
                  isDarkMode 
                    ? 'bg-[#1C1C1C] border-[#292929] divide-[#242424]' 
                    : 'bg-white border-[#EAE3D2] divide-[#F0EAE0]'
                }`}>
                  {(['INR', 'USD', 'EUR', 'PKR'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => changeCurrency(c)}
                      className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                        currency === c
                          ? (isDarkMode ? 'bg-red-950/60 text-[#FF3030]' : 'bg-red-50 text-red-600')
                          : (isDarkMode ? 'text-gray-200 hover:bg-[#252525]' : 'text-stone-700 hover:bg-[#FAF7EE]')
                      }`}
                    >
                      <span>{c} ({currencySymbols[c]})</span>
                      {currency === c && <Check className="w-3.5 h-3.5 text-[#FF3030]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dark Mode / Cream Mode Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Cream Mode' : 'Switch to Dark Mode'}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'bg-[#1C1C1C] border border-[#292929] text-amber-400 hover:bg-[#252525] hover:border-[#FF3030]/40'
                : 'bg-white border border-[#EAE3D2] text-stone-700 hover:bg-[#F5F0E4]'
            }`}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-700" />
            )}
          </button>

          {/* User Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs transition-all hover:scale-105 cursor-pointer ${
                isDarkMode
                  ? 'bg-[#1C1C1C] border border-[#292929] text-gray-200 hover:bg-[#252525] hover:border-[#FF3030]/40'
                  : 'bg-white border border-[#EAE3D2] text-stone-700 hover:bg-[#F5F0E4]'
              }`}
            >
              <UserIcon className="w-4 h-4" />
            </button>

            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileDropdownOpen(false)} 
                />
                <div className={`absolute right-0 mt-2.5 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden py-2 divide-y animate-in fade-in slide-in-from-top-2 duration-150 text-left ${
                  isDarkMode 
                    ? 'bg-[#1C1C1C] border-[#292929] divide-[#242424] text-gray-200' 
                    : 'bg-white border-[#EAE3D2] divide-[#F0EAE0] text-stone-800'
                }`}>
                  <div className={`px-4 py-3 ${isDarkMode ? 'bg-[#141414]' : 'bg-[#FAF7EE]'}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Signed In As</div>
                    <div className={`text-sm font-extrabold truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{user.email}</div>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#FF3030]/20 text-[#FF3030] font-extrabold text-[10px] uppercase">
                        {user.role === 'admin' ? 'Administrator' : 'Bronze Level 3'}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {formatAmount(user.balance)}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowAccountModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center space-x-3 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525] hover:text-white' : 'text-gray-700 hover:bg-red-50 hover:text-red-600'}`}
                    >
                      <UserIcon className="w-4 h-4 text-sky-400" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setActiveTab('add-funds');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center space-x-3 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525] hover:text-white' : 'text-gray-700 hover:bg-red-50 hover:text-red-600'}`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Add Funds History</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowRewardsModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center space-x-3 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525] hover:text-white' : 'text-gray-700 hover:bg-red-50 hover:text-red-600'}`}
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Rewards & Level Tier</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onToggleAdminView();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-purple-400 hover:bg-purple-950/40 transition-colors flex items-center space-x-3"
                      >
                        <LayoutDashboard className="w-4 h-4 text-purple-400" />
                        <span>👑 Open Admin Panel</span>
                      </button>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowAboutModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors flex items-center space-x-3 ${isDarkMode ? 'text-gray-400 hover:bg-[#252525]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Info className="w-4 h-4 text-[#FF3030]" />
                      <span>About Us & Platform</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowTermsModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors flex items-center space-x-3 ${isDarkMode ? 'text-gray-400 hover:bg-[#252525]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>Terms & Conditions</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowPrivacyModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors flex items-center space-x-3 ${isDarkMode ? 'text-gray-400 hover:bg-[#252525]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <ShieldCheck className="w-4 h-4 text-gray-400" />
                      <span>Privacy Policy</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#FF3030] hover:bg-red-950/30 transition-colors flex items-center space-x-3"
                    >
                      <LogOut className="w-4 h-4 text-[#FF3030]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN LAYOUT WITH SIDEBAR */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative max-w-[1550px] w-full mx-auto px-2 sm:px-4 md:px-6 py-4 md:py-6 pb-28 sm:pb-32 md:pb-6 gap-6">
        {/* Mobile menu backdrop */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* ========================================================================= */}
        {/* 2A. LEFT SIDEBAR (CSS Selector 2) */}
        {/* ========================================================================= */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-10 w-72 md:w-64 ${isDarkMode ? 'bg-[#141414] md:bg-transparent text-gray-200' : 'bg-[#FAF7EE] md:bg-transparent text-stone-800'} flex flex-col space-y-4 flex-shrink-0 transition-transform duration-300 md:transform-none p-4 md:p-0 overflow-y-auto max-h-screen overscroll-contain
          ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Mobile Drawer Top Bar with Brand & Close Button */}
          <div className="flex md:hidden items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800 shrink-0">
            <div className="flex items-center space-x-2">
              {publicSettings.websiteLogo ? (
                <img
                  src={publicSettings.websiteLogo}
                  alt={publicSettings.websiteName || 'YouthSMM'}
                  className="h-7 max-w-[120px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <AnimatedLogo size="sm" showText={true} theme={isDarkMode ? 'dark' : 'light'} />
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-[#1C1C1C] border-[#292929] text-gray-300 hover:text-white'
                  : 'bg-white border-[#EAE3D2] text-stone-700 hover:text-stone-900'
              }`}
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Top Red Balance & Level Card (YouthSMM Bold Red Branding) */}
          <div className="bg-gradient-to-br from-[#FF3030] via-[#E82626] to-[#C91818] text-white rounded-3xl p-5 shadow-lg shadow-red-950/40 text-left relative overflow-hidden border border-red-500/30">
            {/* Subtle light bubble in background */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 filter blur-lg pointer-events-none" />

            <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-100">
              BALANCE
            </div>

            <div className="text-3xl font-black font-sans tracking-tight mt-1">
              {formatAmount(user.balance)}
            </div>

            <button
              onClick={() => {
                setActiveTab('add-funds');
                setMobileMenuOpen(false);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all inline-flex items-center space-x-1.5 cursor-pointer active:scale-95 shadow-xs"
            >
              <span>{publicSettings.sidebarAddFundsBtnText || '+ Add funds'}</span>
            </button>

            {/* Level Tier Status & Progress */}
            <div className="mt-4 pt-3 border-t border-white/20 text-xs">
              <div className="flex items-center justify-between text-white font-bold text-[11px]">
                <span className="flex items-center space-x-1">
                  <span>🏅 {publicSettings.sidebarLevelNum || 'Level 3'}</span>
                </span>
                <span className="uppercase tracking-wider text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-extrabold">
                  {publicSettings.sidebarLevelName || (user.level === 1 ? 'GOLD' : user.level === 2 ? 'SILVER' : 'BRONZE')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-white h-full rounded-full w-[55%]" />
              </div>

              <div className="flex justify-between items-center text-[10px] text-red-100 font-semibold mt-1.5">
                <span>{publicSettings.sidebarXpText || '66 / 120 XP'}</span>
                <span>{publicSettings.sidebarNextXp || 'Next: 54 XP'}</span>
              </div>

              <button
                onClick={() => setShowRewardsModal(true)}
                className="w-full text-center text-[10px] font-black uppercase tracking-wider text-white/95 hover:underline mt-2.5 block cursor-pointer"
              >
                {publicSettings.sidebarRewardsLinkText || '🏆 VIEW REWARDS & LEVELS'}
              </button>
            </div>
          </div>

          {/* Navigation Menu List (Exact styled items with colored square icons) */}
          <nav className="space-y-1.5 overflow-y-auto md:max-h-[calc(100vh-360px)] pr-1 scrollbar-none">
            {/* Admin Panel Quick Switcher in Sidebar */}
            {(isAdmin || user.role === 'admin' || user.email?.toLowerCase().includes('bhattg805') || user.email?.toLowerCase().includes('echoesclub8')) && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onToggleAdminView();
                }}
                className="w-full mb-2 flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <LayoutDashboard className="w-4 h-4 text-amber-300" />
                </div>
                <span className="text-sm font-extrabold flex-1 text-left">👑 Switch to Admin Panel</span>
              </button>
            )}

            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FF3030] text-white shadow-md shadow-red-950/40'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-[#1C1C1C] hover:text-white'
                        : 'text-stone-700 hover:bg-[#EFE8DA] hover:text-stone-900'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : tab.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* WhatsApp Direct Support Button in Left Sidebar */}
          <a
            href={`https://wa.me/91${(publicSettings.whatsappNumber || '8795005604').replace(/[^0-9]/g, '') || '8795005604'}?text=${encodeURIComponent(`Hello ${publicSettings.websiteName || 'YouthSMM'} Support, I need help with my account.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer group shadow-xs"
            title="Chat on WhatsApp"
          >
            <div className="w-7 h-7 rounded-xl bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <WhatsAppIcon className="w-4 h-4 fill-white" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 leading-tight">
                <span>WhatsApp Support</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                Online 24/7 Support
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 flex-shrink-0" />
          </a>

          {/* Sidebar Footer Copyright */}
          <div className={`pt-2 text-[11px] font-semibold pl-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {publicSettings.footerCopyright || `© ${publicSettings.websiteName || 'YouthSMM'} | Main SMM Provider`}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2B. MAIN CONTENT AREA */}
        {/* ========================================================================= */}
        <main className="flex-1 min-w-0 flex flex-col space-y-6">
          {/* Notification / Error / Success Alerts */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-bold shadow-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-xs font-bold shadow-xs">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TOP PROMOTIONAL BANNER: MULTI-BANNER CAROUSEL (Supports Admin Add & Edit) */}
          {/* ========================================================================= */}
          {showPromoBanner && activePromoBanners.length > 0 && currentPromoBanner && (
            <div className={`bg-gradient-to-r ${getBannerGradient(currentPromoBanner.theme)} text-white rounded-3xl p-4 sm:p-5 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300`}>
              {/* Carousel Left Navigation button */}
              {activePromoBanners.length > 1 && (
                <button 
                  className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 items-center justify-center text-white text-sm cursor-pointer z-10 transition-transform hover:scale-110 active:scale-95"
                  onClick={() => setActiveBannerIndex(prev => (prev - 1 + activePromoBanners.length) % activePromoBanners.length)}
                  title="Previous banner"
                >
                  ‹
                </button>
              )}

              <div className="flex items-center space-x-4 pl-0 lg:pl-6 min-w-0">
                {/* Banner Icon */}
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-amber-300 flex-shrink-0 shadow-inner">
                  {renderBannerIconItem(currentPromoBanner.icon)}
                </div>

                <div className="min-w-0">
                  {currentPromoBanner.badge && (
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200 truncate">
                      {currentPromoBanner.badge}
                    </div>
                  )}
                  <div className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
                    {currentPromoBanner.title}
                  </div>
                  {currentPromoBanner.subtitle && (
                    <div className="text-xs text-white/90 font-medium mt-0.5 truncate max-w-xl">
                      {currentPromoBanner.subtitle}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center pr-0 lg:pr-6 shrink-0">
                {currentPromoBanner.btnText && (
                  <button
                    onClick={() => handleBannerClick(currentPromoBanner)}
                    className="px-5 py-2 rounded-full bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    {currentPromoBanner.btnText}
                  </button>
                )}

                <button
                  onClick={() => setShowPromoBanner(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Carousel Right Navigation button */}
              {activePromoBanners.length > 1 && (
                <button 
                  className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 items-center justify-center text-white text-sm cursor-pointer z-10 transition-transform hover:scale-110 active:scale-95"
                  onClick={() => setActiveBannerIndex(prev => (prev + 1) % activePromoBanners.length)}
                  title="Next banner"
                >
                  ›
                </button>
              )}

              {/* Dots indicator for multiple banners */}
              {activePromoBanners.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center space-x-1.5">
                  {activePromoBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveBannerIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === (activeBannerIndex % activePromoBanners.length)
                          ? 'w-5 bg-white'
                          : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      title={`Go to banner ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* UNIFIED GREETING & 4 STAT METRICS HEADER (YouthSMM Bold Red Branding) */}
          {/* ========================================================================= */}
          <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border border-[#EAE3D2] text-stone-900 shadow-sm'} rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all`}>
            {/* Left: Greeting & Notice */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-snug">
                <div className={isDarkMode ? 'text-white' : 'text-stone-900'}>{getGreeting().text},</div>
                <div className="text-[#FF3030] truncate">{user.name || user.email}</div>
              </h1>
              <p className={`text-xs sm:text-sm font-medium mt-2 leading-relaxed max-w-xl ${isDarkMode ? 'text-gray-400' : 'text-stone-600'}`}>
                {publicSettings.greetingNotice || `Place a new order in a few taps — orders delivered on ${publicSettings.websiteName || 'YouthSMM'} | Main SMM Provider.`}
              </p>
            </div>

            {/* Right: 4 Stat Metric Cards in compact grid / row with bold theme colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 flex-shrink-0">
              {/* 1. BALANCE */}
              <div className={`${isDarkMode ? 'bg-[#141414] border border-[#262626] hover:border-[#FF3030]/40' : 'bg-[#FAF7EE] border border-[#EAE3D2] hover:shadow-xs'} rounded-2xl p-3.5 sm:p-4 min-w-[115px] sm:min-w-[125px] flex flex-col justify-between transition-all shadow-xs`}>
                <div className="w-8 h-8 rounded-xl bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    BALANCE
                  </div>
                  <div className={`text-base sm:text-lg font-black mt-0.5 tracking-tight font-mono ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    {formatAmount(user.balance)}
                  </div>
                </div>
              </div>

              {/* 2. TOTAL ORDERS */}
              <div className={`${isDarkMode ? 'bg-[#141414] border border-[#262626] hover:border-[#FF3030]/40' : 'bg-[#FAF7EE] border border-[#EAE3D2] hover:shadow-xs'} rounded-2xl p-3.5 sm:p-4 min-w-[115px] sm:min-w-[125px] flex flex-col justify-between transition-all shadow-xs`}>
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
                  <List className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    TOTAL ORDERS
                  </div>
                  <div className={`text-base sm:text-lg font-black mt-0.5 tracking-tight font-mono ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    {totalOrdersCount}
                  </div>
                </div>
              </div>

              {/* 3. TOTAL SPENT */}
              <div className={`${isDarkMode ? 'bg-[#141414] border border-[#262626] hover:border-[#FF3030]/40' : 'bg-[#FAF7EE] border border-[#EAE3D2] hover:shadow-xs'} rounded-2xl p-3.5 sm:p-4 min-w-[115px] sm:min-w-[125px] flex flex-col justify-between transition-all shadow-xs`}>
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    TOTAL SPENT
                  </div>
                  <div className={`text-base sm:text-lg font-black mt-0.5 tracking-tight font-mono ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    {totalSpentFormatted}
                  </div>
                </div>
              </div>

              {/* 4. LEVEL */}
              <div className={`${isDarkMode ? 'bg-[#141414] border border-[#262626] hover:border-[#FF3030]/40' : 'bg-[#FAF7EE] border border-[#EAE3D2] hover:shadow-xs'} rounded-2xl p-3.5 sm:p-4 min-w-[115px] sm:min-w-[125px] flex flex-col justify-between transition-all shadow-xs`}>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    LEVEL
                  </div>
                  <div className={`text-base sm:text-lg font-extrabold mt-0.5 tracking-tight flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    <span>🥉</span>
                    <span>{publicSettings.sidebarLevelName ? publicSettings.sidebarLevelName.replace(/Level\s*\d+/i, '').trim() : 'Bronze'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: NEW ORDER / DASHBOARD (YouthSMM Bold Red Cards) */}
          {/* ========================================================================= */}
          {activeTab === 'new-order' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Place New Order Form */}
              <div className={`lg:col-span-2 ${isDarkMode ? 'bg-[#1C1C1C] border border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border border-[#EAE3D2]'} rounded-3xl p-4 sm:p-8 shadow-xs`}>
                {/* Header with red circle lightning */}
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                    Place a new order
                  </h2>
                </div>

                {/* Sub Switcher: New Order vs Mass Order */}
                <div className={`flex items-center space-x-2 ${isDarkMode ? 'bg-[#141414] border border-[#262626]' : 'bg-[#FAF7EE] border border-[#EAE3D2]'} p-1.5 rounded-2xl w-fit mb-6`}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-order')}
                    className="px-4 py-2 rounded-xl bg-[#FF3030] text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-md shadow-red-950/40 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>New order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('mass-order')}
                    className={`px-4 py-2 rounded-xl ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'} font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-colors`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Mass Order</span>
                  </button>
                </div>

                {/* 4 Steps Indicator Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-xs font-bold">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#262626] text-gray-200' : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-700 shadow-2xs'}`}>
                    <span className="w-5 h-5 rounded-full bg-[#FF3030] text-white text-[10px] font-black flex items-center justify-center">1</span>
                    <span>Platform</span>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#262626] text-gray-200' : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-700 shadow-2xs'}`}>
                    <span className="w-5 h-5 rounded-full bg-[#FF3030] text-white text-[10px] font-black flex items-center justify-center">2</span>
                    <span>Category</span>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#262626] text-gray-200' : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-700 shadow-2xs'}`}>
                    <span className="w-5 h-5 rounded-full bg-[#FF3030] text-white text-[10px] font-black flex items-center justify-center">3</span>
                    <span>Service</span>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#262626] text-gray-200' : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-700 shadow-2xs'}`}>
                    <span className="w-5 h-5 rounded-full bg-[#FF3030] text-white text-[10px] font-black flex items-center justify-center">4</span>
                    <span>Details</span>
                  </div>
                </div>

                {/* Step 1: Platforms Quick Selection Pills */}
                <div className="mb-6">
                  <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                    Step 1: Choose Platform
                  </label>
                  <div className="flex sm:flex-wrap items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none touch-pan-x -mx-1 px-1">
                    {platforms.map((p) => {
                      const PIcon = p.icon;
                      const isSel = selectedPlatform === p.id;
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectPlatform(p.id)}
                          className={`relative px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer border overflow-hidden group select-none whitespace-nowrap shrink-0 min-h-[42px] ${
                            isSel
                              ? `${p.activeBg} border-white/20 text-white shadow-md shadow-red-600/20`
                              : isDarkMode
                                ? 'bg-[#141414] border-[#262626] text-gray-300 hover:border-[#FF3030]/50'
                                : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-700 hover:bg-[#F5F0E4] hover:border-[#D8CEB8]'
                          }`}
                        >
                          {/* Animated background shimmer on hover */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -skew-x-12 pointer-events-none"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6 }}
                          />

                          {/* Animated Icon with subtle floating/pulse motion */}
                          <motion.div
                            animate={isSel ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] } : {}}
                            transition={{ duration: 1.8, repeat: isSel ? Infinity : 0, repeatDelay: 2 }}
                            className={`flex items-center justify-center ${isSel ? 'text-white' : p.iconColor}`}
                          >
                            <PIcon className="w-3.5 h-3.5 transition-transform group-hover:scale-115 group-hover:rotate-3" />
                          </motion.div>
                          <span className="relative z-10">{p.label}</span>

                          {/* Active glowing indicator spark */}
                          {isSel && (
                            <motion.span
                              className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 shadow-xs"
                              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Provider Connection Confirmation Banner */}
                {placedOrderConfirmation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all mb-5 shadow-lg ${
                      isDarkMode 
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0 border border-emerald-500/30">
                          <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                              <span>Order #{placedOrderConfirmation.id} Placed & Connected!</span>
                            </h4>
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              Live Provider Connected ⚡
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                            Order successfully dispatched and verified with SMM API provider immediately.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPlacedOrderConfirmation(null)}
                        className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#0f151b] border-emerald-500/20' : 'bg-white border-emerald-200'}`}>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Provider Order ID</span>
                        <span className="font-bold text-emerald-400 text-xs">
                          {placedOrderConfirmation.providerOrderId && !placedOrderConfirmation.providerOrderId.startsWith('FAILED:') && !placedOrderConfirmation.providerOrderId.startsWith('QUEUED:')
                            ? `#${placedOrderConfirmation.providerOrderId}`
                            : 'Processing (Auto-Syncing)'}
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#0f151b] border-emerald-500/20' : 'bg-white border-emerald-200'}`}>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Status</span>
                        <span className="font-bold text-emerald-400 capitalize text-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {placedOrderConfirmation.status || 'Processing'}
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#0f151b] border-emerald-500/20' : 'bg-white border-emerald-200'}`}>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Quantity</span>
                        <span className="font-bold text-white text-xs">
                          {placedOrderConfirmation.quantity?.toLocaleString()} qty
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-[#0f151b] border-emerald-500/20' : 'bg-white border-emerald-200'} flex items-center justify-between`}>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Tracker</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('orders')}
                            className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer text-xs"
                          >
                            Track Live →
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handlePlaceOrder} className="space-y-5">
                  {/* Search Bar Above Category */}
                  <div ref={quickSearchRef} className="relative">
                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      Search Category / Service
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search any service or category by name, keyword, or ID..."
                        value={quickSearchQuery}
                        onFocus={() => {
                          if (quickSearchQuery.trim()) setIsQuickSearchOpen(true);
                          setIsCategoryDropdownOpen(false);
                          setIsServiceDropdownOpen(false);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuickSearchQuery(val);
                          setIsQuickSearchOpen(val.trim().length > 0);
                        }}
                        className={`w-full pl-10 pr-10 py-3 min-h-[48px] rounded-2xl border text-base sm:text-xs font-semibold focus:outline-none transition-all shadow-xs ${
                          isDarkMode
                            ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500 focus:border-[#FF3030] focus:ring-1 focus:ring-[#FF3030]/40'
                            : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:bg-[#FFFDF9] focus:border-red-600 focus:ring-1 focus:ring-red-600/30'
                        }`}
                      />
                      {quickSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickSearchQuery('');
                            setIsQuickSearchOpen(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-600 text-xs transition-colors cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Search Dropdown Results Popover */}
                    <AnimatePresence>
                      {isQuickSearchOpen && quickSearchQuery.trim().length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md max-h-72 overflow-y-auto p-1.5 space-y-1 ${
                            isDarkMode
                              ? 'bg-[#1C1C1C] border-[#2A2A2A] text-white shadow-2xl'
                              : 'bg-[#FFFDF9]/95 border-[#EAE3D2] text-stone-900'
                          }`}
                        >
                          <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-400 border-white/5' : 'text-stone-500 border-[#EAE3D2]'} flex items-center justify-between border-b mb-1`}>
                            <span>Matching Results ({matchingQuickServices.length})</span>
                            <span className="text-[9px] text-[#FF3030] font-bold">Click to Select</span>
                          </div>

                          {matchingQuickServices.length === 0 ? (
                            <div className="py-6 text-center text-xs text-gray-400">
                              No service or category found matching "{quickSearchQuery}"
                            </div>
                          ) : (
                            matchingQuickServices.slice(0, 15).map((srv) => {
                              const parentCat = categories.find(c => c.id === srv.categoryId);
                              return (
                                <button
                                  key={srv.id}
                                  type="button"
                                  onClick={() => {
                                    setNewOrder({
                                      ...newOrder,
                                      categoryId: String(srv.categoryId),
                                      serviceId: String(srv.id),
                                    });
                                    setQuickSearchQuery('');
                                    setIsQuickSearchOpen(false);
                                  }}
                                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                    isDarkMode
                                      ? 'hover:bg-[#252525] text-gray-200'
                                      : 'hover:bg-[#FAF7EE] text-stone-800'
                                  }`}
                                >
                                  <div className="truncate mr-3">
                                    <div className="font-bold truncate flex items-center space-x-1.5">
                                      <span className="text-[#FF3030] font-mono text-[11px]">#{srv.id}</span>
                                      <span className="truncate">{srv.name}</span>
                                    </div>
                                    {parentCat && (
                                      <div className="text-[10px] text-stone-500 truncate mt-0.5 flex items-center space-x-1">
                                        <span>Category:</span>
                                        <span className="text-teal-400 font-medium">{parentCat.name}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0 font-mono font-black">
                                    <span className="text-emerald-400 font-bold">{formatAmount(srv.pricePerThousand)}</span>
                                    <span className="block text-[9px] text-stone-400">/ 1K</span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Step 2: Category Dropdown with Animated Platform/Category Logo */}
                  <div ref={categoryDropdownRef} className="relative">
                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      Step 2: Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                        setIsServiceDropdownOpen(false);
                        setIsQuickSearchOpen(false);
                      }}
                      className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white hover:border-[#FF3030]/50'
                          : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 hover:border-[#D8CEB8] hover:bg-[#F5F0E4]'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 truncate">
                        {selectedCategory && (
                          <ServiceCategoryIcon
                            name={selectedCategory.name}
                            icon={selectedCategory.icon}
                            size="md"
                          />
                        )}
                        <span className={`font-bold truncate text-sm ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                          {selectedCategory
                            ? selectedCategory.name
                            : filteredCategories.length > 0
                            ? `Select a Category (${filteredCategories.length} available)`
                            : categories.length === 0
                            ? 'Loading Categories...'
                            : 'Select a Category'}
                        </span>
                      </div>

                      {/* Dropdown Blue Arrow Indicator matching reference */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <div className="w-5 h-5 rounded bg-[#FF3030] text-white flex items-center justify-center font-black text-[9px] shadow-xs">
                          {isCategoryDropdownOpen ? '▲' : '▼'}
                        </div>
                      </div>
                    </button>

                    {/* Animated Category Popover List */}
                    <AnimatePresence>
                      {isCategoryDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md ${
                            isDarkMode
                              ? 'bg-[#1C1C1C] border-[#2A2A2A] text-white shadow-2xl'
                              : 'bg-[#FFFDF9]/95 border-[#EAE3D2] text-stone-900'
                          }`}
                        >
                          {/* Categories List */}
                          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                            {displayedCategories.length === 0 ? (
                              <div className="py-6 text-center text-xs text-gray-400 flex flex-col items-center justify-center space-y-2">
                                {categories.length === 0 ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 text-[#FF3030] animate-spin" />
                                    <span>Loading categories...</span>
                                  </>
                                ) : (
                                  <span>No matching categories found</span>
                                )}
                              </div>
                            ) : (
                              displayedCategories.map((cat) => {
                                const isCatSelected = String(cat.id) === String(newOrder.categoryId);
                                return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => {
                                        const catServices = services.filter(s => {
                                          const sCatId = String(s.categoryId ?? (s as any).category_id ?? '');
                                          return sCatId === String(cat.id);
                                        });
                                        const firstSrv = catServices.length > 0 ? catServices[0] : null;
                                        setNewOrder({
                                          ...newOrder,
                                          categoryId: String(cat.id),
                                          serviceId: firstSrv ? String(firstSrv.id) : '',
                                        });
                                        setIsCategoryDropdownOpen(false);
                                        setCategorySearchQuery('');
                                      }}
                                    className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                      isCatSelected
                                        ? 'bg-[#FF3030] text-white shadow-xs'
                                        : isDarkMode
                                        ? 'hover:bg-[#252525] text-gray-200'
                                        : 'hover:bg-[#FAF7EE] text-stone-800'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 truncate">
                                      <ServiceCategoryIcon name={cat.name} icon={cat.icon} size="sm" />
                                      <span className="truncate">{cat.name}</span>
                                    </div>
                                    {isCatSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Step 3: Service Dropdown */}
                  <div ref={serviceDropdownRef} className="relative">
                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      Step 3: Service
                    </label>
                    <button
                      type="button"
                      disabled={availableServices.length === 0}
                      onClick={() => {
                        setIsServiceDropdownOpen(!isServiceDropdownOpen);
                        setIsCategoryDropdownOpen(false);
                        setIsQuickSearchOpen(false);
                      }}
                      className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all cursor-pointer shadow-xs disabled:opacity-60 ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white hover:border-[#FF3030]/50'
                          : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 hover:border-[#D8CEB8] hover:bg-[#F5F0E4]'
                      }`}
                    >
                      <div className="text-left truncate">
                        <span className={`font-bold truncate block text-sm ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                          {selectedService
                            ? `#${selectedService.id} - ${selectedService.name}`
                            : availableServices.length > 0
                            ? `Select a Service (${availableServices.length} available)`
                            : services.length === 0
                            ? 'No services available'
                            : !newOrder.categoryId
                            ? 'Please select a category first'
                            : 'No services in this category'}
                        </span>
                        {selectedService && (
                          <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                            {formatAmount(selectedService.pricePerThousand)} / 1,000
                          </span>
                        )}
                      </div>

                      {/* Dropdown Blue Arrow Indicator */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <div className="w-5 h-5 rounded bg-[#FF3030] text-white flex items-center justify-center font-black text-[9px] shadow-xs">
                          {isServiceDropdownOpen ? '▲' : '▼'}
                        </div>
                      </div>
                    </button>

                    {/* Animated Service Popover List */}
                    <AnimatePresence>
                      {isServiceDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md ${
                            isDarkMode
                              ? 'bg-[#1C1C1C] border-[#2A2A2A] text-white shadow-2xl'
                              : 'bg-[#FFFDF9]/95 border-[#EAE3D2] text-stone-900'
                          }`}
                        >
                          {/* Services List */}
                          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                            {displayedServices.length === 0 ? (
                              <div className="py-6 text-center text-xs text-gray-400 flex flex-col items-center justify-center space-y-1">
                                <span>No services available yet</span>
                                <span className="text-[11px] text-gray-500">Services will appear here once added by Admin</span>
                              </div>
                            ) : (
                              displayedServices.map((s) => {
                                const isSrvSelected = String(s.id) === String(newOrder.serviceId);
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                      onClick={() => {
                                        setNewOrder({
                                          ...newOrder,
                                          categoryId: String(s.categoryId ?? newOrder.categoryId),
                                          serviceId: String(s.id),
                                        });
                                        setIsServiceDropdownOpen(false);
                                        setServiceSearchQuery('');
                                      }}
                                    className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                      isSrvSelected
                                        ? 'bg-[#FF3030] text-white shadow-xs'
                                        : isDarkMode
                                        ? 'hover:bg-[#252525] text-gray-200'
                                        : 'hover:bg-[#FAF7EE] text-stone-800'
                                    }`}
                                  >
                                    <div className="truncate">
                                      <span className="font-bold block truncate">
                                        #{s.id} - {s.name}
                                      </span>
                                      <span className={`text-[10px] font-mono ${isSrvSelected ? 'text-white/90' : 'text-stone-500'}`}>
                                        Min: {s.minAmount} &middot; Max: {s.maxAmount}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0 ml-3 font-mono font-black">
                                      <span className={isSrvSelected ? 'text-white' : 'text-emerald-400'}>
                                        {formatAmount(s.pricePerThousand)}
                                      </span>
                                      <span className={`block text-[9px] ${isSrvSelected ? 'text-white/80' : 'text-stone-400'}`}>/ 1K</span>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>


                  {/* Service Description Box */}
                  {selectedService && selectedServiceTiming && (
                    <div className={`p-4 sm:p-5 rounded-2xl border text-xs leading-relaxed space-y-3.5 transition-all ${
                      isDarkMode 
                        ? 'bg-[#161616] border-[#282828] text-gray-300' 
                        : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-700 shadow-xs'
                    }`}>
                      {/* Top Header with Speed Badge */}
                      <div className={`flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b ${
                        isDarkMode ? 'border-white/5' : 'border-[#EAE3D2]'
                      }`}>
                        <div className="font-extrabold text-[#FF3030] flex items-center space-x-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Service Description & Speed Info</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FF3030]/10 text-[#FF3030] border border-[#FF3030]/20 flex items-center space-x-1">
                          <Zap className="w-3 h-3 fill-current" />
                          <span>{selectedServiceTiming.badgeText}</span>
                        </span>
                      </div>

                      {/* KEY HIGHLIGHTS: SPEED & ESTIMATED COMPLETION TIME */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* 1. Service Speed */}
                        <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                          isDarkMode ? 'bg-[#141414] border-[#262626]' : 'bg-[#FFFDF9] border-[#EAE3D2] shadow-2xs'
                        }`}>
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 fill-current" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-stone-500">
                              Service Speed
                            </div>
                            <div className="font-mono font-black text-xs sm:text-[13px] text-amber-500 truncate">
                              {selectedServiceTiming.speed}
                            </div>
                          </div>
                        </div>

                        {/* 2. Estimated Completion Time */}
                        <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                          isDarkMode ? 'bg-[#141414] border-emerald-500/30' : 'bg-[#FFFDF9] border-[#EAE3D2] shadow-2xs'
                        }`}>
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase font-bold text-stone-500">
                              Estimated Completion Time
                            </div>
                            <div className="font-mono font-black text-xs sm:text-[13px] text-emerald-400 truncate">
                              {selectedServiceTiming.completionHours}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Quantity Estimated Time (When user inputs a quantity) */}
                      {Number(newOrder.quantity) > 0 && selectedServiceTiming.estimatedForQuantity && (
                        <div className={`p-3 rounded-xl border flex items-center space-x-2.5 text-xs animate-in fade-in ${
                          isDarkMode
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-2xs'
                        }`}>
                          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold">
                              Estimated time for <strong className="font-mono font-black">{Number(newOrder.quantity).toLocaleString()}</strong> quantity:{' '}
                            </span>
                            <span className="font-mono font-black text-emerald-400 underline decoration-emerald-500/40">
                              {selectedServiceTiming.estimatedForQuantity}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Description Text */}
                      <div className="space-y-1">
                        <div className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                          Description:
                        </div>
                        <p className={`whitespace-pre-line text-xs ${isDarkMode ? 'text-gray-300' : 'text-stone-600'}`}>
                          {selectedService.description || 'Fast and guaranteed delivery with instant activation.'}
                        </p>
                      </div>

                      {/* Footer Specs: Start Time, Min, Max */}
                      <div className={`flex flex-wrap items-center gap-3 pt-2 border-t font-mono text-[11px] font-bold ${
                        isDarkMode ? 'border-white/5 text-gray-400' : 'border-[#EAE3D2] text-stone-500'
                      }`}>
                        <span>
                          Start Time:{' '}
                          <strong className={isDarkMode ? 'text-gray-200 font-mono' : 'text-stone-800 font-mono'}>
                            {selectedServiceTiming.startTime}
                          </strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Min:{' '}
                          <strong className="text-[#FF3030] font-mono">
                            {selectedService.minAmount.toLocaleString()}
                          </strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Max:{' '}
                          <strong className="text-[#FF3030] font-mono">
                            {selectedService.maxAmount.toLocaleString()}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Link URL */}
                  <div>
                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      Step 4: Target Link / Profile / Post URL
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://instagram.com/reel/... or username / profile link"
                      value={newOrder.link}
                      onChange={(e) => setNewOrder({ ...newOrder, link: e.target.value })}
                      className={`w-full px-4 py-3 min-h-[48px] rounded-2xl border text-base sm:text-sm font-semibold shadow-xs focus:outline-none focus:border-[#FF3030] focus:ring-1 focus:ring-[#FF3030] ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                          : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:bg-[#FFFDF9]'
                      }`}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className={`text-[11px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                        Quantity
                      </label>
                      {selectedService && (
                        <span className={`text-[11px] font-mono ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                          Min: {selectedService.minAmount.toLocaleString()} &middot; Max: {selectedService.maxAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1000"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                      className={`w-full px-4 py-3 min-h-[48px] rounded-2xl border text-base sm:text-sm font-semibold shadow-xs focus:outline-none focus:border-[#FF3030] focus:ring-1 focus:ring-[#FF3030] ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                          : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:bg-[#FFFDF9]'
                      }`}
                    />

                    {/* Quick Quantity Preset Chips */}
                    {selectedService && (
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {[
                          { label: `Min (${selectedService.minAmount})`, val: selectedService.minAmount },
                          { label: '500', val: 500 },
                          { label: '1,000', val: 1000 },
                          { label: '5,000', val: 5000 },
                          { label: `Max (${selectedService.maxAmount})`, val: selectedService.maxAmount },
                        ]
                          .filter(
                            (chip, idx, self) =>
                              chip.val >= selectedService.minAmount &&
                              chip.val <= selectedService.maxAmount &&
                              self.findIndex((c) => c.val === chip.val) === idx
                          )
                          .map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, quantity: String(chip.val) })}
                              className={`text-[10px] px-2.5 py-1 min-h-[32px] rounded-xl font-bold transition-all cursor-pointer ${
                                newOrder.quantity === String(chip.val)
                                  ? 'bg-[#FF3030] text-white shadow-md shadow-red-950/40'
                                  : isDarkMode
                                  ? 'bg-[#141414] hover:bg-[#202020] text-gray-300 border border-[#262626]'
                                  : 'bg-[#FAF7EE] hover:bg-[#F5F0E4] text-stone-700 border border-[#EAE3D2]'
                              }`}
                            >
                              {chip.label}
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Live Amount Show Box Right Below Quantity */}
                    {selectedService && (
                      <div
                        className={`mt-3 p-3.5 rounded-2xl border transition-all ${
                          Number(newOrder.quantity) > 0
                            ? isDarkMode
                              ? 'bg-[#141414] border-[#2A2A2A] shadow-inner'
                              : 'bg-[#FAF7EE] border-emerald-300 shadow-2xs'
                            : isDarkMode
                            ? 'bg-[#141414] border-[#242424]'
                            : 'bg-[#FAF7EE] border-[#EAE3D2]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <DollarSign
                              className={`w-4 h-4 ${
                                Number(newOrder.quantity) > 0 ? 'text-[#FF3030]' : 'text-stone-400'
                              }`}
                            />
                            <span
                              className={`text-xs font-extrabold uppercase tracking-wider ${
                                isDarkMode ? 'text-gray-300' : 'text-stone-700'
                              }`}
                            >
                              Total Amount:
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-base sm:text-lg font-black font-mono ${
                                Number(newOrder.quantity) > 0
                                  ? 'text-emerald-400'
                                  : isDarkMode
                                  ? 'text-gray-400'
                                  : 'text-stone-400'
                              }`}
                            >
                              {formatAmountFourDecimals(estimatedPrice)}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown & Wallet check */}
                        {Number(newOrder.quantity) > 0 && (
                          <div
                            className={`mt-2 pt-2 border-t text-[11px] flex flex-col sm:flex-row justify-between sm:items-center gap-1 ${
                              isDarkMode
                                ? 'border-[#262626] text-gray-400'
                                : 'border-[#EAE3D2] text-stone-600'
                            }`}
                          >
                            <span>
                              Rate: <strong className={isDarkMode ? 'text-gray-200 font-mono' : 'text-stone-800 font-mono'}>{formatAmount(selectedService.pricePerThousand)}</strong> per 1K
                            </span>
                            {Number(user.balance || 0) < Number(estimatedPrice || 0) - 0.0001 ? (
                              <span className="text-[#FF3030] font-bold">
                                ⚠️ Low Balance: {formatAmount(user.balance)}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium">
                                ✓ Balance: {formatAmount(user.balance)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Coupon Code (Optional) */}
                  <div>
                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      Coupon Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DISCO10"
                      value={newOrder.coupon}
                      onChange={(e) => setNewOrder({ ...newOrder, coupon: e.target.value })}
                      className={`w-full px-4 py-3 min-h-[48px] rounded-2xl border text-base sm:text-sm font-semibold shadow-xs focus:outline-none focus:border-[#FF3030] focus:ring-1 focus:ring-[#FF3030] ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                          : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:bg-[#FFFDF9]'
                      }`}
                    />
                  </div>

                  {/* Submit Button (YouthSMM Bold Red CTA) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 min-h-[48px] rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-sm sm:text-base shadow-xl shadow-red-950/50 transition-all hover:scale-[1.01] active:scale-98 flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Place Order</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: Order Summary Card (YouthSMM Bold Red Header & Charcoal Card) */}
              <div className="space-y-6">
                <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border border-[#EAE3D2]'} rounded-3xl shadow-xs overflow-hidden`}>
                  {/* Top Red Header Bar */}
                  <div className="bg-[#FF3030] text-white p-4 font-bold text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-extrabold uppercase tracking-wider">Order summary</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-red-100 hover:text-white flex items-center space-x-1 cursor-pointer font-bold"
                    >
                      <span>Order status?</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Summary Details */}
                  <div className={`p-6 space-y-4 text-xs font-bold divide-y ${isDarkMode ? 'divide-[#262626] text-gray-300' : 'divide-[#EAE3D2] text-stone-700'}`}>
                    <div className="flex justify-between items-start pt-1">
                      <span className={isDarkMode ? 'text-gray-400 font-medium' : 'text-stone-500 font-medium'}>Service</span>
                      <span className={`text-right font-extrabold max-w-[180px] line-clamp-2 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                        {selectedService ? selectedService.name : 'No service selected'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3">
                      <span className={isDarkMode ? 'text-gray-400 font-medium' : 'text-stone-500 font-medium'}>Quantity</span>
                      <span className={`font-mono font-extrabold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                        {newOrder.quantity ? Number(newOrder.quantity).toLocaleString() : '0'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3">
                      <span className={isDarkMode ? 'text-gray-400 font-medium' : 'text-stone-500 font-medium'}>Rate / 1000</span>
                      <span className={`font-mono font-extrabold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                        {selectedService ? formatAmount(selectedService.pricePerThousand) : formatAmount(0)}
                      </span>
                    </div>

                    {selectedServiceTiming && (
                      <>
                        <div className="flex justify-between items-center pt-3">
                          <span className={isDarkMode ? 'text-gray-400 font-medium' : 'text-stone-500 font-medium'}>Speed</span>
                          <span className="font-mono font-extrabold text-amber-500 text-right text-[11px]">
                            {selectedServiceTiming.speed}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                          <span className={isDarkMode ? 'text-gray-400 font-medium' : 'text-stone-500 font-medium'}>Completion Time</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-right text-[11px]">
                            {selectedServiceTiming.estimatedForQuantity || selectedServiceTiming.completionHours}
                          </span>
                        </div>
                      </>
                    )}

                    <div className={`flex justify-between items-center pt-4 border-t-2 ${isDarkMode ? 'border-[#262626]' : 'border-[#EAE3D2]'}`}>
                      <span className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>Total Price</span>
                      <span className="text-xl font-black font-mono text-emerald-400">
                        {formatAmountFourDecimals(estimatedPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Announcements Ticker / Card */}
                <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border border-[#EAE3D2]'} rounded-3xl p-6 shadow-xs space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center space-x-2 font-black text-sm ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                      <Bell className="w-4 h-4 text-[#FF3030]" />
                      <span>Live Updates</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#FF3030]/20 text-[#FF3030] text-[10px] font-extrabold">
                      Active
                    </span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {announcements.length > 0 ? (
                      announcements.map((ann) => (
                        <div key={ann.id} className={`p-3.5 rounded-2xl border text-xs ${isDarkMode ? 'bg-[#141414] border-[#262626]' : 'bg-[#FAF7EE] border-[#EAE3D2]'}`}>
                          <div className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{ann.title}</div>
                          <div className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-stone-600'}`}>{ann.content}</div>
                        </div>
                      ))
                    ) : (
                      <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${isDarkMode ? 'bg-[#141414] border-[#262626] text-gray-400' : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-600'}`}>
                        ⚡ Instagram & YouTube services updated with ultra-fast speed. 100% stable refill guarantees active!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MASS ORDER */}
          {/* ========================================================================= */}
          {activeTab === 'mass-order' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-[#EAE3D2] text-stone-800'} rounded-3xl p-6 sm:p-8 border shadow-xs max-w-4xl`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <List className="w-5 h-5" />
                </div>
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>Mass Order Placement</h2>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-stone-600'} mb-6 leading-relaxed`}>
                Place multiple orders simultaneously. Use the format: <strong className={`${isDarkMode ? 'text-white' : 'text-stone-900'} font-mono`}>service_id | quantity | link_url</strong> (one per line).
              </p>

              <form onSubmit={handleMassOrder} className="space-y-5">
                <div>
                  <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-stone-500'} mb-2`}>
                    Bulk Orders Input
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder="101|1000|https://instagram.com/p/123&#10;102|5000|https://tiktok.com/@user/456"
                    value={massInput}
                    onChange={(e) => setMassInput(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border font-mono text-xs focus:outline-none focus:border-[#FF3030] focus:ring-1 focus:ring-[#FF3030] shadow-xs ${
                      isDarkMode
                        ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                        : 'bg-[#FAF7EE] border-[#EAE3D2] text-stone-900 placeholder-stone-400 focus:bg-[#FFFDF9]'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                >
                  {loading ? 'Processing...' : 'Submit Mass Orders'}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ORDERS HISTORY */}
          {/* ========================================================================= */}
          {activeTab === 'orders' && (
              <div className="space-y-4">
                {/* Header & Filter Controls */}
                <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
                  isDarkMode 
                    ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' 
                    : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#FF3030]/15 text-[#FF3030] flex items-center justify-center font-bold">
                          <Package className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight">Order History & Live Delivery Tracker</h2>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Track live completion speed, delivery progress percentage, start count & remaining quantity
                      </p>
                    </div>

                    {/* Actions: Refresh & Batch Copy */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedOrderIds.length > 0 && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedOrderIds.join(', '));
                            showSuccess(`Copied ${selectedOrderIds.length} Order IDs!`);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#FF3030] hover:bg-[#E02424] text-white font-mono text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-red-950/40 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Selected ({selectedOrderIds.length})</span>
                        </button>
                      )}

                      <button 
                        onClick={handleSyncOrders}
                        disabled={syncingOrders}
                        className={`p-2.5 px-3.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-2 text-xs font-bold ${
                          syncingOrders
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-wait'
                            : isDarkMode 
                            ? 'bg-[#141414] border-[#282828] text-gray-200 hover:bg-[#202020]' 
                            : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Sync live status directly with SMM provider"
                      >
                        <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncingOrders ? 'animate-spin' : ''}`} />
                        <span>{syncingOrders ? 'Syncing...' : 'Sync Provider'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Status Pills */}
                  <div className={`mt-5 pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isDarkMode ? 'border-[#262626]' : 'border-gray-100'
                  }`}>
                    {/* Status Tabs */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', label: 'All', count: orderCounts.all },
                        { id: 'completed', label: 'Completed', count: orderCounts.completed, color: 'text-emerald-400' },
                        { id: 'processing', label: 'In Progress', count: orderCounts.processing, color: 'text-blue-400' },
                        { id: 'pending', label: 'Pending', count: orderCounts.pending, color: 'text-amber-400' },
                        { id: 'partial', label: 'Partial', count: orderCounts.partial, color: 'text-purple-400' },
                        { id: 'cancelled', label: 'Cancelled', count: orderCounts.cancelled, color: 'text-rose-400' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setOrderStatusFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                            orderStatusFilter === tab.id
                              ? 'bg-[#FF3030] text-white shadow-md shadow-red-950/40'
                              : isDarkMode
                              ? 'bg-[#141414] text-gray-400 hover:text-white hover:bg-[#202020] border border-[#262626]'
                              : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-black ${
                            orderStatusFilter === tab.id
                              ? 'bg-white/20 text-white'
                              : isDarkMode
                              ? 'bg-[#202020] text-gray-300'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-64 shrink-0">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search ID, Service, Link..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF3030] border ${
                          isDarkMode 
                            ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Orders List / Cards matching the user's screenshot */}
                {filteredOrders.length > 0 ? (
                  <div className="space-y-3">
                    {/* Select all bar if multiple orders exist */}
                    <div className={`flex items-center justify-between px-2 text-xs font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                          onChange={() => toggleSelectAllOrders(filteredOrders)}
                          className={`w-4 h-4 rounded ${
                            isDarkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'
                          } text-red-600 focus:ring-red-500 cursor-pointer`}
                        />
                        <span>Select All ({filteredOrders.length} orders)</span>
                      </label>
                      <span>Showing {filteredOrders.length} of {orders.length} total orders</span>
                    </div>

                    {filteredOrders.map((ord) => (
                      <motion.div
                        key={ord.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 relative overflow-hidden ${
                          isDarkMode
                            ? 'bg-[#1C1C1C] border-[#282828] text-white hover:border-[#FF3030]/40 shadow-xl shadow-black/30'
                            : 'bg-white border-gray-200/90 text-gray-900 hover:border-gray-300 hover:shadow-md shadow-xs'
                        }`}
                      >
                        {/* TOP ROW: Checkbox + ID + Service + Link + Date on Left | Status + Price + Qty + Counts on Right */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3">
                          
                          {/* Left Group: Checkbox + Order Info */}
                          <div className="flex items-start space-x-3 min-w-0">
                            {/* Selection Checkbox */}
                            <input 
                              type="checkbox"
                              checked={selectedOrderIds.includes(ord.id)}
                              onChange={() => toggleSelectOrder(ord.id)}
                              className={`mt-1 w-4 h-4 rounded ${
                                isDarkMode ? 'border-gray-600 bg-[#141414]' : 'border-gray-300 bg-white'
                              } text-[#FF3030] focus:ring-[#FF3030] cursor-pointer shrink-0`}
                            />

                            {/* ID + Title + Link + Date */}
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-mono font-black text-sm sm:text-base tracking-wide ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  #{ord.id}
                                </span>
                                <h3 className={`font-extrabold text-xs sm:text-sm line-clamp-1 ${
                                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                }`}>
                                  {ord.serviceName || 'Social Media Growth Service'}
                                </h3>
                                {ord.providerOrderId && !ord.providerOrderId.startsWith('FAILED:') && !ord.providerOrderId.startsWith('QUEUED:') ? (
                                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 shrink-0 shadow-xs" title={`Connected to SMM API Provider (${ord.providerName || 'Provider'})`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>Provider Connected: #{ord.providerOrderId}</span>
                                  </span>
                                ) : (ord.providerOrderId?.startsWith('FAILED:') || ord.providerOrderId?.startsWith('QUEUED:')) ? (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1 shrink-0" title={ord.providerOrderId}>
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>Provider Sync Pending</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center space-x-1 shrink-0">
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    <span>Connecting Provider...</span>
                                  </span>
                                )}
                              </div>

                              {/* Target Link in Red / Coral Accent */}
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <a 
                                  href={ord.link.startsWith('http') ? ord.link : `https://${ord.link}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={`font-mono text-xs truncate max-w-[280px] sm:max-w-md md:max-w-lg block hover:underline transition-colors font-semibold ${
                                    isDarkMode ? 'text-[#FF4D4D] hover:text-white' : 'text-rose-600 hover:text-rose-700'
                                  }`}
                                >
                                  {ord.link}
                                </a>
                                <a
                                  href={ord.link.startsWith('http') ? ord.link : `https://${ord.link}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`${isDarkMode ? 'text-gray-400 hover:text-[#FF4D4D]' : 'text-gray-400 hover:text-rose-600'} transition-colors shrink-0`}
                                  title="Open Target Link"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              {/* Timestamp with Clock Icon + Speed Indicator */}
                              <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium pt-0.5 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="font-mono">{ord.createdAt || '2026-08-29 19:18:25'}</span>
                                </div>
                                <span className={isDarkMode ? 'text-gray-600 hidden sm:inline' : 'text-gray-300 hidden sm:inline'}>•</span>
                                <div className={`flex items-center space-x-1 font-bold shrink-0 ${
                                  isDarkMode ? 'text-emerald-400/90' : 'text-emerald-600'
                                }`}>
                                  <Zap className="w-3 h-3" />
                                  <span>{ord.speedText}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Group: Status Badge + Price + Qty + Start/End/Rem Counters */}
                          <div className="flex flex-col items-start lg:items-end space-y-1.5 shrink-0 pl-7 lg:pl-0">
                            <div className="flex items-center space-x-3">
                              {/* Status Pill Badge: ● Completed */}
                              <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center space-x-1.5 border shadow-xs ${
                                ord.normStatus === 'completed'
                                  ? isDarkMode 
                                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : ord.normStatus === 'pending'
                                  ? isDarkMode
                                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                  : ord.normStatus === 'processing' || ord.normStatus === 'inprogress' || ord.normStatus === 'in_progress'
                                  ? isDarkMode
                                    ? 'bg-blue-950/80 border-blue-500/40 text-blue-400'
                                    : 'bg-blue-50 border-blue-200 text-blue-700'
                                  : ord.normStatus === 'partial'
                                  ? isDarkMode
                                    ? 'bg-purple-950/80 border-purple-500/40 text-purple-400'
                                    : 'bg-purple-50 border-purple-200 text-purple-700'
                                  : isDarkMode
                                    ? 'bg-red-950/80 border-red-500/40 text-red-400'
                                    : 'bg-red-50 border-red-200 text-red-700'
                              }`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  ord.normStatus === 'completed' ? (isDarkMode ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-emerald-500') :
                                  ord.normStatus === 'pending' ? 'bg-amber-500' :
                                  ord.normStatus === 'processing' || ord.normStatus === 'inprogress' ? 'bg-blue-500 animate-pulse' :
                                  'bg-red-500'
                                }`} />
                                <span className="capitalize">{ord.normStatus === 'inprogress' ? 'In Progress' : ord.normStatus}</span>
                              </span>

                              {/* Price on top right */}
                              <div className={`font-mono font-black text-base sm:text-lg ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {formatAmount(ord.charge)}
                              </div>
                            </div>

                            {/* Quantity & Start · End · Rem Counters */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono">
                              <span className={`font-extrabold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                {ord.quantity.toLocaleString()} qty
                              </span>
                              <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>·</span>
                              <div className={`text-[11px] flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span>Start <strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>{ord.start}</strong></span>
                                <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>·</span>
                                <span>End <strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>{ord.end}</strong></span>
                                <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>·</span>
                                <span>Rem <strong className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>{ord.remains}</strong></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FULL WIDTH BRIGHT PROGRESS BAR WITH PERCENTAGE ON RIGHT */}
                        <div className="my-3 flex items-center space-x-3">
                          <div className={`relative w-full h-2.5 rounded-full overflow-hidden border shadow-inner ${
                            isDarkMode 
                              ? 'bg-[#141414] border-[#2A2A2A]' 
                              : 'bg-gray-100 border-gray-200/90'
                          }`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${ord.percentage}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                ord.normStatus === 'completed'
                                  ? 'bg-[#00e599] shadow-[0_0_12px_rgba(0,229,153,0.85)]'
                                  : ord.normStatus === 'pending'
                                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                                  : ord.normStatus === 'partial'
                                  ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.7)]'
                                  : ord.normStatus === 'cancelled' || ord.normStatus === 'refunded'
                                  ? 'bg-rose-500'
                                  : 'bg-gradient-to-r from-red-500 via-[#FF3030] to-rose-400 shadow-[0_0_12px_rgba(255,48,48,0.7)]'
                              }`}
                            />
                          </div>
                          <span className={`font-mono font-black text-xs sm:text-sm shrink-0 min-w-[44px] text-right ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {ord.percentage}%
                          </span>
                        </div>

                        {/* BOTTOM ACTION BUTTONS: [# Copy ID] [⎘ Copy details] [🔄 Refill] [🎧 Report] */}
                        <div className={`pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t ${
                          isDarkMode ? 'border-[#262626]' : 'border-gray-100'
                        }`}>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Copy ID Button */}
                            <button
                              onClick={() => copyOrderId(ord.id)}
                              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center space-x-1.5 transition-all border cursor-pointer shadow-xs active:scale-95 ${
                                isDarkMode
                                  ? 'bg-[#141414] hover:bg-[#222222] text-gray-200 hover:text-white border-[#2A2A2A]'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 hover:text-gray-900 border-gray-200/90'
                              }`}
                            >
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>#</span>
                              <span>{copiedOrderId === ord.id ? 'Copied!' : 'Copy ID'}</span>
                            </button>

                            {/* Copy Details Button */}
                            <button
                              onClick={() => copyOrderDetails(ord)}
                              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold flex items-center space-x-1.5 transition-all border cursor-pointer shadow-xs active:scale-95 ${
                                isDarkMode
                                  ? 'bg-[#141414] hover:bg-[#222222] text-gray-200 hover:text-white border-[#2A2A2A]'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 hover:text-gray-900 border-gray-200/90'
                              }`}
                            >
                              <Copy className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span>{copiedDetailsId === ord.id ? 'Details Copied!' : 'Copy details'}</span>
                            </button>

                            {/* Refill Button (if eligible) */}
                            {(ord.refillStatus === 'none' || !ord.refillStatus) && ord.normStatus === 'completed' && (
                              <button
                                onClick={() => handleRequestRefill(ord.id)}
                                disabled={requestingRefill === ord.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                                  isDarkMode
                                    ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-400'
                                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                                }`}
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${requestingRefill === ord.id ? 'animate-spin' : ''}`} />
                                <span>{requestingRefill === ord.id ? 'Requesting...' : 'Request Refill'}</span>
                              </button>
                            )}

                            {ord.refillStatus === 'requested' && (
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 border ${
                                isDarkMode
                                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Refill In Progress</span>
                              </span>
                            )}
                          </div>

                          {/* Quick Support Ticket Button */}
                          <button
                            onClick={() => {
                              setTicketForm({
                                subject: `Inquiry for Order #${ord.id}`,
                                message: `Hello, I need help with my Order #${ord.id} (${ord.serviceName || ''}) on link: ${ord.link}`
                              });
                              setActiveTab('tickets');
                            }}
                            className={`px-2.5 py-1 text-xs flex items-center space-x-1 transition-colors cursor-pointer ${
                              isDarkMode ? 'text-gray-400 hover:text-[#FF3030]' : 'text-gray-500 hover:text-red-600'
                            }`}
                          >
                            <Headphones className="w-3.5 h-3.5 text-[#FF3030]" />
                            <span>Report Issue</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className={`p-12 text-center rounded-3xl border ${
                    isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-gray-400 shadow-xl' : 'bg-white border-gray-200 text-gray-500'
                  }`}>
                    <Package className="w-12 h-12 mx-auto text-gray-400/60 mb-3" />
                    <h3 className={`text-base font-extrabold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>No Orders Found</h3>
                    <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {orderSearchQuery || orderStatusFilter !== 'all'
                        ? 'No orders match your filter criteria.'
                        : 'You haven’t placed any orders yet.'}
                    </p>
                    {orderSearchQuery || orderStatusFilter !== 'all' ? (
                      <button
                        onClick={() => {
                          setOrderSearchQuery('');
                          setOrderStatusFilter('all');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#222222] border border-[#2A2A2A] text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center space-x-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Filters</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('new-order')}
                        className="px-5 py-2.5 rounded-xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/50 transition-all cursor-pointer inline-flex items-center space-x-2"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Place New Order</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* ========================================================================= */}
          {/* TAB 4: SERVICES CATALOG */}
          {/* ========================================================================= */}
          {activeTab === 'services' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl border p-4 sm:p-6 space-y-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className={`text-lg sm:text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Services Catalog</h2>
                  <p className="text-xs text-gray-400">Search over {services.length}+ active reseller services with instant speeds</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search services by name or #ID..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className={`w-full pl-10 pr-8 py-2.5 min-h-[44px] rounded-2xl text-base sm:text-xs font-bold focus:outline-none focus:border-[#FF3030] border ${
                      isDarkMode
                        ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  {serviceSearch && (
                    <button
                      type="button"
                      onClick={() => setServiceSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#282828]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                      isDarkMode ? 'bg-[#141414] border-[#282828] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Service Name</th>
                      <th className="px-4 py-3 text-right">Rate / 1K</th>
                      <th className="px-4 py-3 text-center">Min / Max</th>
                      <th className="px-4 py-3 text-center">Speed & Time</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-[#262626]' : 'divide-gray-100'}`}>
                    {filteredCatalogServices.length > 0 ? (
                      filteredCatalogServices.map((s) => {
                        const timing = s.timing;
                        return (
                          <tr key={s.id} className={`transition-colors ${isDarkMode ? 'hover:bg-[#222222]' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-mono font-bold text-gray-400">#{s.id}</td>
                            <td className={`px-4 py-3 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              <span>{s.name}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-400">{formatAmount(s.pricePerThousand)}</td>
                            <td className="px-4 py-3 text-center font-mono text-gray-400">{s.minAmount} / {s.maxAmount}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-mono text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  ⚡ {timing.speed.split('/')[0].trim()}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  ⏱️ {timing.completionHours.split('(')[0].trim()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setNewOrder({ categoryId: String(s.categoryId), serviceId: String(s.id), link: '', quantity: '', coupon: '' });
                                  setActiveTab('new-order');
                                }}
                                className="px-4 py-2 min-h-[38px] rounded-xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-[11px] uppercase tracking-wider shadow-sm shadow-red-950/40 cursor-pointer transition-all active:scale-95"
                              >
                                Order
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400">
                          <p className="text-sm font-bold text-white mb-1">No services found matching "{serviceSearch}"</p>
                          <button
                            type="button"
                            onClick={() => setServiceSearch('')}
                            className="mt-2 text-xs font-bold text-[#FF3030] hover:underline cursor-pointer"
                          >
                            Clear Search Filter
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: ADD FUNDS */}
          {/* ========================================================================= */}
          {activeTab === 'add-funds' && (
            <AddFundsSection
              token={token}
              user={user}
              publicSettings={publicSettings}
              onRefreshProfile={onRefreshProfile}
              isDarkMode={isDarkMode}
              currency={currency}
              formatAmount={formatAmount}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 6: TICKETS */}
          {/* ========================================================================= */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 rounded-3xl p-6 sm:p-8 border shadow-xl ${
                isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'
              }`}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Support Tickets</h2>
                    <p className="text-xs text-gray-400">24/7 dedicated customer assistance</p>
                  </div>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-4 mb-8">
                  <div>
                    <label className={`block text-[11px] font-extrabold uppercase mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Order #1234 Refill Request"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF3030] border shadow-xs ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-extrabold uppercase mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Message</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe your issue or order details..."
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF3030] border shadow-xs ${
                        isDarkMode
                          ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 transition-all cursor-pointer"
                  >
                    {loading ? 'Submitting...' : 'Open New Ticket'}
                  </button>
                </form>

                <div className={`border-t pt-6 ${isDarkMode ? 'border-[#262626]' : 'border-gray-200'}`}>
                  <div className={`font-black text-sm mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Past Tickets</div>
                  <div className="space-y-3">
                    {tickets.length > 0 ? (
                      tickets.map((t) => (
                        <div key={t.id} className={`p-4 rounded-2xl border text-xs flex justify-between items-center ${
                          isDarkMode ? 'bg-[#141414] border-[#262626]' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div>
                            <div className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>#{t.id} - {t.subject}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{t.message}</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            t.status === 'closed' 
                              ? (isDarkMode ? 'bg-zinc-800 text-gray-400' : 'bg-gray-200 text-gray-700')
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-xs py-4">No support tickets opened yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: API DOCUMENTATION & KEY */}
          {/* ========================================================================= */}
          {activeTab === 'api-docs' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 sm:p-8 border space-y-6 max-w-4xl`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reseller API Credentials & Docs</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Connect your website or panel to YouthSMM seamlessly using standard SMM API v2</p>
                </div>
              </div>

              {/* 1. API URL Box (Placed on TOP of API Key) */}
              <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'} border space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-[#FF3030]" />
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      API URL (Endpoint)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    HTTP POST
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/v2`}
                    className={`flex-1 px-4 py-2.5 rounded-2xl ${
                      isDarkMode ? 'bg-[#101010] border-[#262626] text-emerald-400' : 'bg-white border-gray-300 text-emerald-700'
                    } border font-mono text-xs font-bold select-all`}
                  />
                  <button
                    onClick={() => {
                      const apiUrl = `${window.location.origin}/api/v2`;
                      navigator.clipboard.writeText(apiUrl);
                      setCopiedApiUrl(true);
                      showSuccess('API URL copied to clipboard!');
                      setTimeout(() => setCopiedApiUrl(false), 2000);
                    }}
                    className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs cursor-pointer flex items-center space-x-1.5 transition-all ${
                      copiedApiUrl
                        ? 'bg-emerald-600 text-white'
                        : isDarkMode
                        ? 'bg-[#202020] hover:bg-[#282828] text-gray-200 border border-[#2D2D2D]'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedApiUrl ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              {/* 2. API Key Box (Placed under API URL) */}
              <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'} border space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Your API Secret Key
                    </span>
                  </div>
                  {user.apiKey && (
                    <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                      Keep Secret
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    readOnly
                    value={user.apiKey || 'No API key generated yet. Click Generate below.'}
                    className={`flex-1 px-4 py-2.5 rounded-2xl ${
                      isDarkMode ? 'bg-[#101010] border-[#262626] text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                    } border font-mono text-xs font-bold select-all`}
                  />
                  <button
                    onClick={() => {
                      if (user.apiKey) {
                        navigator.clipboard.writeText(user.apiKey);
                        setCopiedApiKey(true);
                        showSuccess('API Key copied to clipboard!');
                        setTimeout(() => setCopiedApiKey(false), 2000);
                      }
                    }}
                    disabled={!user.apiKey}
                    className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs cursor-pointer flex items-center space-x-1.5 transition-all ${
                      copiedApiKey
                        ? 'bg-emerald-600 text-white'
                        : isDarkMode
                        ? 'bg-[#202020] hover:bg-[#282828] text-gray-200 border border-[#2D2D2D]'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedApiKey ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={generatingApiKey}
                    className="px-4 py-2.5 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] active:scale-95 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-red-950/40 flex items-center space-x-1.5 transition-all shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingApiKey ? 'animate-spin' : ''}`} />
                    <span>{generatingApiKey ? 'Generating...' : user.apiKey ? 'Regenerate' : 'Generate Key'}</span>
                  </button>
                </div>
              </div>

              {/* 3. API Endpoint Documentation */}
              <div className="space-y-4 pt-2">
                <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>HTTP API Endpoints & Request Examples</div>
                <div className="p-5 rounded-2xl bg-[#101010] border border-[#262626] text-gray-100 font-mono text-xs space-y-3 overflow-x-auto shadow-inner">
                  <div className="text-emerald-400 font-bold flex items-center gap-2">
                    <span># API Endpoint URL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 text-emerald-300 font-semibold border border-white/5">
                    POST {window.location.origin}/api/v2
                  </div>

                  <div className="text-emerald-400 font-bold pt-2"># Request Parameters (Add Order)</div>
                  <div className="text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                    <div><span className="text-[#FF4D4D] font-bold">key</span> = {user.apiKey ? user.apiKey.slice(0, 10) + '...' : 'YOUR_API_KEY'}</div>
                    <div><span className="text-[#FF4D4D] font-bold">action</span> = add</div>
                    <div><span className="text-[#FF4D4D] font-bold">service</span> = 101</div>
                    <div><span className="text-[#FF4D4D] font-bold">link</span> = https://instagram.com/p/123</div>
                    <div><span className="text-[#FF4D4D] font-bold">quantity</span> = 1000</div>
                  </div>

                  <div className="text-emerald-400 font-bold pt-2"># Request Parameters (Order Status)</div>
                  <div className="text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                    <div><span className="text-[#FF4D4D] font-bold">key</span> = {user.apiKey ? user.apiKey.slice(0, 10) + '...' : 'YOUR_API_KEY'}</div>
                    <div><span className="text-[#FF4D4D] font-bold">action</span> = status</div>
                    <div><span className="text-[#FF4D4D] font-bold">order</span> = 10542</div>
                  </div>

                  <div className="text-emerald-400 font-bold pt-2"># Request Parameters (User Balance)</div>
                  <div className="text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                    <div><span className="text-[#FF4D4D] font-bold">key</span> = {user.apiKey ? user.apiKey.slice(0, 10) + '...' : 'YOUR_API_KEY'}</div>
                    <div><span className="text-[#FF4D4D] font-bold">action</span> = balance</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: AFFILIATE / REFER & EARN */}
          {/* ========================================================================= */}
          {activeTab === 'affiliate' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 sm:p-8 border max-w-3xl space-y-6`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{publicSettings.affiliateTitle || 'Affiliate Referral Program'}</h2>
                  <p className="text-xs text-gray-400">{publicSettings.affiliateSubtitle || 'Earn 5% lifetime commission on every deposit by referred users'}</p>
                </div>
              </div>

              <div className={`p-5 rounded-3xl border space-y-3 ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-purple-50 border-purple-200'}`}>
                <div className={`text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-[#FF4D4D]' : 'text-purple-900'}`}>Your Referral Link</div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?ref=${user.id || 15}`}
                    className={`flex-1 px-4 py-2.5 rounded-2xl font-mono text-xs font-bold ${
                      isDarkMode ? 'bg-[#101010] border-[#262626] text-white' : 'bg-white border-purple-300 text-gray-900'
                    } border`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.id || 15}`);
                      showSuccess('Referral link copied!');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 cursor-pointer transition-all"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: REFILL HISTORY */}
          {/* ========================================================================= */}
          {activeTab === 'refill-history' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 sm:p-8 border space-y-6`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Refill Requests History</h2>
                  <p className="text-xs text-gray-400">Track and monitor your automatic refill warranty tasks</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase ${isDarkMode ? 'border-[#282828] text-gray-400' : 'border-gray-200 text-gray-400'}`}>
                      <th className="pb-3">Refill ID</th>
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Service</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-[#262626] text-gray-200' : 'divide-gray-100 text-gray-700'}`}>
                    {refillRequestsList.length > 0 ? (
                      refillRequestsList.map((r, idx) => (
                        <tr key={idx} className={isDarkMode ? 'hover:bg-[#222222]' : 'hover:bg-gray-50'}>
                          <td className={`py-3 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>#{r.id || idx + 101}</td>
                          <td className={`py-3 font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>#{r.orderId}</td>
                          <td className={`py-3 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{r.serviceName || 'Refill Task'}</td>
                          <td className="py-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400">
                              {r.status || 'Processing'}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400 font-mono text-[11px]">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Just now'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No refill requests found. Click Refill button on any eligible completed order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 10: CHILD PANELS */}
          {/* ========================================================================= */}
          {activeTab === 'child-panels' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 rounded-3xl p-6 sm:p-8 border shadow-xl ${
                isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'
              } space-y-6`}>
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{publicSettings.childPanelTitle || 'Rent a Child Panel'}</h2>
                    <p className="text-xs text-gray-400">{publicSettings.childPanelDescription || 'Start your own automated SMM panel website connected to our provider API'}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-[#141414] border-[#282828] text-gray-200' : 'bg-teal-50 border-teal-200 text-teal-900'}`}>
                  <span className="font-extrabold">Price: </span>
                  <span className="font-black text-sm text-[#FF4D4D]">{publicSettings.childPanelPrice || '₹ 1,500 / month'}</span>
                  <p className="text-[11px] text-gray-400 mt-1">Set your nameservers to: <span className="font-mono font-bold text-gray-200">{publicSettings.childPanelNameservers || 'ns1.youthsmm.com & ns2.youthsmm.com'}</span></p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setOrderingChildPanel(true);
                    setTimeout(() => {
                      setOrderingChildPanel(false);
                      setChildPanelsList([
                        ...childPanelsList,
                        { id: Date.now(), domain: childPanelForm.domain, currency: childPanelForm.currency, status: 'Active', createdAt: new Date().toISOString() }
                      ]);
                      setChildPanelForm({ domain: '', currency: 'INR', adminUsername: '', adminPassword: '' });
                      showSuccess('Child panel order placed successfully! DNS propagation takes 1-2 hours.');
                    }, 1000);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={`block text-[11px] font-extrabold uppercase mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Domain Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. my-smm-store.com"
                      value={childPanelForm.domain}
                      onChange={(e) => setChildPanelForm({ ...childPanelForm, domain: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF3030] border shadow-xs ${
                        isDarkMode ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[11px] font-extrabold uppercase mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admin Username</label>
                      <input
                        type="text"
                        required
                        placeholder="admin"
                        value={childPanelForm.adminUsername}
                        onChange={(e) => setChildPanelForm({ ...childPanelForm, adminUsername: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF3030] border shadow-xs ${
                          isDarkMode ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-extrabold uppercase mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admin Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={childPanelForm.adminPassword}
                        onChange={(e) => setChildPanelForm({ ...childPanelForm, adminPassword: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF3030] border shadow-xs ${
                          isDarkMode ? 'bg-[#141414] border-[#2A2A2A] text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={orderingChildPanel}
                    className="px-6 py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 transition-all cursor-pointer"
                  >
                    {orderingChildPanel ? 'Ordering...' : 'Order Child Panel'}
                  </button>
                </form>
              </div>

              <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 border space-y-4`}>
                <div className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Child Panels</div>
                <div className="space-y-3">
                  {childPanelsList.length > 0 ? (
                    childPanelsList.map((cp) => (
                      <div key={cp.id} className={`p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
                        isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div>
                          <div className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cp.domain}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{cp.currency} Panel</div>
                        </div>
                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs py-8 text-center">No active child panels yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 11: BLOGS & NEWS */}
          {/* ========================================================================= */}
          {activeTab === 'blogs' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 sm:p-8 border space-y-6 max-w-4xl`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Latest Blogs & Industry News</h2>
                  <p className="text-xs text-gray-400">Tips, tutorials, and organic social media growth strategies</p>
                </div>
              </div>

              {selectedBlog ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedBlog(null)}
                    className="text-xs font-bold text-[#FF3030] hover:underline flex items-center space-x-1"
                  >
                    <span>← Back to all posts</span>
                  </button>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBlog.title}</h3>
                  <div className="text-xs text-gray-400 font-mono">
                    Published on {new Date(selectedBlog.createdAt).toLocaleDateString()}
                  </div>
                  <div className={`prose prose-sm leading-relaxed max-w-none pt-4 border-t ${
                    isDarkMode ? 'text-gray-300 border-[#262626]' : 'text-gray-700 border-gray-200'
                  }`}>
                    {selectedBlog.content}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blogs.length > 0 ? (
                    blogs.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBlog(b)}
                        className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-2 group ${
                          isDarkMode
                            ? 'bg-[#141414] hover:bg-[#1E1E1E] border-[#282828] hover:border-[#FF3030]/40'
                            : 'bg-gray-50 hover:bg-gray-100/80 border-gray-200'
                        }`}
                      >
                        <h4 className={`font-extrabold group-hover:text-[#FF3030] transition-colors text-sm line-clamp-2 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {b.title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-3">
                          {b.content}
                        </p>
                        <div className="text-[10px] text-gray-400 font-mono pt-2 flex items-center justify-between">
                          <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                          <span className="text-[#FF3030] font-bold">Read more →</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12 text-gray-400 text-xs">
                      No blog posts published yet. Stay tuned for updates!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 12: FAQ */}
          {/* ========================================================================= */}
          {activeTab === 'faq' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 sm:p-8 border space-y-6 max-w-3xl`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Frequently Asked Questions</h2>
                  <p className="text-xs text-gray-400">Quick answers to common questions about orders, payments & refill</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {publicSettings.faqContent ? (
                  <div className={`p-5 rounded-2xl border whitespace-pre-wrap leading-relaxed ${
                    isDarkMode ? 'bg-[#141414] border-[#282828] text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}>
                    {publicSettings.faqContent}
                  </div>
                ) : (
                  <>
                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How fast do orders start?</div>
                      <p className="text-gray-400 leading-relaxed">Most automated orders start within 0-15 minutes after placing. Speed depends on the specific service guarantee stated in the description.</p>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>What is Refill Warranty?</div>
                      <p className="text-gray-400 leading-relaxed">If you experience natural social media drops within the guarantee duration (e.g. 30 Days Refill), simply open Refill History or submit a ticket and our system will restore the count for free.</p>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1.5 ${
                      isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`font-extrabold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How do I add funds via UPI or Cards?</div>
                      <p className="text-gray-400 leading-relaxed">Navigate to Add Funds tab, enter your desired amount, scan the QR or select your preferred gateway, and enter the transaction reference ID for automatic balance crediting.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: AI CHAT SUPPORT */}
          {/* ========================================================================= */}
          {activeTab === 'ai-chat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <span className="text-[#FF3030]">🤖</span> {publicSettings.websiteName || 'YouthSMM'} AI Assistant
                  </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Ask anything about orders, services, payments, UTR verification, refill warranty, or connect with Telegram
                  </p>
                </div>
              </div>

              <AiChatBot
                isEmbedded={true}
                userId={user.id}
                userName={user.username || user.name || 'User'}
                isDarkMode={isDarkMode}
                latestOrderId={orders && orders.length > 0 ? orders[0].id : undefined}
                onNavigateTab={(tab) => setActiveTab(tab)}
                whatsappNumber={publicSettings.whatsappNumber || '8795005604'}
                telegramUsername={publicSettings.telegramUsername || '@securesmmtursted'}
                telegramChannel={publicSettings.telegramChannel || 'https://t.me/securesmmtursted'}
                websiteName={publicSettings.websiteName || 'YouthSMM'}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 13: CONTACT / SUPPORT */}
          {/* ========================================================================= */}
          {activeTab === 'contact-us' && (
            <div className={`${isDarkMode ? 'bg-[#1C1C1C] border-[#292929] text-white shadow-xl shadow-black/40' : 'bg-white border-gray-200/90 text-gray-900 shadow-xs'} rounded-3xl p-6 sm:p-8 border space-y-6 max-w-3xl`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Direct Support Channels</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reach our 24/7 AI smart assistant or human customer support specialists</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp Support Direct Channel */}
                <a
                  href={`https://wa.me/91${(publicSettings.whatsappNumber || '8795005604').replace(/[^0-9]/g, '') || '8795005604'}?text=${encodeURIComponent(`Hello ${publicSettings.websiteName || 'YouthSMM'} Support, I need help with my account.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-emerald-500/30 hover:bg-[#1E1E1E]' : 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200'} border transition-all flex items-center space-x-4 cursor-pointer group`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm">
                    <WhatsAppIcon className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center space-x-1">
                      <span>WhatsApp Support</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className={`font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>
                      +91 {publicSettings.whatsappNumber || '8795005604'}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">24x7 Live Direct Chat & Orders Help</div>
                  </div>
                </a>

                {/* YouthSMM AI Assistant */}
                <div
                  onClick={() => setActiveTab('ai-chat')}
                  className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-[#FF3030]/30 hover:bg-[#1E1E1E]' : 'bg-red-50 hover:bg-red-100/80 border-red-200'} border transition-all flex items-center space-x-4 cursor-pointer group`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF3030] to-rose-600 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm shadow-red-950/40">
                    🤖
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-[#FF4D4D] flex items-center space-x-1">
                      <span>YouthSMM AI Assistant</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className={`font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>24x7 Instant AI Bot</div>
                    <div className="text-[10px] text-[#FF4D4D] font-semibold">Live Order Status & Guidance</div>
                  </div>
                </div>

                {/* Telegram */}
                <a
                  href={publicSettings.telegramUsername ? (publicSettings.telegramUsername.startsWith('http') ? publicSettings.telegramUsername : `https://t.me/${publicSettings.telegramUsername.replace('@', '')}`) : 'https://t.me/securesmmtursted'}
                  target="_blank"
                  rel="noreferrer"
                  className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-sky-500/30 hover:bg-[#1E1E1E]' : 'bg-sky-50 hover:bg-sky-100/80 border-sky-200'} border transition-all flex items-center space-x-4 cursor-pointer group`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm">
                    ✈️
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-sky-400">Telegram Channel</div>
                    <div className={`font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>{publicSettings.telegramUsername || '@securesmmtursted'}</div>
                    <div className="text-[10px] text-sky-400 font-semibold">Official Updates & Support</div>
                  </div>
                </a>

                {/* Email Support */}
                <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-purple-500/30' : 'bg-purple-50 border-purple-200'} border flex items-center space-x-4`}>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                    ✉️
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-purple-400">Email Helpdesk</div>
                    <div className={`font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} text-xs truncate max-w-[180px]`}>
                      {publicSettings.supportEmail || 'support@youthsmm.com'}
                    </div>
                    <div className="text-[10px] text-purple-400 font-semibold">{publicSettings.supportWorkingHours || '24x7 Customer Helpdesk'}</div>
                  </div>
                </div>

                {/* Open Ticket Button */}
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`p-5 rounded-3xl ${isDarkMode ? 'bg-[#141414] border-rose-500/30 hover:bg-[#1E1E1E]' : 'bg-rose-50 hover:bg-rose-100/80 border-rose-200'} border transition-all flex items-center space-x-4 text-left cursor-pointer group`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm shadow-red-950/40">
                    🎫
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-rose-400">Support Ticket</div>
                    <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm`}>Open High Priority Ticket</div>
                    <div className="text-[10px] text-rose-400 font-semibold">Guaranteed Human Reply</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. REWARDS & LEVELS MODAL */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 3. REWARDS & LEVELS MODAL */}
      {/* ========================================================================= */}
      {showRewardsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#2D2D2D] text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative`}>
            <button
              onClick={() => setShowRewardsModal(false)}
              className={`absolute right-5 top-5 w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#141414] hover:bg-[#222222] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center font-bold cursor-pointer`}
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rewards & Level Tier</h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Spend more to unlock instant VIP discounts & free wallet credits</p>
              </div>
            </div>

            <div className="space-y-3 my-6 text-xs font-semibold">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div>
                  <div className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>🥉 {publicSettings.sidebarLevelName || 'Bronze Level 3'} (Current)</div>
                  <div className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{publicSettings.sidebarXpText || '66/120 XP'} &middot; {publicSettings.level1Perk || 'Standard Rates'}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-600/20 text-emerald-400 font-bold text-[10px]">Active</span>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between opacity-80 ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div>
                  <div className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>🥈 Silver Reseller</div>
                  <div className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{publicSettings.level2Perk || '300 XP · 2% Lifetime Discount'}</div>
                </div>
                <span className="text-[10px] text-gray-400 font-bold">Locked</span>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between opacity-80 ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div>
                  <div className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>🥇 Gold VIP</div>
                  <div className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{publicSettings.level3Perk || '1000 XP · 5% Lifetime Discount'}</div>
                </div>
                <span className="text-[10px] text-gray-400 font-bold">Locked</span>
              </div>
            </div>

            <button
              onClick={() => setShowRewardsModal(false)}
              className="w-full py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TERMS & CONDITIONS MODAL */}
      {/* ========================================================================= */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#2D2D2D] text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-left max-h-[85vh] flex flex-col`}>
            <button
              onClick={() => setShowTermsModal(false)}
              className={`absolute right-5 top-5 w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#141414] hover:bg-[#222222] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center font-bold cursor-pointer`}
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Terms of Service</h3>
                <p className="text-xs text-gray-400">{publicSettings.websiteName || 'YouthSMM'} User Agreement & Policies</p>
              </div>
            </div>

            <div className={`overflow-y-auto flex-1 pr-2 text-xs space-y-4 leading-relaxed font-normal ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {publicSettings.termsOfService ? (
                <div className="whitespace-pre-wrap">{publicSettings.termsOfService}</div>
              ) : (
                <>
                  <p>1. By placing an order with {publicSettings.websiteName || 'YouthSMM'}, you automatically accept all the below listed terms of services whether you read them or not.</p>
                  <p>2. We reserve the right to change these terms of service without notice. You are expected to read all terms before placing every order to ensure you are up to date with any changes.</p>
                  <p>3. {publicSettings.websiteName || 'YouthSMM'} rates are subject to change at any time without notice. The payment/refund policy stays in effect in the case of rate changes.</p>
                  <p>4. Disclaimer: {publicSettings.websiteName || 'YouthSMM'} will not be responsible for any damages you or your business may suffer.</p>
                </>
              )}
            </div>

            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full mt-6 py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 cursor-pointer transition-all"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRIVACY POLICY MODAL */}
      {/* ========================================================================= */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#2D2D2D] text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-left max-h-[85vh] flex flex-col`}>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className={`absolute right-5 top-5 w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#141414] hover:bg-[#222222] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center font-bold cursor-pointer`}
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Privacy Policy</h3>
                <p className="text-xs text-gray-400">How we protect your confidential account information</p>
              </div>
            </div>

            <div className={`overflow-y-auto flex-1 pr-2 text-xs space-y-4 leading-relaxed font-normal ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {publicSettings.privacyPolicy ? (
                <div className="whitespace-pre-wrap">{publicSettings.privacyPolicy}</div>
              ) : (
                <>
                  <p>1. We strictly protect and value your privacy. All your personal data is handled securely and will never be shared with or sold to third parties.</p>
                  <p>2. We only use your information (such as email and order links) to process your orders, deliver customer support, and communicate essential panel updates.</p>
                  <p>3. All payment transaction data is encrypted and processed through certified PCI-DSS compliant payment gateways.</p>
                </>
              )}
            </div>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full mt-6 py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABOUT US MODAL */}
      {/* ========================================================================= */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#2D2D2D] text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-left max-h-[85vh] flex flex-col`}>
            <button
              onClick={() => setShowAboutModal(false)}
              className={`absolute right-5 top-5 w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#141414] hover:bg-[#222222] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center font-bold cursor-pointer`}
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>About {publicSettings.websiteName || 'YouthSMM'}</h3>
                <p className="text-xs text-gray-400">Automated Social Media Growth & SMM Reseller Platform</p>
              </div>
            </div>

            <div className={`overflow-y-auto flex-1 pr-2 text-xs space-y-4 leading-relaxed font-normal ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>What is {publicSettings.websiteName || 'YouthSMM'}?</h4>
                <p>
                  <strong>{publicSettings.websiteName || 'YouthSMM'}</strong> is a high-speed, automated Social Media Marketing (SMM) reseller panel. We provide high-retention promotion packages for Instagram, YouTube, Facebook, Telegram, TikTok, and Twitter/X with instant execution.
                </p>
              </div>

              <div>
                <h4 className={`font-bold text-xs mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Key Features & Services:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="font-bold text-[#FF3030]">⚡ Automated 24/7 Delivery:</span> High-speed API execution with real-time order tracking.
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="font-bold text-emerald-400">💰 Wholesale Rates:</span> Starting from just ₹1 per 1,000 interactions with zero hidden fees.
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="font-bold text-blue-400">🔒 100% Safe:</span> No account password needed. Only public post or profile link required.
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#141414] border-[#282828]' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="font-bold text-purple-400">🔌 Reseller API:</span> Seamless REST API integration for automated resellers and child panels.
                  </div>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-[11px] ${isDarkMode ? 'bg-[#FF3030]/10 border-[#FF3030]/20 text-red-200' : 'bg-red-50 border-red-100 text-red-900'}`}>
                <strong>24/7 Support:</strong> Need assistance with an order? Open a support ticket or join our Telegram channel at <strong>@securesmmtursted</strong>.
              </div>
            </div>

            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full mt-6 py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ACCOUNT SETTINGS MODAL */}
      {/* ========================================================================= */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`${isDarkMode ? 'bg-[#1C1C1C] border border-[#2D2D2D] text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-left`}>
            <button
              onClick={() => setShowAccountModal(false)}
              className={`absolute right-5 top-5 w-8 h-8 rounded-full ${isDarkMode ? 'bg-[#141414] hover:bg-[#222222] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center font-bold cursor-pointer`}
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#FF3030] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Profile</h3>
                <p className="text-xs text-gray-400">Manage your credentials and information</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-gray-400 font-bold uppercase text-[10px]">Email Address</label>
                <input
                  type="text"
                  readOnly
                  value={user.email}
                  className={`w-full mt-1 px-4 py-2.5 rounded-2xl font-bold ${
                    isDarkMode ? 'bg-[#141414] border border-[#2A2A2A] text-white' : 'bg-gray-100 border border-gray-200 text-gray-700'
                  }`}
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold uppercase text-[10px]">Account Role</label>
                <input
                  type="text"
                  readOnly
                  value={user.role === 'admin' ? 'Administrator' : 'Standard User'}
                  className={`w-full mt-1 px-4 py-2.5 rounded-2xl font-bold uppercase ${
                    isDarkMode ? 'bg-[#141414] border border-[#2A2A2A] text-white' : 'bg-gray-100 border border-gray-200 text-gray-700'
                  }`}
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold uppercase text-[10px]">Wallet Balance</label>
                <div className={`w-full mt-1 px-4 py-2.5 rounded-2xl border font-mono font-black text-sm ${
                  isDarkMode ? 'bg-[#141414] border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}>
                  {formatAmount(user.balance)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAccountModal(false)}
              className="w-full mt-6 py-3 rounded-2xl bg-[#FF3030] hover:bg-[#E02424] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-950/40 cursor-pointer transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Quick Bar (5-Item Layout with Raised Center Floating Funds Button) */}
      <nav
        aria-label="Mobile Navigation"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-4 pt-2 border-t transition-colors duration-200 ${
          isDarkMode
            ? 'bg-[#141414]/95 border-[#242424] text-gray-400 shadow-[0_-4px_25px_rgba(0,0,0,0.5)] backdrop-blur-md'
            : 'bg-[#FFFDF9]/95 border-[#EAE3D2] text-stone-500 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] backdrop-blur-md'
        }`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 items-end justify-items-center w-full max-w-md mx-auto">
          {/* 1. New Order */}
          <button
            type="button"
            onClick={() => setActiveTab('new-order')}
            className={`w-full flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-90 cursor-pointer ${
              activeTab === 'new-order'
                ? 'text-[#FF3030] font-bold'
                : isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Zap className={`w-5 h-5 transition-transform ${activeTab === 'new-order' ? 'scale-110 fill-[#FF3030]/20' : ''}`} />
            <span className="text-[11px] mt-1 font-semibold tracking-tight truncate">New</span>
          </button>

          {/* 2. Orders */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`w-full flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-90 cursor-pointer ${
              activeTab === 'orders'
                ? 'text-[#FF3030] font-bold'
                : isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Package className={`w-5 h-5 transition-transform ${activeTab === 'orders' ? 'scale-110' : ''}`} />
            <span className="text-[11px] mt-1 font-semibold tracking-tight truncate">Orders</span>
          </button>

          {/* 3. Center Floating Funds Button */}
          <button
            type="button"
            onClick={() => setActiveTab('add-funds')}
            className="w-full flex flex-col items-center justify-center -mt-6 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#FF3030] to-[#E02424] text-white flex items-center justify-center shadow-lg shadow-red-950/60 transition-all duration-200 active:scale-90 group-hover:scale-105 ring-4 ${
                isDarkMode ? 'ring-[#141414]' : 'ring-white'
              } ${activeTab === 'add-funds' ? 'ring-[#FF3030]/40' : ''}`}
            >
              <Plus className="w-7 h-7 stroke-[2.75] text-white" />
            </div>
            <span
              className={`text-[11px] mt-1 font-bold tracking-tight truncate transition-colors ${
                activeTab === 'add-funds'
                  ? 'text-[#FF3030]'
                  : isDarkMode
                  ? 'text-gray-400'
                  : 'text-gray-500'
              }`}
            >
              Funds
            </span>
          </button>

          {/* 4. Services */}
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`w-full flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-90 cursor-pointer ${
              activeTab === 'services'
                ? 'text-[#FF3030] font-bold'
                : isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers className={`w-5 h-5 transition-transform ${activeTab === 'services' ? 'scale-110' : ''}`} />
            <span className="text-[11px] mt-1 font-semibold tracking-tight truncate">Services</span>
          </button>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`w-full flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-90 cursor-pointer ${
              mobileMenuOpen || ['tickets', 'ai-chat', 'refill-history', 'child-panels', 'affiliate', 'blogs', 'faq', 'contact-us', 'api-docs'].includes(activeTab)
                ? 'text-[#FF3030] font-bold'
                : isDarkMode
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Menu className="w-5 h-5 transition-transform" />
            <span className="text-[11px] mt-1 font-semibold tracking-tight truncate">More</span>
          </button>
        </div>
      </nav>

      {/* Floating Left Side WhatsApp Support Button */}
      <WhatsAppSupportButton
        phoneNumber={publicSettings.whatsappNumber || '8795005604'}
        isDarkMode={isDarkMode}
        websiteName={publicSettings.websiteName || 'YouthSMM'}
        userName={user.username || user.name || 'User'}
      />

      {/* Floating YouthSMM AI Chat Assistant */}
      <AiChatBot
        isEmbedded={false}
        userId={user.id}
        userName={user.username || user.name || 'User'}
        isDarkMode={isDarkMode}
        latestOrderId={orders && orders.length > 0 ? orders[0].id : undefined}
        onNavigateTab={(tab) => setActiveTab(tab)}
        whatsappNumber={publicSettings.whatsappNumber || '8795005604'}
        telegramUsername={publicSettings.telegramUsername || '@securesmmtursted'}
        telegramChannel={publicSettings.telegramChannel || 'https://t.me/securesmmtursted'}
        websiteName={publicSettings.websiteName || 'YouthSMM'}
      />
    </div>
  );
};

export default UserDashboard;

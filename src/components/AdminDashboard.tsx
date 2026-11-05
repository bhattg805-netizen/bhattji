import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Users,
  Coins,
  TrendingUp,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Megaphone,
  Ticket,
  Percent,
  List,
  FileText,
  UserCheck,
  Globe,
  RotateCcw,
  Clock,
  Shield,
  Activity,
  Settings,
  Sliders,
  Palette,
  Trash2,
  Sun,
  Moon,
  BookOpen,
  QrCode,
  Smartphone,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Music,
  Send,
  DollarSign,
  Award,
  Sparkles,
  HelpCircle,
  Layers,
  MessageSquare,
  Share2,
  Wallet,
  ShieldCheck,
  Save,
  LogIn,
  Calendar,
  Database,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  ExternalLink,
  ArrowRight,
  Eye,
  Info,
} from 'lucide-react';
import { User, Category, Service, Order, Ticket as TicketType, Coupon, Announcement, ActivityLog, Appointment } from '../types.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';
import { PRESET_ICONS, getCategoryIcon } from '../lib/icons.tsx';
import { BharatPePaymentsLedger } from './BharatPePaymentsLedger.tsx';
import { PaymentSettingsManager } from './PaymentSettingsManager.tsx';
import { PromoBannerManager } from './PromoBannerManager.tsx';

interface AdminDashboardProps {
  token: string;
  onGoToUserView: () => void;
  onRefreshProfile?: () => void;
  onLoginAsUser?: (targetToken: string, targetUser: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onGoToUserView, onRefreshProfile, onLoginAsUser }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const ordersTableScrollRef = useRef<HTMLDivElement>(null);
  const usersTableScrollRef = useRef<HTMLDivElement>(null);
  type AdminThemeMode = 'espresso' | 'dark' | 'light';
  const [adminTheme, setAdminTheme] = useState<AdminThemeMode>(() => {
    const saved = localStorage.getItem('admin_theme') as AdminThemeMode;
    return saved || 'espresso';
  });

  const selectAdminTheme = (theme: AdminThemeMode) => {
    setAdminTheme(theme);
    localStorage.setItem('admin_theme', theme);
  };

  const toggleAdminTheme = () => {
    const nextTheme: AdminThemeMode = adminTheme === 'espresso' ? 'dark' : adminTheme === 'dark' ? 'light' : 'espresso';
    selectAdminTheme(nextTheme);
  };

  // Stats / Analytics state
  const [stats, setStats] = useState({
    usersCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    totalDeposited: 0,
    todayRevenue: 0,
    todayOrdersCount: 0,
    todayDeposited: 0,
    todayDepositsCount: 0,
    pendingDepositsCount: 0,
    pendingDepositsAmount: 0,
    statusChart: [] as { status: string; count: number }[],
  });

  // Main data states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Child panels and refill requests state
  const [childPanels, setChildPanels] = useState<any[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  const [dispatchingOrderId, setDispatchingOrderId] = useState<number | null>(null);
  
  // SMM API Providers States
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [newProvider, setNewProvider] = useState({ name: '', apiUrl: '', apiKey: '' });
  const [selectedProviderForEdit, setSelectedProviderForEdit] = useState<any | null>(null);
  const [providerIdToDelete, setProviderIdToDelete] = useState<number | null>(null);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<number | null>(null);
  const [serviceIdToDelete, setServiceIdToDelete] = useState<number | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);

  // Provider Connection & Balance States (Connected in blue, Disconnected in red, Insufficient Balance in amber)
  const [providerStatuses, setProviderStatuses] = useState<Record<number, {
    connected: boolean;
    balance: number | null;
    balanceUnknown: boolean;
    insufficientBalance: boolean;
    error?: string;
    loading?: boolean;
  }>>({});

  // Single Order Sync & Detailed Provider Telemetry Modal States
  const [syncingSingleOrderId, setSyncingSingleOrderId] = useState<number | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [blogsList, setBlogsList] = useState<any[]>([]);
  const [fetchingBlogs, setFetchingBlogs] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'published',
    coverImage: '',
  });
  const [selectedBlogForEdit, setSelectedBlogForEdit] = useState<any | null>(null);
  const [savingBlog, setSavingBlog] = useState(false);
  const [blogIdToDelete, setBlogIdToDelete] = useState<number | null>(null);
  const [blogEditorOpen, setBlogEditorOpen] = useState(false);

  // Modals & Forms states
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryIcon, setEditingCategoryIcon] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // SMM Services Search & Bulk Delete States
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('');
  const [serviceProviderFilter, setServiceProviderFilter] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [showBulkDeleteServicesConfirm, setShowBulkDeleteServicesConfirm] = useState(false);
  const [newService, setNewService] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    min: '10',
    max: '10000',
    providerId: '',
    providerServiceId: '',
    icon: '',
  });
  
  // Editing Service State
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<Service | null>(null);

  // SMM Provider Services Importer State
  const [serviceSubTab, setServiceSubTab] = useState<'catalog' | 'importer'>('catalog');
  const [selectedImporterProviderId, setSelectedImporterProviderId] = useState<string>('');
  const [importerServices, setImporterServices] = useState<any[]>([]);
  const [importerLoading, setImporterLoading] = useState<boolean>(false);
  const [importerError, setImporterError] = useState<string>('');
  const [importerSearchQuery, setImporterSearchQuery] = useState<string>('');
  const [selectedImporterServiceIds, setSelectedImporterServiceIds] = useState<Set<any>>(new Set());
  const [priceMultiplier, setPriceMultiplier] = useState<string>('1.5');

  const handleFetchProviderServices = async (providerId: string) => {
    if (!providerId) {
      setImporterServices([]);
      return;
    }
    setImporterLoading(true);
    setImporterError('');
    setSelectedImporterServiceIds(new Set());
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setImporterServices(data);
      } else {
        setImporterError(data.error || 'Failed to fetch provider services.');
      }
    } catch (err: any) {
      setImporterError(err.message || 'Error loading services.');
    } finally {
      setImporterLoading(false);
    }
  };

  const handleImportSelectedServices = async () => {
    if (selectedImporterServiceIds.size === 0) {
      showError('Please select at least one service to import.');
      return;
    }
    const servicesToImport = importerServices.filter(item => 
      selectedImporterServiceIds.has(item.service)
    );

    try {
      const res = await fetch('/api/admin/services/import-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          services: servicesToImport,
          providerId: parseInt(selectedImporterProviderId),
          priceMultiplier: parseFloat(priceMultiplier) || 1.0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Successfully imported ${data.count} services!`);
        setSelectedImporterServiceIds(new Set());
        // Refresh SMM services list
        fetchAdminData();
      } else {
        showError(data.error || 'Failed to import services.');
      }
    } catch (err: any) {
      showError(err.message || 'Error during import.');
    }
  };

  const toggleSelectAllImporterServices = (filteredServices: any[]) => {
    const newSelected = new Set(selectedImporterServiceIds);
    const allFilteredSelected = filteredServices.every(item => newSelected.has(item.service));
    
    if (allFilteredSelected) {
      filteredServices.forEach(item => newSelected.delete(item.service));
    } else {
      filteredServices.forEach(item => newSelected.add(item.service));
    }
    setSelectedImporterServiceIds(newSelected);
  };

  // Manual Seller Sync States
  const [selectedSyncProviderId, setSelectedSyncProviderId] = useState<string>('');
  const [syncScope, setSyncScope] = useState<'all' | 'new_only' | 'price_only' | 'selected'>('all');
  const [syncProfitPercentage, setSyncProfitPercentage] = useState<string>('30');
  const [syncPreviewServices, setSyncPreviewServices] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string>('');
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ addedCount: number; updatedCount: number; skippedCount: number; totalProcessed: number } | null>(null);
  const [selectedSyncServiceIds, setSelectedSyncServiceIds] = useState<Set<string>>(new Set());
  const [manualSyncIdsStr, setManualSyncIdsStr] = useState<string>('');
  const [syncSearchQuery, setSyncSearchQuery] = useState<string>('');

  // Admin SMM Order Sync Cron Job States
  const [cronState, setCronState] = useState<{
    lastRun: string | null;
    runCount: number;
    status: 'idle' | 'running' | 'success' | 'failed';
    lastSyncedCount: number;
    error: string | null;
    intervalMs: number;
    isActive: boolean;
  } | null>(null);
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState<string>('2');
  const [updatingCronSettings, setUpdatingCronSettings] = useState<boolean>(false);
  const [triggeringCron, setTriggeringCron] = useState<boolean>(false);

  const [selectedSyncCategory, setSelectedSyncCategory] = useState<string>('');
  const [selectedSyncQuickService, setSelectedSyncQuickService] = useState<string>('');

  const uniqueSyncCategories = useMemo(() => {
    if (!selectedSyncProviderId || syncPreviewServices.length === 0) return [];
    const set = new Set<string>();
    syncPreviewServices.forEach((item) => {
      const cat = (item.category || 'Uncategorized').trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [syncPreviewServices, selectedSyncProviderId]);

  const categoryFilteredSyncServices = useMemo(() => {
    if (!selectedSyncCategory) return syncPreviewServices;
    return syncPreviewServices.filter(
      (item) => (item.category || 'Uncategorized').trim() === selectedSyncCategory.trim()
    );
  }, [syncPreviewServices, selectedSyncCategory]);

  const handleSelectProviderForSync = (provId: string) => {
    setSelectedSyncProviderId(provId);
    setSelectedSyncCategory('');
    setSelectedSyncQuickService('');
    setSyncPreviewServices([]);
    setSyncResult(null);
    updateSelectedSyncServiceIds(new Set());
    if (provId) {
      handleFetchSyncPreview(provId);
    }
  };

  const updateSelectedSyncServiceIds = (newSet: Set<string>) => {
    setSelectedSyncServiceIds(newSet);
    setManualSyncIdsStr(Array.from(newSet).sort().join(', '));
  };

  const handleManualSyncIdsChange = (val: string) => {
    setManualSyncIdsStr(val);
    const parsedIds = val
      .split(/[\s,;]+/)
      .map(id => id.trim().replace('#', ''))
      .filter(id => id.length > 0 && !isNaN(Number(id)));
    setSelectedSyncServiceIds(new Set<string>(parsedIds));
  };

  const handleToggleSyncServiceId = (serviceId: string) => {
    const newSelected = new Set<string>(selectedSyncServiceIds);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    updateSelectedSyncServiceIds(newSelected);
    if (syncScope !== 'selected') {
      setSyncScope('selected');
    }
  };

  const handleAddMultipleSyncServiceIds = (serviceIds: string[]) => {
    const newSelected = new Set<string>(selectedSyncServiceIds);
    serviceIds.forEach(id => newSelected.add(id));
    updateSelectedSyncServiceIds(newSelected);
    if (syncScope !== 'selected') {
      setSyncScope('selected');
    }
  };

  const handleRemoveSyncServiceId = (serviceId: string) => {
    const newSelected = new Set<string>(selectedSyncServiceIds);
    newSelected.delete(serviceId);
    updateSelectedSyncServiceIds(newSelected);
  };

  const handleClearAllSyncSelected = () => {
    updateSelectedSyncServiceIds(new Set());
  };

  const handleFetchSyncPreview = async (customProvId?: any) => {
    let targetProvId = '';
    if (typeof customProvId === 'string' && customProvId.trim() && !isNaN(Number(customProvId))) {
      targetProvId = customProvId.trim();
    } else if (typeof customProvId === 'number' && !isNaN(customProvId)) {
      targetProvId = String(customProvId);
    } else if (selectedSyncProviderId && !isNaN(Number(selectedSyncProviderId))) {
      targetProvId = String(selectedSyncProviderId).trim();
    }

    if (!targetProvId || isNaN(Number(targetProvId))) {
      showError('Please select an SMM Provider first.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    setSyncResult(null);
    setSelectedSyncCategory('');
    setSelectedSyncQuickService('');
    updateSelectedSyncServiceIds(new Set());
    try {
      const res = await fetch(`/api/admin/providers/${targetProvId}/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSyncPreviewServices(data);
        showSuccess(`Loaded ${data.length} services from provider inventory!`);
      } else {
        setPreviewError(data.error || 'Failed to retrieve provider list.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Network error connecting to provider API.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!selectedSyncProviderId) {
      showError('Please select a provider to sync.');
      return;
    }
    if (syncScope === 'selected' && selectedSyncServiceIds.size === 0) {
      showError('Please select at least one service for "Only Selected Services" scope.');
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/services/seller-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          providerId: parseInt(selectedSyncProviderId),
          syncScope,
          profitPercentage: parseFloat(syncProfitPercentage) || 0,
          selectedServiceIds: syncScope === 'selected' ? Array.from(selectedSyncServiceIds) : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({
          addedCount: data.addedCount,
          updatedCount: data.updatedCount,
          skippedCount: data.skippedCount,
          totalProcessed: data.totalProcessed,
        });
        showSuccess('Manual seller sync executed successfully!');
        fetchAdminData(); // refresh main database catalog in stats and services
      } else {
        showError(data.error || 'Failed to run sync process.');
      }
    } catch (err: any) {
      showError(err.message || 'Error occurred during sync.');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelectAllSyncServices = (filtered: any[]) => {
    const newSelected = new Set<string>(selectedSyncServiceIds);
    const allSelected = filtered.every(item => newSelected.has(String(item.service)));
    if (allSelected) {
      filtered.forEach(item => newSelected.delete(String(item.service)));
    } else {
      filtered.forEach(item => newSelected.add(String(item.service)));
    }
    updateSelectedSyncServiceIds(newSelected);
  };

  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: '' });
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info' });

  // Users balance/status action state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'set'>('add');

  // Specific user full order history & lifetime spending modal state
  const [viewingUserOrders, setViewingUserOrders] = useState<User | null>(null);
  const [userOrdersHistory, setUserOrdersHistory] = useState<Order[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);
  const [userOrderFilterStatus, setUserOrderFilterStatus] = useState('all');

  // Search terms
  const [userSearch, setUserSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Ticket reply states
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');

  // Feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings State
  const [panelSettings, setPanelSettings] = useState<any>({
    websiteLogo: '',
    favicon: '',
    websiteName: '',
    defaultLanguage: 'en',
    homepageYoutubeId: '',
    addFundPageContent: '',
    orderIdSkip: '0',
    seoKeywords: '',
    seoDescription: '',
    additionalHeaderCode: '',
    additionalFooterCode: '',
    additionalHeaderCodeAfterLogin: '',
    whatsappNumber: '',
    telegramUsername: '',
    supportEmail: '',
    supportWorkingHours: '24x7 Customer Helpdesk',
    inrToUsdRate: '0.012',
    inrToEurRate: '0.011',
    inrToPkrRate: '3.32',
    bannerStatus: 'enabled',
    bannerBadge: 'FREE WALLET CREDIT',
    bannerTitle: 'Earn up to ₹ 200 in free credit',
    bannerSubtitle: 'Leave a review for ₹ 25 · make a promo video for ₹ 200',
    bannerBtnText: 'Earn now →',
    bannerBtnLink: 'affiliate',
    dashboardBanners: '',
    greetingNotice: 'Place a new order in a few taps — orders delivered on YouthSMM | Main SMM Provider.',
    sidebarAddFundsBtnText: '+ Add funds',
    sidebarLevelNum: 'Level 3',
    sidebarLevelName: 'BRONZE',
    sidebarXpText: '66 / 120 XP',
    sidebarNextXp: 'Next: 54 XP',
    sidebarRewardsLinkText: '🏆 VIEW REWARDS & LEVELS',
    footerCopyright: '© YouthSMM | Main SMM Provider',
    childPanelTitle: 'Rent a Child Panel',
    childPanelDescription: 'Start your own automated SMM panel website connected to our provider API',
    childPanelPrice: '₹ 1,500 / month',
    termsOfService: '',
    privacyPolicy: '',
    faqContent: '',
    // Per-Method QR Settings
    allUpiStatus: 'enabled',
    allUpiTitle: 'All UPI Payments',
    allUpiVpa: 'BHARATPE2H0D0Q1Y4T29351@unitype',
    allUpiMerchantName: 'PRIYA',
    allUpiQrUrl: '',
    allUpiInstructions: 'Scan with PhonePe, Google Pay, Paytm, BharatPe, or any UPI app to complete payment.',

    phonepeTitle: 'PhonePe Only',
    phonepeVpa: '8795005604@ybl',
    phonepeMerchantName: 'YouthSMM PhonePe',
    phonepeQrUrl: '',
    phonepeInstructions: 'Scan using PhonePe App for fast settlement.',

    phonepeBonusStatus: 'enabled',
    phonepeBonusTitle: 'PhonePe Only (QR 2)',
    phonepeBonusVpa: '8795005604@ibl',
    phonepeBonusMerchantName: 'YouthSMM PhonePe QR 2',
    phonepeBonusQrUrl: '',
    phonepeBonusPercent: '2',
    phonepeBonusMinAmount: '1000',
    phonepeBonusInstructions: 'Scan with PhonePe. Automatically receive a 2% bonus on deposits of ₹1,000 or more.',

    binanceStatus: 'enabled',
    binanceTitle: 'Binance Pay',
    binancePayId: '912837465',
    binanceMerchantName: 'YouthSMM Binance',
    binanceQrUrl: '',
    binanceCurrency: 'USDT',
    binanceInstructions: 'Pay via Binance Pay App to ID: 912837465 or scan the Binance QR code.',

    cryptoStatus: 'enabled',
    cryptoTitle: 'Heleket (Crypto)',
    cryptoWalletAddress: 'TX9b57K8wX9q1mN4P2rS8tUvWxYzAbCdEf',
    cryptoNetwork: 'USDT (TRC20) / TRX',
    cryptoMerchantName: 'YouthSMM Crypto Treasury',
    cryptoQrUrl: '',
    cryptoInstructions: 'Send USDT (TRC-20) or TRX to the official wallet address. Submit the 12-digit transaction ID or hash.',

    paytmStatus: 'enabled',
    paytmTitle: 'Paytm Only',
    paytmVpa: '8795005604@paytm',
    paytmMerchantName: 'YouthSMM Paytm',
    paytmQrUrl: '',
    paytmInstructions: 'Scan with Paytm App.',

    gpayStatus: 'enabled',
    gpayTitle: 'Google Pay',
    gpayVpa: '8795005604@okaxis',
    gpayMerchantName: 'YouthSMM Google Pay',
    gpayQrUrl: '',
    gpayInstructions: 'Scan with Google Pay App.',

    bharatpeMerchantId: '',
    bharatpeToken: '',
    bharatpePhone: '8795005604',
    bharatpeMerchantName: 'PRIYA',
    bharatpeVpa: 'BHARATPE2H0D0Q1Y4T29351@unitype',
    bharatpeStatus: 'linked',
    stripeStatus: 'enabled',
    paypalStatus: 'enabled',
    usdManualStatus: 'enabled',
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalSecretKey: '',
    phonepeStatus: 'enabled',
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
    googleClientId: '',
    googleClientSecret: '',
    adminEmail: 'bhattg805@gmail.com'
  });

  const [adminPaymentMethodTab, setAdminPaymentMethodTab] = useState<'all_upi' | 'phonepe' | 'phonepe_bonus' | 'binance' | 'crypto' | 'paytm' | 'gpay' | 'manual_bank' | 'global_gateways'>('all_upi');

  // BharatPe Linking State
  const [setupStep, setSetupStep] = useState<'intro' | 'mobile' | 'otp'>('intro');
  const [bharatpePhone, setBharatpePhone] = useState('');
  const [bharatpeOTP, setBharatpeOTP] = useState('');
  const [bharatpeMerchantName, setBharatpeMerchantName] = useState('');
  const [bharatpeVpa, setBharatpeVpa] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpSentCode, setOtpSentCode] = useState('');
  const [bpLoading, setBpLoading] = useState(false);
  const [showSmsGatewayConfig, setShowSmsGatewayConfig] = useState(false);

  // Appointments (Supabase Integrated)
  const [adminAppointments, setAdminAppointments] = useState<Appointment[]>([]);
  const [loadingAdminAppointments, setLoadingAdminAppointments] = useState(false);
  const [appointmentFilterStatus, setAppointmentFilterStatus] = useState('all');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastStatsRefresh, setLastStatsRefresh] = useState<Date | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    try {
      setStatsLoading(true);
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastStatsRefresh(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token, activeTab]);

  // Periodic 30s live stats updater when viewing the stats dashboard
  useEffect(() => {
    if (activeTab === 'stats' && token) {
      const interval = setInterval(() => {
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  // Periodic 12s live orders updater when viewing the orders dashboard
  useEffect(() => {
    if (activeTab === 'orders' && token) {
      const interval = setInterval(() => {
        const headers = { Authorization: `Bearer ${token}` };
        fetch('/api/admin/orders', { headers })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setOrdersList(data);
          })
          .catch(() => {});
        fetchCronStatus();
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'stats') {
        await fetchStats();
      } else if (activeTab === 'appointments') {
        await fetchAdminAppointments();
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setUsersList(await res.json());
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/admin/orders', { headers });
        if (res.ok) setOrdersList(await res.json());
        fetchCronStatus();
      } else if (activeTab === 'providers') {
        const res = await fetch('/api/admin/providers', { headers });
        if (res.ok) setProvidersList(await res.json());
        fetchCronStatus();
      } else if (activeTab === 'services') {
        const [catRes, srvRes, provRes] = await Promise.all([
          fetch('/api/user/categories', { headers }),
          fetch('/api/admin/services', { headers }), // Fetch COMPLETE admin catalog (with SMM credentials)
          fetch('/api/admin/providers', { headers }), // Fetch SMM providers list for selectors
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (srvRes.ok) setServices(await srvRes.json());
        if (provRes.ok) setProvidersList(await provRes.json());
      } else if (activeTab === 'coupons') {
        const res = await fetch('/api/admin/coupons', { headers });
        if (res.ok) setCoupons(await res.json());
      } else if (activeTab === 'tickets') {
        const res = await fetch('/api/admin/tickets', { headers });
        if (res.ok) setTickets(await res.json());
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/logs', { headers });
        if (res.ok) setLogs(await res.json());
      } else if (activeTab === 'child-panels') {
        const res = await fetch('/api/admin/child-panels', { headers });
        if (res.ok) setChildPanels(await res.json());
      } else if (activeTab === 'refills') {
        const res = await fetch('/api/admin/refill-requests', { headers });
        if (res.ok) setRefills(await res.json());
      } else if (activeTab === 'blogs') {
        await fetchBlogs();
      } else if (activeTab === 'settings') {
        const settingsRes = await fetch('/api/admin/settings', { headers });
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setPanelSettings((prev: any) => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminAppointments = async () => {
    setLoadingAdminAppointments(true);
    try {
      const res = await fetch('/api/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAdminAppointments(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch admin appointments:', err);
    } finally {
      setLoadingAdminAppointments(false);
    }
  };

  const handleUpdateAppointmentStatus = async (id: number, status: string) => {
    setUpdatingAppointmentId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAdminAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } catch (err) {
      console.error('Error updating appointment status:', err);
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this appointment from Supabase & database?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAdminAppointments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const res = await fetch('/api/admin/cron/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.cronState) {
          setCronState(data.cronState);
          setCronIntervalMinutes(String(Math.round(data.cronState.intervalMs / 1000 / 60 * 10) / 10));
        }
      }
    } catch (err) {
      console.error('Error fetching cron status:', err);
    }
  };

  const handleToggleCron = async () => {
    try {
      const res = await fetch('/api/admin/cron/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !cronState?.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(data.cronState?.isActive ? 'Automatic background SMM status sync enabled!' : 'Automatic background sync disabled.');
        setCronState(data.cronState);
      } else {
        showError('Failed to toggle background sync status.');
      }
    } catch (err) {
      showError('Network error toggling background sync.');
    }
  };

  const handleTriggerCronSync = async () => {
    setTriggeringCron(true);
    try {
      const res = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Automatic SMM sync triggered successfully! Processed orders count: ${data.cronState?.lastSyncedCount}`);
        setCronState(data.cronState);
        fetchAdminData();
      } else {
        showError(data.error || 'Failed to trigger SMM status sync.');
        if (data.cronState) setCronState(data.cronState);
      }
    } catch (err) {
      showError('Network error triggering background sync.');
    } finally {
      setTriggeringCron(false);
    }
  };

  const handleUpdateCronSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCronSettings(true);
    try {
      const res = await fetch('/api/admin/cron/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intervalMinutes: parseFloat(cronIntervalMinutes) }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Background sync interval updated to ${cronIntervalMinutes} minutes!`);
        setCronState(data.cronState);
      } else {
        showError(data.error || 'Failed to update cron interval.');
      }
    } catch (err) {
      showError('Network error updating sync interval.');
    } finally {
      setUpdatingCronSettings(false);
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

  const fetchBlogs = async () => {
    setFetchingBlogs(true);
    try {
      const res = await fetch('/api/admin/blogs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlogsList(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setFetchingBlogs(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = blogForm.title.trim();
    const cleanContent = blogForm.content.trim();
    if (!cleanTitle || !cleanContent) {
      showError('Please fill in title and content.');
      return;
    }

    const cleanSlug = blogForm.slug.trim() || cleanTitle.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    setSavingBlog(true);
    try {
      const isEdit = !!selectedBlogForEdit;
      const url = isEdit 
        ? `/api/admin/blogs/${selectedBlogForEdit.id}`
        : '/api/admin/blogs';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        title: cleanTitle,
        slug: cleanSlug,
        content: cleanContent,
        status: blogForm.status || 'published',
        coverImage: blogForm.coverImage.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess(isEdit ? 'Blog post updated successfully!' : 'Blog post created successfully!');
        setBlogEditorOpen(false);
        setSelectedBlogForEdit(null);
        setBlogForm({ title: '', slug: '', content: '', status: 'published', coverImage: '' });
        fetchBlogs();
      } else {
        showError(data.error || 'Failed to save blog post.');
      }
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Network error. Failed to save blog post.');
    } finally {
      setSavingBlog(false);
    }
  };

  const handleDeleteBlog = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        showSuccess('Blog post deleted successfully!');
        setBlogIdToDelete(null);
        fetchBlogs();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to delete blog post.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error. Failed to delete blog post.');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: newCategory,
          icon: newCategoryIcon || null,
        }),
      });
      if (res.ok) {
        showSuccess('Category created successfully!');
        setNewCategory('');
        setNewCategoryIcon('');
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to create category.');
    } finally {
      setLoading(false);
    }
  };

  // Update Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategoryName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingCategoryName,
          icon: editingCategoryIcon || null,
        }),
      });
      if (res.ok) {
        showSuccess('Category updated successfully!');
        setEditingCategory(null);
        setEditingCategoryName('');
        setEditingCategoryIcon('');
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update category.');
      }
    } catch (err) {
      showError('Failed to update category.');
    } finally {
      setLoading(false);
    }
  };

  // Create Service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.categoryId || !newService.name || !newService.price) {
      showError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: parseInt(newService.categoryId),
          name: newService.name,
          description: newService.description,
          pricePerThousand: parseFloat(newService.price),
          minAmount: parseInt(newService.min),
          maxAmount: parseInt(newService.max),
          providerId: newService.providerId ? parseInt(newService.providerId) : null,
          providerServiceId: newService.providerServiceId || null,
          icon: newService.icon || null,
        }),
      });
      if (res.ok) {
        showSuccess('Service added successfully!');
        setNewService({
          categoryId: '',
          name: '',
          description: '',
          price: '',
          min: '10',
          max: '10000',
          providerId: '',
          providerServiceId: '',
          icon: '',
        });
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to add service.');
      }
    } catch (err) {
      showError('Failed to add service.');
    } finally {
      setLoading(false);
    }
  };

  // Update Service
  const handleUpdateService = async (serviceId: number, updatedFields: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        showSuccess('Service updated successfully!');
        setSelectedServiceForEdit(null);
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update service.');
      }
    } catch (err) {
      showError('Error updating service.');
    } finally {
      setLoading(false);
    }
  };

  // Notify user dashboard and clean cache on catalog changes
  const notifyCatalogChanged = () => {
    try {
      localStorage.removeItem('youthsmm_cached_services');
      localStorage.removeItem('youthsmm_cached_services_v2');
      localStorage.removeItem('youthsmm_cached_categories');
      window.dispatchEvent(new Event('youthsmm_catalog_updated'));
    } catch (_) {}
  };

  // Delete Service
  const handleDeleteService = async (serviceId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Service deleted.');
        setServiceIdToDelete(null);
        notifyCatalogChanged();
        fetchAdminData();
      } else {
        showError('Failed to delete service.');
      }
    } catch (err) {
      showError('Error deleting service.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (categoryId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Category and all its services deleted successfully.');
        setCategoryIdToDelete(null);
        notifyCatalogChanged();
        fetchAdminData();
      } else {
        showError('Failed to delete category.');
      }
    } catch (err) {
      showError('Error deleting category.');
    } finally {
      setLoading(false);
    }
  };

  // Clear Entire Catalog (Bulk delete all categories and services)
  const handleClearCatalog = async () => {
    if (!confirm('WARNING: Are you absolutely sure you want to delete ALL categories and ALL services? This action cannot be undone!')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clear-catalog', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Entire catalog has been successfully cleared!');
        notifyCatalogChanged();
        fetchAdminData();
      } else {
        showError('Failed to clear catalog.');
      }
    } catch (err) {
      showError('Error clearing catalog.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Delete Selected Categories
  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedCategoryIds }),
      });
      if (res.ok) {
        showSuccess(`Successfully deleted ${selectedCategoryIds.length} selected categories.`);
        setSelectedCategoryIds([]);
        setShowBulkDeleteConfirm(false);
        notifyCatalogChanged();
        fetchAdminData();
      } else {
        const errData = await res.json();
        showError(errData.error || 'Failed to bulk delete selected categories.');
      }
    } catch (err) {
      showError('Error bulk deleting selected categories.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Delete Selected Services
  const handleBulkDeleteServices = async () => {
    if (selectedServiceIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedServiceIds }),
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Successfully deleted ${data.count || selectedServiceIds.length} services.`);
        setSelectedServiceIds([]);
        setShowBulkDeleteServicesConfirm(false);
        notifyCatalogChanged();
        fetchAdminData();
      } else {
        const errData = await res.json();
        showError(errData.error || 'Failed to bulk delete selected services.');
      }
    } catch (err) {
      showError('Error bulk deleting selected services.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Categories based on search query
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase().trim();
    return categories.filter((c) =>
      c.name.toLowerCase().includes(q) || String(c.id).includes(q)
    );
  }, [categories, categorySearchQuery]);

  // Categories available for the currently selected Provider filter in Curated SMM Catalog
  const catalogCategoriesForProvider = useMemo(() => {
    if (!serviceProviderFilter) return categories;
    const catIdsForProvider = new Set(
      services
        .filter((s) => {
          if (serviceProviderFilter === 'manual') return !s.providerId;
          return String(s.providerId) === String(serviceProviderFilter);
        })
        .map((s) => s.categoryId)
    );
    return categories.filter((c) => catIdsForProvider.has(c.id));
  }, [categories, services, serviceProviderFilter]);

  // Filtered Services based on search query, category, and provider
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      if (serviceCategoryFilter && String(srv.categoryId) !== serviceCategoryFilter) {
        return false;
      }
      if (serviceProviderFilter) {
        if (serviceProviderFilter === 'manual' && srv.providerId) return false;
        if (serviceProviderFilter !== 'manual' && String(srv.providerId) !== serviceProviderFilter) return false;
      }
      if (serviceSearchQuery.trim()) {
        const q = serviceSearchQuery.toLowerCase().trim();
        const matchesName = srv.name.toLowerCase().includes(q);
        const matchesDesc = (srv.description || '').toLowerCase().includes(q);
        const matchesId = String(srv.id).includes(q) || `#${srv.id}`.includes(q);
        const matchesProviderId = srv.providerServiceId && String(srv.providerServiceId).toLowerCase().includes(q);
        const catName = categories.find((c) => c.id === srv.categoryId)?.name || '';
        const matchesCat = catName.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesId && !matchesProviderId && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [services, serviceCategoryFilter, serviceProviderFilter, serviceSearchQuery, categories]);

  // Save SMM Panel Settings
  const handleSaveSettings = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(panelSettings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setPanelSettings(data.settings);
          try {
            localStorage.setItem('youthsmm_public_settings', JSON.stringify(data.settings));
          } catch (_) {}
        }
        showSuccess('Settings saved successfully!');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update settings.');
      }
    } catch (err) {
      console.error(err);
      showError('Error updating settings.');
    } finally {
      setLoading(false);
    }
  };

  // BharatPe QR Link Handlers
  const handleRequestBharatpeOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bharatpePhone || bharatpePhone.trim().length < 10) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: bharatpePhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpRequested(true);
        setSetupStep('otp'); // Set step to otp
        setOtpSentCode('');
        showSuccess(data.message || `OTP sent via SMS to +91 ${bharatpePhone.slice(-10)}. Please check your phone.`);
      } else {
        if (data.missingGateway) {
          setShowSmsGatewayConfig(true);
        }
        showError(data.error || 'Failed to request OTP.');
      }
    } catch (err) {
      showError('Error connecting to gateway.');
    } finally {
      setBpLoading(false);
    }
  };

  const handleVerifyBharatpeOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bharatpeOTP || bharatpeOTP.trim().length !== 6) {
      showError('Please enter the valid 6-digit verification code received on your phone.');
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: bharatpePhone,
          otp: bharatpeOTP,
          merchantName: bharatpeMerchantName,
          vpa: bharatpeVpa,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        showSuccess(data.message || 'Real BharatPe Merchant QR connected and activated successfully!');
        // Reset local form states
        setBharatpeOTP('');
        setOtpRequested(false);
        setOtpSentCode('');
        setSetupStep('intro'); // Reset setup step
      } else {
        showError(data.error || 'Verification failed. Please enter the valid OTP code received on your phone.');
      }
    } catch (err) {
      showError('Error verifying OTP.');
    } finally {
      setBpLoading(false);
    }
  };

  const handleUnlinkBharatpe = async () => {
    if (!window.confirm('Are you sure you want to unlink your BharatPe merchant account and disable dynamic QR payments?')) {
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/unlink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        setBharatpePhone('');
        setBharatpeMerchantName('');
        setBharatpeVpa('');
        showSuccess(data.message || 'BharatPe unlinked successfully.');
        setSetupStep('intro'); // Reset setup step to intro
      } else {
        showError(data.error || 'Failed to unlink.');
      }
    } catch (err) {
      showError('Error unlinking.');
    } finally {
      setBpLoading(false);
    }
  };

  // Direct Inline Save of BharatPe Customizations
  const handleSaveBharatpeSettings = async () => {
    setBpLoading(true);
    try {
      const payload = {
        bharatpeMerchantId: panelSettings.bharatpeMerchantId,
        bharatpeToken: panelSettings.bharatpeToken,
        bharatpePhone: panelSettings.bharatpePhone,
        bharatpeMerchantName: panelSettings.bharatpeMerchantName,
        bharatpeVpa: panelSettings.bharatpeVpa,
        bharatpeStatus: panelSettings.bharatpeStatus,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const mergedSettings = data.settings || payload;
        if (mergedSettings) {
          setPanelSettings(mergedSettings);
          try {
            localStorage.setItem('youthsmm_public_settings', JSON.stringify(mergedSettings));
            window.dispatchEvent(new CustomEvent('youthsmm_settings_updated'));
          } catch (_) {}
        }
        showSuccess(`BharatPe UPI ID updated to "${payload.bharatpeVpa || ''}" & QR generated!`);
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to save BharatPe changes.');
      }
    } catch (err) {
      showError('Error saving customized settings.');
    } finally {
      setBpLoading(false);
    }
  };

  // Create API Provider
  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.name || !newProvider.apiUrl || !newProvider.apiKey) {
      showError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProvider),
      });
      if (res.ok) {
        showSuccess('SMM Provider registered successfully!');
        setNewProvider({ name: '', apiUrl: '', apiKey: '' });
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to register provider.');
      }
    } catch (err) {
      showError('Failed to register provider.');
    } finally {
      setLoading(false);
    }
  };

  // Update API Provider
  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderForEdit) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProviderForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: selectedProviderForEdit.name,
          apiUrl: selectedProviderForEdit.apiUrl,
          apiKey: selectedProviderForEdit.apiKey,
        }),
      });
      if (res.ok) {
        showSuccess('Provider settings updated!');
        setSelectedProviderForEdit(null);
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update provider.');
      }
    } catch (err) {
      showError('Failed to update provider.');
    } finally {
      setLoading(false);
    }
  };

  // Delete API Provider
  const handleDeleteProvider = async (providerId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Provider deleted successfully.');
        setProviderIdToDelete(null);
        fetchAdminData();
      } else {
        showError('Failed to delete provider.');
      }
    } catch (err) {
      showError('Error deleting provider.');
    } finally {
      setLoading(false);
    }
  };

  // Securely Refresh Provider Account Balance from SMM server
  const handleSyncProviderBalance = async (providerId: number) => {
    setLoading(true);
    setProviderStatuses(prev => ({
      ...prev,
      [providerId]: { ...(prev[providerId] || {}), loading: true }
    }));
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/balance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Account balance refreshed: ₹${data.balance.toFixed(2)}`);
        setProviderStatuses(prev => ({
          ...prev,
          [providerId]: {
            connected: true,
            balance: data.balance,
            balanceUnknown: false,
            insufficientBalance: data.balance <= 0,
            loading: false,
          }
        }));
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Connection to SMM provider failed.');
        setProviderStatuses(prev => ({
          ...prev,
          [providerId]: {
            connected: false,
            balance: null,
            balanceUnknown: true,
            insufficientBalance: false,
            error: data.error || 'Connection failed',
            loading: false,
          }
        }));
      }
    } catch (err: any) {
      showError('Error syncing provider balance.');
      setProviderStatuses(prev => ({
        ...prev,
        [providerId]: {
          connected: false,
          balance: null,
          balanceUnknown: true,
          insufficientBalance: false,
          error: err.message || 'Connection error',
          loading: false,
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Reset All Users Balances to 0
  const handleResetAllBalances = async () => {
    if (!window.confirm('Are you sure you want to reset ALL user wallet balances to ₹0.00? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/reset-all-balances', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('All user balances have been reset to ₹0.00 successfully!');
        fetchAdminData();
      } else {
        showError('Failed to reset user balances.');
      }
    } catch (err) {
      showError('Network error resetting balances.');
    } finally {
      setLoading(false);
    }
  };

  // Remove Today's Added Funds / Payments Only
  const handleRemoveTodayPayments = async () => {
    if (!window.confirm("Are you sure you want to remove all funds and payments added TODAY? This will deduct today's credited amounts from user wallets and delete today's payment records. Older payments from previous days will NOT be touched.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments/remove-today-payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Today's payments processed successfully!");
        fetchAdminData();
      } else {
        showError(data.error || "Failed to remove today's payments.");
      }
    } catch (err) {
      showError("Network error removing today's payments.");
    } finally {
      setLoading(false);
    }
  };

  // Sync SMM Orders
  const handleSyncOrdersStatus = async () => {
    setSyncingOrders(true);
    try {
      const res = await fetch('/api/admin/orders/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Successfully synced SMM orders! Statuses updated: ${data.synced}`);
        fetchAdminData();
      } else {
        showError('Sync pipeline returned an error.');
      }
    } catch (err) {
      showError('Failed to trigger background sync.');
    } finally {
      setSyncingOrders(false);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discountPercent) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: newCoupon.code,
          discountPercent: parseInt(newCoupon.discountPercent),
        }),
      });
      if (res.ok) {
        showSuccess('Coupon code published!');
        setNewCoupon({ code: '', discountPercent: '' });
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to create coupon.');
    } finally {
      setLoading(false);
    }
  };

  // Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAnn),
      });
      if (res.ok) {
        showSuccess('Announcement broadcasted!');
        setNewAnn({ title: '', content: '', type: 'info' });
      }
    } catch (err) {
      showError('Failed to broadcast announcement.');
    } finally {
      setLoading(false);
    }
  };

  // Update User Balance Manually
  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceInput) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount: parseFloat(balanceInput),
          action: balanceAction
        }),
      });
      if (res.ok) {
        showSuccess(balanceAction === 'add' ? 'Funds added successfully.' : 'User balance updated.');
        setSelectedUser(null);
        setBalanceInput('');
        fetchAdminData();
      } else {
        const errorData = await res.json();
        showError(errorData.error || 'Failed to update balance.');
      }
    } catch (err) {
      showError('Failed to update balance.');
    }
  };

  // Update User Status (Suspend / Activate)
  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      // Optimistically update UI so admin sees change immediately
      setUsersList((prev) =>
        prev.map((item) => (item.id === userId ? { ...item, status: newStatus } : item))
      );

      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showSuccess(
          newStatus === 'suspended'
            ? 'User suspended successfully. Account will stay suspended until you activate it.'
            : 'User activated successfully.'
        );
        fetchAdminData();
      } else {
        const errData = await res.json().catch(() => ({}));
        showError(errData.error || 'Failed to update user status.');
        // Revert optimistic update on failure
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to update status.');
      fetchAdminData();
    }
  };

  // Direct Admin Login As User (Impersonation)
  const [loggingInAsUserId, setLoggingInAsUserId] = useState<number | null>(null);

  const handleLoginAsUser = async (targetUser: User) => {
    if (!window.confirm(`Are you sure you want to login as "${targetUser.email}"?`)) {
      return;
    }
    setLoggingInAsUserId(targetUser.id);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/login-as`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        showError(data?.error || 'Failed to login as user.');
        return;
      }

      showSuccess(`Logged in as user: ${targetUser.email}`);
      if (onLoginAsUser && data.token && data.user) {
        onLoginAsUser(data.token, data.user);
      }
    } catch (err) {
      console.error('Error logging in as user:', err);
      showError('Network error logging in as user.');
    } finally {
      setLoggingInAsUserId(null);
    }
  };

  // View specific user's entire order history & spending ledger
  const handleViewUserOrders = async (targetUser: User) => {
    setViewingUserOrders(targetUser);
    setLoadingUserOrders(true);
    setUserOrderFilterStatus('all');
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserOrdersHistory(data);
      } else {
        showError('Failed to fetch user order history.');
        setUserOrdersHistory([]);
      }
    } catch (err) {
      console.error('Error fetching user orders:', err);
      showError('Network error fetching user order history.');
      setUserOrdersHistory([]);
    } finally {
      setLoadingUserOrders(false);
    }
  };

  // Update Order Status (Refund occurs in DB if set to cancelled/refunded)
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showSuccess(`Order status updated to ${status}.`);
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to update order status.');
    }
  };

  // Manually Dispatch / Re-send Order to Provider API
  const handleDispatchOrderToProvider = async (orderId: number) => {
    setDispatchingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || 'Order dispatched to provider successfully!');
        fetchAdminData();
      } else {
        showError(data.error || 'Failed to dispatch order to provider.');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to connect to provider.');
    } finally {
      setDispatchingOrderId(null);
    }
  };

  // Check Provider Connection & Balance (Requirement 5 & 2)
  const checkProviderStatus = async (providerId: number) => {
    setProviderStatuses(prev => ({
      ...prev,
      [providerId]: { ...(prev[providerId] || {}), loading: true }
    }));
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProviderStatuses(prev => ({
          ...prev,
          [providerId]: { ...data, loading: false }
        }));
        if (data.balance !== null && data.balance !== undefined) {
          setProvidersList(prev => prev.map(p => p.id === providerId ? { ...p, balance: data.balance } : p));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setProviderStatuses(prev => ({
          ...prev,
          [providerId]: {
            connected: false,
            balance: null,
            balanceUnknown: true,
            insufficientBalance: false,
            error: errData.error || 'Connection failed',
            loading: false,
          }
        }));
      }
    } catch (err: any) {
      setProviderStatuses(prev => ({
        ...prev,
        [providerId]: {
          connected: false,
          balance: null,
          balanceUnknown: true,
          insufficientBalance: false,
          error: err.message || 'Connection failed',
          loading: false,
        }
      }));
    }
  };

  // Sync Status for a Specific Order from Provider API (Requirement 3 & 6)
  const handleSyncSingleOrder = async (orderId: number) => {
    setSyncingSingleOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || `Status synchronized for Order #${orderId}`);
        fetchAdminData();
        // If details modal is open for this order, refresh details
        if (selectedOrderDetails?.order?.id === orderId) {
          handleViewOrderDetails(orderId);
        }
      } else {
        showError(data.error || 'Failed to sync status for order.');
      }
    } catch (err: any) {
      showError(err.message || 'Network error syncing order status.');
    } finally {
      setSyncingSingleOrderId(null);
    }
  };

  // View Order Details & Provider Telemetry (Requirement 3)
  const handleViewOrderDetails = async (orderId: number) => {
    setLoadingOrderDetails(true);
    setDetailsModalOpen(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrderDetails(data);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || 'Failed to retrieve order details.');
        setDetailsModalOpen(false);
      }
    } catch (err: any) {
      showError(err.message || 'Error loading order details.');
      setDetailsModalOpen(false);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Auto-verify provider connection statuses when providers tab is active
  useEffect(() => {
    if (activeTab === 'providers' && providersList.length > 0) {
      providersList.forEach(prov => {
        if (!providerStatuses[prov.id]) {
          checkProviderStatus(prov.id);
        }
      });
    }
  }, [activeTab, providersList]);

  const handleOpenTicket = async (ticketId: number) => {
    setActiveTicketId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTicketMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicketId) return;
    try {
      const res = await fetch(`/api/tickets/${activeTicketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (res.ok) {
        setReplyMessage('');
        handleOpenTicket(activeTicketId);
        showSuccess('Reply submitted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Recharts color variables
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#6366f1'];

  // Filtering
  const filteredUsers = usersList.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredOrders = ordersList.filter(o => {
    // Status Filter
    if (orderStatusFilter !== 'all') {
      const orderStat = (o.status || '').toLowerCase();
      if (orderStatusFilter === 'pending' && orderStat !== 'pending') return false;
      if (orderStatusFilter === 'processing' && orderStat !== 'processing' && orderStat !== 'inprogress') return false;
      if (orderStatusFilter === 'completed' && orderStat !== 'completed' && orderStat !== 'complete') return false;
      if (orderStatusFilter === 'partial' && orderStat !== 'partial') return false;
      if (orderStatusFilter === 'cancelled' && orderStat !== 'cancelled') return false;
      if (orderStatusFilter === 'refunded' && orderStat !== 'refunded') return false;
    }

    // Search query Filter
    return (
      (o.serviceName && o.serviceName.toLowerCase().includes(orderSearch.toLowerCase())) ||
      o.link.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.userEmail && o.userEmail.toLowerCase().includes(orderSearch.toLowerCase()))
    );
  });

  const tabInfo: Record<string, { title: string; subtitle: string }> = {
    stats: { title: 'Analytics & Overview', subtitle: 'Real-time financial velocity, status ratios, and account metrics.' },
    payments: { title: 'BharatPe Payments Ledger', subtitle: 'Live monitor BharatPe UPI deposits, UTR verification status (Pending, Success, Failed, Cancelled), and wallet credits.' },
    users: { title: 'User Account Ledger', subtitle: 'Manage registered clients, balance credits, roles, and status levels.' },
    orders: { title: 'SMM Order Pipelines', subtitle: 'Track, filter, and manually update social service delivery states.' },
    'child-panels': { title: 'Reseller Child Panels', subtitle: 'Review active white-label domains and monthly renewal requests.' },
    refills: { title: 'Refill Operations', subtitle: 'Manage user refill and auto-replenishment requests for dropped count logs.' },
    providers: { title: 'Connected SMM API Providers', subtitle: 'Register external API endpoints and monitor automated dispatch balances.' },
    services: { title: 'Service Catalog Manager', subtitle: 'Configure social categories, customized pricing matrices, and SMM provider mappings.' },
    'manual-sync': { title: 'Manual Seller Sync Engine', subtitle: 'Directly connect and synchronize provider inventories with custom sync scopes, profit percentages, and real-time mapping actions.' },
    coupons: { title: 'Promotions & Coupons', subtitle: 'Issue deposit discount percentages and monitor promo code activations.' },
    tickets: { title: 'Support & Incident Desk', subtitle: 'Review customer inquiries, reply to support tickets, or close issues.' },
    announcements: { title: 'Broadcast Messages', subtitle: 'Dispatch global site banners, warning announcements, or notification alerts.' },
    blogs: { title: 'Blogs & Articles Writing', subtitle: 'Author and manage high-quality informational articles, SMM tips, and blogs for your registered client base.' },
    logs: { title: 'Platform Security Logs', subtitle: 'View audit logs, admin transactions, and system event timelines.' },
    settings: { title: 'SMM Panel Settings', subtitle: 'Configure website branding, logos, SEO descriptors, dynamic YouTube explainers, WhatsApp support links, and global order offset parameters.' },
  };

  return (
    <div className={`min-h-screen ${
      adminTheme === 'espresso'
        ? 'admin-panel-espresso bg-[#161311] text-[#f5f0eb]'
        : adminTheme === 'light'
        ? 'admin-panel-light bg-[#ece9e9] text-gray-800'
        : 'admin-panel-dark bg-[#0D0F12] text-gray-100'
    } flex flex-col md:flex-row font-sans transition-colors duration-200`}>
      {/* Mobile Top App Bar */}
      <div className={`md:hidden flex items-center justify-between px-3.5 py-3 ${
        adminTheme === 'espresso'
          ? 'bg-[#1a1512] border-b border-[#352b25] text-[#f5f0eb]'
          : adminTheme === 'light'
          ? 'bg-[#f4f2f2] border-b border-gray-300/80 text-gray-800'
          : 'bg-[#15181E] border-b border-[#272B33] text-white'
      } sticky top-0 z-40`}>
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
              adminTheme === 'espresso'
                ? 'bg-[#211c19] border-[#352b25] text-[#f5f0eb] hover:bg-[#28221f]'
                : adminTheme === 'light'
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                : 'bg-[#191C22] border-[#272B33] text-gray-200 hover:bg-[#222730]'
            }`}
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Active Admin Title right next to hamburger button */}
          <div className="flex items-center min-w-0 pl-1">
            <span className={`text-sm font-bold tracking-tight truncate ${
              adminTheme === 'espresso' ? 'text-[#f5f0eb]' : adminTheme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              {tabInfo[activeTab]?.title || 'Admin Panel'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Mobile Theme Cycle Button */}
          <button
            onClick={toggleAdminTheme}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
              adminTheme === 'espresso'
                ? 'bg-[#211c19] border-[#352b25] text-[#f5f0eb] hover:bg-[#28221f]'
                : adminTheme === 'light'
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                : 'bg-[#191C22] border-[#272B33] text-gray-300 hover:text-white'
            }`}
            title={`Theme: ${adminTheme.toUpperCase()} (Click to toggle)`}
          >
            {adminTheme === 'espresso' ? (
              <span className="text-xs">☕</span>
            ) : adminTheme === 'light' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
            )}
          </button>
          <button
            onClick={onGoToUserView}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[11px] sm:text-xs shadow-xs"
          >
            User View
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Side Admin Rail (Drawer on Mobile / Static on Desktop) */}
      <aside className={`
        fixed md:sticky top-0 inset-y-0 left-0 z-50 md:z-10 w-72 md:w-64 ${
          adminTheme === 'espresso'
            ? 'bg-[#1a1512] border-r border-[#352b25] text-[#d6cdc5]'
            : adminTheme === 'light'
            ? 'bg-[#f4f2f2] border-r border-gray-300/80 text-gray-800'
            : 'bg-[#15181E] border-r border-[#272B33] text-gray-200'
        } flex flex-col p-6 space-y-6 flex-shrink-0 h-screen transition-transform duration-300 md:transform-none
        ${mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <AnimatedLogo size="md" theme={adminTheme === 'light' ? 'light' : 'dark'} />
            <span className="text-[10px] font-mono tracking-widest font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-md w-fit">
              ADMIN SUITE
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              adminTheme === 'espresso'
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : adminTheme === 'light'
                ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col space-y-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {[
            { id: 'stats', label: 'Analytics Dashboard', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
            { id: 'payments', label: 'BharatPe Payments', icon: <CreditCard className="w-4 h-4 text-teal-400" /> },
            { id: 'payment-settings', label: 'Payment Settings (UPI / QR)', icon: <Wallet className="w-4 h-4 text-emerald-400" /> },
            { id: 'users', label: 'User Ledger', icon: <Users className="w-4 h-4 text-blue-400" /> },
            { id: 'orders', label: 'Order Pipeline', icon: <Coins className="w-4 h-4 text-amber-400" /> },
            { id: 'child-panels', label: 'Reseller Child Panels', icon: <Globe className="w-4 h-4 text-sky-400" /> },
            { id: 'refills', label: 'Refill Requests', icon: <RotateCcw className="w-4 h-4 text-teal-400" /> },
            { id: 'providers', label: 'API Providers', icon: <RefreshCw className="w-4 h-4 text-pink-400" /> },
            { id: 'services', label: 'Catalog Manager', icon: <List className="w-4 h-4 text-indigo-400" /> },
            { id: 'manual-sync', label: 'Manual Seller Sync', icon: <Activity className="w-4 h-4 text-orange-400" /> },
            { id: 'coupons', label: 'Promos & Coupons', icon: <Percent className="w-4 h-4 text-purple-400" /> },
            { id: 'appointments', label: 'Appointments (Supabase)', icon: <Calendar className="w-4 h-4 text-indigo-400" /> },
            { id: 'tickets', label: 'Support Desk', icon: <Ticket className="w-4 h-4" /> },
            { id: 'announcements', label: 'System Broadcasts', icon: <Megaphone className="w-4 h-4" /> },
            { id: 'blogs', label: 'Blogs Manager', icon: <BookOpen className="w-4 h-4 text-rose-400" /> },
            { id: 'logs', label: 'Platform Logs', icon: <FileText className="w-4 h-4 text-gray-400" /> },
            { id: 'settings', label: 'Panel Settings', icon: <Settings className="w-4 h-4 text-purple-400" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveTicketId(null);
                setMobileNavOpen(false);
              }}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-rose-600/15 text-rose-400 font-bold border-l-2 border-rose-500 shadow-xs'
                  : adminTheme === 'espresso'
                    ? 'text-[#a89f97] hover:text-[#f5f0eb] hover:bg-white/5'
                    : adminTheme === 'light'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.id === 'payments' && (stats.pendingDepositsCount || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse shadow-sm">
                  {stats.pendingDepositsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className={`space-y-2 pt-4 border-t ${
          adminTheme === 'espresso' ? 'border-[#352b25]' : adminTheme === 'light' ? 'border-gray-300' : 'border-white/5'
        }`}>
          <button
            onClick={() => {
              setMobileNavOpen(false);
              onGoToUserView();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>User Dashboard View</span>
          </button>

          <button
            onClick={async () => {
              try {
                setLoading(true);
                const res = await fetch('/api/user/toggle-role', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (res.ok) {
                  showSuccess('Role toggled successfully! Switching to User View...');
                  if (onRefreshProfile) {
                    onRefreshProfile();
                  }
                  setTimeout(() => {
                    onGoToUserView();
                  }, 1000);
                } else {
                  showError('Failed to toggle role.');
                }
              } catch (err) {
                showError('Error toggling role.');
              } finally {
                setLoading(false);
              }
            }}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/15 ${adminTheme === 'light' ? 'text-yellow-700' : 'text-yellow-400'} text-xs font-bold transition-all cursor-pointer`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch Role to User</span>
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 w-full min-w-0 max-w-full overflow-y-auto">
        {/* PREMIUM ADMIN HEADER BAR */}
        <div className={`mb-8 ${
          adminTheme === 'espresso'
            ? 'bg-[#211c19] border-[#352b25] text-[#f5f0eb] shadow-xl'
            : adminTheme === 'light'
            ? 'bg-white border-gray-200/90 text-gray-800 shadow-xs'
            : 'bg-[#15181E] border-[#272B33] text-white shadow-xl'
        } border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1 relative z-10">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/15 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </span>
              <span className={`text-[10px] font-mono tracking-widest font-bold uppercase ${
                adminTheme === 'espresso' ? 'text-[#a89f97]' : adminTheme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                Secure Terminal Panel
              </span>
            </div>
            <h1 className={`text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2 ${
              adminTheme === 'espresso' ? 'text-[#f5f0eb]' : adminTheme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              {tabInfo[activeTab]?.title || 'Platform Administration'}
            </h1>
            <p className={`text-xs max-w-2xl ${
              adminTheme === 'espresso' ? 'text-[#a89f97]' : adminTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {tabInfo[activeTab]?.subtitle || 'Configure system services, sync providers, process active orders, and assist users.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
            {/* API Status Cluster */}
            <div className={`flex items-center gap-3 ${
              adminTheme === 'espresso'
                ? 'bg-[#181310] border-[#352b25] text-[#d6cdc5]'
                : adminTheme === 'light'
                ? 'bg-[#f4f2f2] border-gray-200 text-gray-700'
                : 'bg-[#0D0F12] border-[#272B33] text-gray-300'
            } border px-3 py-2 rounded-xl text-xs font-medium`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>API Status: Operational</span>
            </div>

            {/* UTC clock indicator */}
            <div className={`flex items-center gap-2 ${
              adminTheme === 'espresso'
                ? 'bg-[#181310] border-[#352b25] text-[#a89f97]'
                : adminTheme === 'light'
                ? 'bg-[#f4f2f2] border-gray-200 text-gray-600'
                : 'bg-[#0D0F12] border-[#272B33] text-gray-400'
            } border px-3 py-2 rounded-xl text-xs font-mono`}>
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>UTC Year: 2026</span>
            </div>

            {/* Quick Refresh Trigger */}
            <button
              onClick={async () => {
                showSuccess('Refreshing platform databases and syncing states...');
                await fetchAdminData();
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                adminTheme === 'espresso'
                  ? 'bg-[#181310] border-[#352b25] hover:bg-[#241c17] text-[#f5f0eb]'
                  : adminTheme === 'light' 
                  ? 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700' 
                  : 'bg-[#191C22] border-[#272B33] hover:bg-[#222730] text-white'
              }`}
              title="Sync Platform Data Now"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Sync All</span>
            </button>

            {/* 3-Way Direct Text Click Theme Selector (Espresso / Dark / Light) */}
            <div className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
              adminTheme === 'espresso'
                ? 'bg-[#181310] border-[#352b25]'
                : adminTheme === 'light'
                ? 'bg-[#f4f2f2] border-gray-200'
                : 'bg-[#0D0F12] border-[#272B33]'
            }`}>
              {/* Espresso Theme Button (Matching user screenshot) */}
              <button
                type="button"
                onClick={() => selectAdminTheme('espresso')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                  adminTheme === 'espresso'
                    ? 'bg-[#dc2626] text-white shadow-xs font-black'
                    : adminTheme === 'light'
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Espresso Dark Theme (Matching Screenshot Background)"
              >
                <span>☕</span>
                <span>Espresso</span>
              </button>

              {/* Obsidian Dark Button */}
              <button
                type="button"
                onClick={() => selectAdminTheme('dark')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                  adminTheme === 'dark'
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : adminTheme === 'light'
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Obsidian Dark Theme"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              {/* Light Mode Button */}
              <button
                type="button"
                onClick={() => selectAdminTheme('light')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                  adminTheme === 'light'
                    ? 'bg-white text-gray-900 shadow-xs font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Light Mode Theme"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* Banner Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-2 text-sm shadow-md animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-sm shadow-md">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 1: ANALYTICS DASHBOARD */}
        {/* ===================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Header with Title & Live Sync */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Platform Analytics & Financial Velocity</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    IST (UTC+5:30) Live
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-time metrics for Today&apos;s Revenue and Funds Added (Indian Standard Time).
                  {lastStatsRefresh && (
                    <span className="ml-2 text-gray-500 font-mono text-[11px]">
                      (Synced at {lastStatsRefresh.toLocaleTimeString()})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={async () => {
                  await fetchStats();
                  showSuccess("Analytics metrics updated!");
                }}
                disabled={statsLoading}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin text-purple-400' : ''}`} />
                <span>{statsLoading ? 'Updating...' : 'Refresh Stats'}</span>
              </button>
            </div>

            {/* Pending Deposits Alert for Admin */}
            {(stats.pendingDepositsCount || 0) > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 animate-pulse">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-white flex items-center space-x-2 flex-wrap gap-1">
                      <span>{stats.pendingDepositsCount} Payment{stats.pendingDepositsCount > 1 ? 's' : ''} Awaiting Admin Approval!</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black">Action Required</span>
                    </div>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Users have submitted UPI UTR numbers totaling ₹{(stats.pendingDepositsAmount || 0).toFixed(2)}. Verify and approve to add funds to user wallets.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shrink-0 cursor-pointer shadow-sm flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <span>Review & Approve Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              {[
                {
                  label: 'Total Accounts',
                  value: stats.usersCount,
                  subtitle: 'Registered Users',
                  icon: <Users className="w-5 h-5 text-purple-400" />,
                  border: 'border-white/5',
                  badge: null,
                  badgeColor: '',
                },
                {
                  label: 'Orders Processed',
                  value: stats.ordersCount,
                  subtitle: 'Lifetime Orders',
                  icon: <Coins className="w-5 h-5 text-blue-400" />,
                  border: 'border-white/5',
                  badge: null,
                  badgeColor: '',
                },
                {
                  label: 'Platform Revenue',
                  value: `₹${(Number(stats.totalRevenue) || 0).toFixed(2)}`,
                  subtitle: 'Total All-Time',
                  icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
                  border: 'border-white/5',
                  badge: null,
                  badgeColor: '',
                },
                {
                  label: 'Wallet Deposits',
                  value: `₹${(Number(stats.totalDeposited) || 0).toFixed(2)}`,
                  subtitle: 'Total Added Funds',
                  icon: <CreditCard className="w-5 h-5 text-indigo-400" />,
                  border: 'border-white/5',
                  badge: null,
                  badgeColor: '',
                },
                {
                  label: "Today's Revenue",
                  value: `₹${(stats.todayRevenue || 0).toFixed(2)}`,
                  subtitle: `${stats.todayOrdersCount || 0} orders today`,
                  icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
                  border: 'border-emerald-500/30 bg-emerald-500/5',
                  badge: 'TODAY',
                  badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                },
                {
                  label: "Today's Fund Added",
                  value: `₹${(stats.todayDeposited || 0).toFixed(2)}`,
                  subtitle: `${stats.todayDepositsCount || 0} deposits today`,
                  icon: <Wallet className="w-5 h-5 text-cyan-400" />,
                  border: 'border-cyan-500/30 bg-cyan-500/5',
                  badge: 'TODAY',
                  badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                  actionBtn: (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTodayPayments();
                      }}
                      disabled={loading}
                      className="mt-2.5 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all cursor-pointer"
                      title="Remove only today's added funds and payments"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Revert Today's Funds</span>
                    </button>
                  ),
                },
                {
                  label: 'Pending Approvals',
                  value: stats.pendingDepositsCount || 0,
                  subtitle: `₹${(stats.pendingDepositsAmount || 0).toFixed(2)} awaiting review`,
                  icon: <Clock className="w-5 h-5 text-amber-400" />,
                  border: (stats.pendingDepositsCount || 0) > 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/5',
                  badge: (stats.pendingDepositsCount || 0) > 0 ? 'WAITING' : null,
                  badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  actionBtn: (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('payments');
                      }}
                      className="mt-2.5 inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <span>View Queue</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ),
                },
              ].map((m, idx) => (
                <div
                  key={idx}
                  className={`glass-card p-5 rounded-2xl border ${m.border} flex flex-col justify-between relative overflow-hidden transition-all hover:border-white/20`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-gray-400">{m.label}</span>
                      {m.badge && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${m.badgeColor}`}>
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 flex-shrink-0">{m.icon}</div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">{m.value}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{m.subtitle}</p>
                    {m.actionBtn}
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 h-[350px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-white">Financial Velocity</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#7c3aed]"></span> Lifetime
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Today
                    </span>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Revenue', amount: stats.totalRevenue, fill: '#7c3aed' },
                      { name: 'Deposits', amount: stats.totalDeposited, fill: '#6366f1' },
                      { name: 'Today Rev', amount: stats.todayRevenue || 0, fill: '#10b981' },
                      { name: 'Today Fund', amount: stats.todayDeposited || 0, fill: '#06b6d4' },
                    ]}>
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={36}>
                        {[
                          { fill: '#7c3aed' },
                          { fill: '#6366f1' },
                          { fill: '#10b981' },
                          { fill: '#06b6d4' },
                        ].map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5 h-[350px] flex flex-col">
                <h3 className="text-sm font-bold text-white mb-6">Order Status Breakdown</h3>
                <div className="flex-1 w-full">
                  {stats.statusChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.statusChart}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                        >
                          {stats.statusChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">No active orders.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: BHARATPE PAYMENTS LEDGER */}
        {/* ===================================== */}
        {activeTab === 'payments' && (
          <BharatPePaymentsLedger
            token={token}
            adminTheme={adminTheme}
            formatCurrency={(val: number) => `₹${(Number(val) || 0).toFixed(2)}`}
            showSuccess={showSuccess}
            showError={showError}
            onRefreshStats={fetchStats}
            onOpenPaymentSettings={() => setActiveTab('payment-settings')}
          />
        )}

        {/* ===================================== */}
        {/* TAB: PAYMENT GATEWAY SETTINGS */}
        {/* ===================================== */}
        {activeTab === 'payment-settings' && (
          <PaymentSettingsManager
            token={token}
            adminTheme={adminTheme}
            panelSettings={panelSettings}
            setPanelSettings={setPanelSettings}
            showSuccess={showSuccess}
            showError={showError}
            onRefreshStats={fetchStats}
          />
        )}

        {/* ===================================== */}
        {/* TAB 2: USER LEDGER */}
        {/* ===================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-white">Registered Users Ledger</h2>
                <button
                  onClick={handleRemoveTodayPayments}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                  title="Remove only today's added funds and payments"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Today's Payments</span>
                </button>
                <button
                  onClick={handleResetAllBalances}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                  title="Reset all user balances to 0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Balances to ₹0</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
                      if (res.ok) {
                        const data = await res.json();
                        setUsersList(data);
                        showSuccess('Users data refreshed successfully.');
                      }
                    } catch {
                      showError('Failed to refresh users.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    adminTheme === 'light'
                      ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20'
                  }`}
                  title="Refresh Users Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Quick Financial Overview Bar for Users */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Registered</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">{usersList.length} Users</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                  👥
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Total Lifetime Funds Added</div>
                  <div className="text-lg font-black text-sky-300 font-mono mt-0.5">
                    ₹{usersList.reduce((sum, u) => sum + (Number(u.totalDeposited) || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-sky-400/80 mt-0.5">Permanent lifetime deposits</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                  💵
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Total Lifetime Spent</div>
                  <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
                    ₹{usersList.reduce((sum, u) => sum + (Number(u.spent) || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-amber-400/80 mt-0.5">Never resets on day change</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  💳
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Saved (Wallets)</div>
                  <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
                    ₹{usersList.reduce((sum, u) => sum + (Number(u.balance) || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">Current available user funds</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  💰
                </div>
              </div>
            </div>

            {/* Manual Balance Adjustment form overlay */}
            {selectedUser && (
              <div className="p-6 rounded-2xl bg-[#0f1527] border border-purple-500/20 max-w-md mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Adjust Balance for {selectedUser.email}</h3>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Saved: <strong className="text-emerald-400 font-mono">₹{(Number(selectedUser.balance) || 0).toFixed(2)}</strong></span>
                    {selectedUser.spent !== undefined && (
                      <div className="text-[10px] text-amber-400 font-mono">Spent: ₹{Number(selectedUser.spent || 0).toFixed(2)}</div>
                    )}
                  </div>
                </div>

                {/* Toggle between ADD and SET */}
                <div className="flex bg-[#030712] p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setBalanceAction('add');
                      setBalanceInput('');
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      balanceAction === 'add'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Add Funds (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBalanceAction('set');
                      setBalanceInput(String(selectedUser.balance ?? '0'));
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      balanceAction === 'set'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Set Wallet Balance (=)
                  </button>
                </div>

                <form onSubmit={handleUpdateBalance} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder={balanceAction === 'add' ? 'Enter amount to add (e.g. 500)' : 'Set exact balance (e.g. 1500)'}
                      value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#030712] border border-white/10 text-white focus:outline-none placeholder-gray-500 text-xs"
                      required
                    />
                    <button type="submit" className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold transition-all">
                      {balanceAction === 'add' ? 'Add Funds' : 'Set Balance'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setBalanceInput('');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-gray-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                  {balanceAction === 'add' && balanceInput && !isNaN(parseFloat(balanceInput)) && (
                    <p className="text-[11px] text-gray-400">
                      New balance will be:{' '}
                      <strong className="text-emerald-400 font-mono">
                        ₹{((Number(selectedUser.balance) || 0) + parseFloat(balanceInput)).toFixed(2)}
                      </strong>
                    </p>
                  )}
                </form>
              </div>
            )}

            {/* Table scroll helper bar & quick navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                  adminTheme === 'espresso'
                    ? 'bg-[#181310] border-[#352b25] text-[#d6cdc5]'
                    : adminTheme === 'light'
                    ? 'bg-gray-100 border-gray-200 text-gray-700'
                    : 'bg-white/5 border-white/10 text-gray-300'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                  Showing {filteredUsers.length} users
                </span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">
                  (Swipe horizontally or use buttons if columns extend offscreen)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (usersTableScrollRef.current) {
                      usersTableScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    adminTheme === 'light'
                      ? 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700 shadow-xs'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                  }`}
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Scroll Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (usersTableScrollRef.current) {
                      usersTableScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    adminTheme === 'light'
                      ? 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700 shadow-xs'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                  }`}
                  title="Scroll Right"
                >
                  <span>Scroll Right</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-xl ${
              adminTheme === 'espresso'
                ? 'bg-[#1e1916] border-[#352b25]'
                : adminTheme === 'light'
                ? 'bg-white border-gray-200 shadow-xs'
                : 'bg-[#15181E] border-white/10'
            }`}>
              <div
                ref={usersTableScrollRef}
                className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/60 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <table className="w-full min-w-[980px] text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-xs font-extrabold uppercase tracking-wider ${
                      adminTheme === 'espresso'
                        ? 'border-[#352b25] bg-[#181310] text-[#a89f97]'
                        : adminTheme === 'light'
                        ? 'border-gray-200 bg-gray-50 text-gray-700'
                        : 'border-white/10 bg-white/5 text-gray-300'
                    }`}>
                      <th className="px-4 py-3.5 whitespace-nowrap w-16">ID</th>
                      <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">User</th>
                      <th className="px-4 py-3.5 whitespace-nowrap w-24">Role</th>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap w-36">Total Spent (Lifetime)</th>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap w-40">Wallet Balance / Added</th>
                      <th className="px-4 py-3.5 whitespace-nowrap min-w-[160px]">Last Login Time</th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap w-24">Status</th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap min-w-[240px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    adminTheme === 'espresso' ? 'divide-[#2c231d]' : adminTheme === 'light' ? 'divide-gray-100' : 'divide-white/5'
                  }`}>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={`transition-colors text-xs ${
                        adminTheme === 'espresso'
                          ? 'hover:bg-[#28211c]'
                          : adminTheme === 'light'
                          ? 'hover:bg-gray-50'
                          : 'hover:bg-white/5'
                      }`}>
                        <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">#{u.id}</td>
                        <td className="px-4 py-3">
                          <div className={`font-semibold ${adminTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{u.email}</div>
                          <div className="font-mono text-[11px] text-gray-400 truncate max-w-[160px]">{u.name || u.uid}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/10 text-blue-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        
                        {/* Kitna Paisa Spend Kiya Hai - Permanent Lifetime & Today */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-amber-500 text-sm">
                            ₹{(Number(u.spent) || 0).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {u.ordersCount !== undefined ? `${u.ordersCount} lifetime orders` : 'Lifetime Spent'}
                          </div>
                          {Number(u.todaySpent) > 0 && (
                            <div className="text-[10px] font-semibold text-emerald-400 font-mono mt-0.5" title="Spent today">
                              Today: +₹{Number(u.todaySpent).toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Kitna Paisa Save (Balance) Hai & Added Funds */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="font-mono font-black text-emerald-500 text-sm">
                            ₹{Number(u.balance || 0).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-500/80 font-medium">
                            Saved in Wallet
                          </div>
                          {Number(u.totalDeposited) > 0 && (
                            <div className="text-[9px] text-sky-400 font-mono mt-0.5" title="Lifetime added funds">
                              Total Added: ₹{Number(u.totalDeposited).toFixed(2)}
                            </div>
                          )}
                          {Number(u.todayDeposited) > 0 && (
                            <div className="text-[9px] text-cyan-400 font-mono font-semibold" title="Funds added today">
                              Today Added: +₹{Number(u.todayDeposited).toFixed(2)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {u.lastLoginAt ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                                {new Date(u.lastLoginAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                              {u.lastIp && (
                                <div className="text-[10px] font-mono text-gray-400 pl-3.5">
                                  IP: {u.lastIp}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Never / Not yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewUserOrders(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                              title={`View complete order history & spent for ${u.email}`}
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>Orders ({u.ordersCount || 0})</span>
                            </button>
                            <button
                              onClick={() => handleLoginAsUser(u)}
                              disabled={loggingInAsUserId === u.id}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              title={`Click to direct login as user: ${u.email}`}
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>{loggingInAsUserId === u.id ? 'Logging in...' : 'Login'}</span>
                            </button>
                            <button
                              onClick={() => { setSelectedUser(u); setBalanceAction('add'); setBalanceInput(''); }}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-xs font-bold cursor-pointer"
                            >
                              Add Funds
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${u.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View Full User Orders & Lifetime Spending History */}
        {viewingUserOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#15181E] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Order History & Lifetime Spending</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                        User #{viewingUserOrders.id}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {viewingUserOrders.email} {viewingUserOrders.name ? `(${viewingUserOrders.name})` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewingUserOrders(null);
                    setUserOrdersHistory([]);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-[#0D0F12] border-b border-white/10">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-gray-400 font-medium block">Lifetime Total Spent</span>
                  <span className="text-lg font-bold font-mono text-amber-400 mt-1 block">
                    ₹{(Number(viewingUserOrders.spent) || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-500">Permanent (never resets)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-gray-400 font-medium block">Total Orders Placed</span>
                  <span className="text-lg font-bold font-mono text-blue-400 mt-1 block">
                    {userOrdersHistory.length > 0 ? userOrdersHistory.length : (viewingUserOrders.ordersCount || 0)}
                  </span>
                  <span className="text-[10px] text-gray-500">All-time order count</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-gray-400 font-medium block">Current Balance</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                    ₹{Number(viewingUserOrders.balance || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-500/80">Available in wallet</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-gray-400 font-medium block">Funds Added</span>
                  <span className="text-lg font-bold font-mono text-cyan-400 mt-1 block">
                    ₹{Number(viewingUserOrders.totalDeposited || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-cyan-500/80">Total lifetime deposits</span>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  {['all', 'completed', 'processing', 'pending', 'cancelled', 'refunded'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setUserOrderFilterStatus(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                        userOrderFilterStatus === st
                          ? 'bg-amber-500 text-black font-bold shadow-xs'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Showing {userOrdersHistory.filter(o => userOrderFilterStatus === 'all' || (o.status || '').toLowerCase() === userOrderFilterStatus).length} orders
                </span>
              </div>

              {/* Orders Table List */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10">
                {loadingUserOrders ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                    <p className="text-xs text-gray-400">Loading complete user order history...</p>
                  </div>
                ) : userOrdersHistory.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                    <p className="text-sm font-semibold">No orders recorded for this user</p>
                    <p className="text-xs text-gray-500 mt-1">Orders placed by this user will appear here permanently.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-white/10 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-gray-400 font-mono uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Service</th>
                          <th className="px-4 py-3">Link / Target</th>
                          <th className="px-4 py-3 text-right">Quantity</th>
                          <th className="px-4 py-3 text-right">Spent (Charge)</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 whitespace-nowrap">Date (IST)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userOrdersHistory
                          .filter(o => userOrderFilterStatus === 'all' || (o.status || '').toLowerCase() === userOrderFilterStatus)
                          .map((order) => {
                            const st = (order.status || '').toLowerCase();
                            let badgeStyle = 'bg-gray-500/20 text-gray-300';
                            if (st === 'completed') badgeStyle = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                            else if (st === 'processing' || st === 'inprogress') badgeStyle = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                            else if (st === 'pending') badgeStyle = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                            else if (st === 'cancelled') badgeStyle = 'bg-red-500/20 text-red-400 border border-red-500/30';
                            else if (st === 'refunded') badgeStyle = 'bg-purple-500/20 text-purple-400 border border-purple-500/30';

                            return (
                              <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-gray-300 whitespace-nowrap">
                                  #{order.id}
                                </td>
                                <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate" title={order.serviceName}>
                                  {order.serviceName || `Service #${order.serviceId}`}
                                </td>
                                <td className="px-4 py-3 max-w-[180px] truncate">
                                  <a
                                    href={order.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:underline flex items-center gap-1"
                                    title={order.link}
                                  >
                                    <span className="truncate">{order.link}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-gray-300 whitespace-nowrap">
                                  {Number(order.quantity).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                                  ₹{Number(order.charge || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeStyle}`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  }) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-[#0D0F12] flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Data loaded directly from persistent database. Historical records are permanently retained.
                </span>
                <button
                  onClick={() => {
                    setViewingUserOrders(null);
                    setUserOrdersHistory([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Close Ledger
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 3: ORDER PIPELINE */}
        {/* ===================================== */}
        {activeTab === 'orders' && (() => {
          const getStatusCount = (statusVal: string) => {
            return ordersList.filter(o => {
              if (statusVal === 'all') return true;
              const orderStat = (o.status || '').toLowerCase();
              if (statusVal === 'pending') return orderStat === 'pending';
              if (statusVal === 'processing') return orderStat === 'processing' || orderStat === 'inprogress';
              if (statusVal === 'completed') return orderStat === 'completed' || orderStat === 'complete';
              if (statusVal === 'partial') return orderStat === 'partial';
              if (statusVal === 'cancelled') return orderStat === 'cancelled';
              if (statusVal === 'refunded') return orderStat === 'refunded';
              return false;
            }).length;
          };

          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Full SMM Order Pipeline</h2>
                  <p className="text-xs text-gray-400 mt-1">Manage and sync SMM orders with custom pipeline state filters</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search user, service or URL..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Upstream SMM Provider Low Balance Alert Banner */}
              {providersList.some(p => Number(p.balance || 0) < 1.0) && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-200">
                        Upstream API Provider Low Balance (₹{Number(providersList.find(p => Number(p.balance || 0) < 1.0)?.balance ?? 0).toFixed(2)})
                      </div>
                      <div className="text-[11px] text-amber-400/80 mt-0.5">
                        Your connected provider's account is low on funds. Top up your ethicalsmm.com account to enable real API dispatching. Customer orders are automatically queued and safely fulfilling via simulated progression.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('providers')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold shrink-0 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    View Providers
                  </button>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {[
                  { key: 'all', label: 'All Orders', count: getStatusCount('all'), activeClass: 'bg-white/10 text-white border-white/20', inactiveClass: 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10' },
                  { key: 'pending', label: 'Pending', count: getStatusCount('pending'), activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-amber-500/5' },
                  { key: 'processing', label: 'In Progress', count: getStatusCount('processing'), activeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-blue-500/5' },
                  { key: 'completed', label: 'Completed', count: getStatusCount('completed'), activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-emerald-500/5' },
                  { key: 'partial', label: 'Partial', count: getStatusCount('partial'), activeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-purple-500/5' },
                  { key: 'cancelled', label: 'Cancelled', count: getStatusCount('cancelled'), activeClass: 'bg-red-500/20 text-red-400 border-red-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-red-500/5' },
                  { key: 'refunded', label: 'Refunded', count: getStatusCount('refunded'), activeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30', inactiveClass: 'bg-[#0b101f] text-gray-500 border-white/5 hover:bg-gray-500/5' }
                ].map(tab => {
                  const isActive = orderStatusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setOrderStatusFilter(tab.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? tab.activeClass : tab.inactiveClass}`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? 'bg-white/15' : 'bg-white/5'}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Table scroll helper bar & quick navigation */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                    adminTheme === 'espresso'
                      ? 'bg-[#181310] border-[#352b25] text-[#d6cdc5]'
                      : adminTheme === 'light'
                      ? 'bg-gray-100 border-gray-200 text-gray-700'
                      : 'bg-white/5 border-white/10 text-gray-300'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Showing {filteredOrders.length} orders • 10 Data Columns
                  </span>
                  <span className="text-[11px] text-gray-400 hidden sm:inline">
                    (Use buttons or swipe sideways to view all columns)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (ordersTableScrollRef.current) {
                        ordersTableScrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      adminTheme === 'light'
                        ? 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700 shadow-xs'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                    }`}
                    title="Scroll Left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Scroll Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (ordersTableScrollRef.current) {
                        ordersTableScrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      adminTheme === 'light'
                        ? 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700 shadow-xs'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                    }`}
                    title="Scroll Right"
                  >
                    <span>Scroll Right</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className={`rounded-2xl border overflow-hidden shadow-xl ${
                adminTheme === 'espresso'
                  ? 'bg-[#1e1916] border-[#352b25]'
                  : adminTheme === 'light'
                  ? 'bg-white border-gray-200 shadow-xs'
                  : 'bg-[#15181E] border-white/10'
              }`}>
                <div
                  ref={ordersTableScrollRef}
                  className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/60 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <table className="w-full min-w-[1180px] text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b text-xs font-extrabold uppercase tracking-wider ${
                        adminTheme === 'espresso'
                          ? 'border-[#352b25] bg-[#181310] text-[#a89f97]'
                          : adminTheme === 'light'
                          ? 'border-gray-200 bg-gray-50 text-gray-700'
                          : 'border-white/10 bg-white/5 text-gray-300'
                      }`}>
                        <th className="px-3.5 py-3.5 whitespace-nowrap w-16">ID</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[180px]">User</th>
                        <th className="px-3.5 py-3.5 min-w-[220px]">Service</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[160px]">Seller / API ID</th>
                        <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[140px]">Link</th>
                        <th className="px-3 py-3.5 text-center whitespace-nowrap w-20">Qty</th>
                        <th className="px-3 py-3.5 text-center whitespace-nowrap w-24">Start Count</th>
                        <th className="px-3 py-3.5 text-center whitespace-nowrap w-24">Remains</th>
                        <th className="px-3.5 py-3.5 text-right whitespace-nowrap w-24">Charge</th>
                        <th className="px-3.5 py-3.5 text-center whitespace-nowrap min-w-[130px]">Order Status</th>
                        <th className="px-4 py-3.5 text-center whitespace-nowrap min-w-[260px]">Provider Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      adminTheme === 'espresso' ? 'divide-[#2c231d]' : adminTheme === 'light' ? 'divide-gray-100' : 'divide-white/5'
                    }`}>
                      {filteredOrders.map(ord => (
                        <tr key={ord.id} className={`transition-colors text-xs ${
                          adminTheme === 'espresso'
                            ? 'hover:bg-[#28211c]'
                            : adminTheme === 'light'
                            ? 'hover:bg-gray-50'
                            : 'hover:bg-white/5'
                        }`}>
                          <td className="px-3.5 py-3 font-mono font-bold text-gray-500 whitespace-nowrap">#{ord.id}</td>
                          <td className={`px-3.5 py-3 font-medium whitespace-nowrap ${
                            adminTheme === 'light' ? 'text-gray-900' : 'text-gray-200'
                          }`}>
                            <span className="max-w-[180px] truncate block" title={ord.userEmail}>{ord.userEmail}</span>
                          </td>
                          <td className={`px-3.5 py-3 font-semibold ${
                            adminTheme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}>
                            <div className="max-w-[260px] line-clamp-2" title={ord.serviceName}>{ord.serviceName}</div>
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            <div className="flex flex-col space-y-1 items-start">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                ord.providerName 
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {ord.providerName || 'Manual Provider'}
                              </span>
                              {ord.providerOrderId?.startsWith('QUEUED:') ? (
                                <span className="font-mono text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 max-w-[170px]" title={ord.providerOrderId}>
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                                  <span className="truncate">{ord.providerOrderId.replace(/^QUEUED:\s*/, '')}</span>
                                </span>
                              ) : ord.providerOrderId?.startsWith('FAILED:') ? (
                                <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 max-w-[170px]" title={ord.providerOrderId}>
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-400" />
                                  <span className="truncate">{ord.providerOrderId.replace(/^FAILED:\s*/, '')}</span>
                                </span>
                              ) : ord.providerOrderId ? (
                                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  ID: {ord.providerOrderId}
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] text-gray-400 bg-gray-500/10 border border-gray-500/20 px-1.5 py-0.5 rounded-md">
                                  Pending Push
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            <a href={ord.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline max-w-[140px] truncate block font-mono text-[11px]" title={ord.link}>
                              {ord.link}
                            </a>
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap">{ord.quantity}</td>
                          <td className={`px-3 py-3 text-center font-mono whitespace-nowrap ${adminTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{ord.startCount}</td>
                          <td className="px-3 py-3 text-center font-mono text-amber-500 font-bold whitespace-nowrap">{ord.remains}</td>
                          <td className="px-3.5 py-3 text-right font-mono text-emerald-500 font-black whitespace-nowrap">₹{ord.charge.toFixed(3)}</td>
                          <td className="px-3.5 py-3 text-center whitespace-nowrap">
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              className={`text-xs px-2.5 py-1.5 rounded-xl font-bold focus:outline-none border transition-colors cursor-pointer ${
                                adminTheme === 'light' ? 'bg-white' : 'bg-[#0b101f]'
                              } ${
                                ord.status === 'completed' || ord.status === 'complete'
                                  ? 'text-emerald-500 border-emerald-500/30 focus:border-emerald-500'
                                  : ord.status === 'pending'
                                  ? 'text-amber-500 border-amber-500/30 focus:border-amber-500'
                                  : ord.status === 'processing' || ord.status === 'inprogress'
                                  ? 'text-blue-500 border-blue-500/30 focus:border-blue-500'
                                  : ord.status === 'partial'
                                  ? 'text-purple-500 border-purple-500/30 focus:border-purple-500'
                                  : ord.status === 'cancelled'
                                  ? 'text-red-500 border-red-500/30 focus:border-red-500'
                                  : 'text-gray-500 border-gray-300 dark:border-white/10'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="partial">Partial</option>
                              <option value="cancelled">Cancelled (Refund)</option>
                              <option value="refunded">Refunded (Wallet)</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Push Order: Submit eligible order to provider */}
                              {(!ord.providerOrderId || ord.providerOrderId.trim() === '') && (
                                <button
                                  type="button"
                                  onClick={() => handleDispatchOrderToProvider(ord.id)}
                                  disabled={dispatchingOrderId === ord.id}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/35 text-blue-300 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Submit order to provider API"
                                >
                                  <Send className={`w-3 h-3 ${dispatchingOrderId === ord.id ? 'animate-pulse' : ''}`} />
                                  <span>{dispatchingOrderId === ord.id ? 'Pushing...' : 'Push Order'}</span>
                                </button>
                              )}

                              {/* Retry: Retry order only when safe to do so (failed or queued) */}
                              {(ord.providerOrderId?.startsWith('FAILED:') || ord.providerOrderId?.startsWith('QUEUED:')) && (
                                <button
                                  type="button"
                                  onClick={() => handleDispatchOrderToProvider(ord.id)}
                                  disabled={dispatchingOrderId === ord.id}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                                    ord.providerOrderId.startsWith('QUEUED:')
                                      ? 'bg-amber-600/20 hover:bg-amber-600/35 border-amber-500/35 text-amber-300'
                                      : 'bg-rose-600/20 hover:bg-rose-600/35 border-rose-500/35 text-rose-300'
                                  }`}
                                  title="Safely retry order submission to provider"
                                >
                                  <RefreshCw className={`w-3 h-3 ${dispatchingOrderId === ord.id ? 'animate-spin' : ''}`} />
                                  <span>{dispatchingOrderId === ord.id ? 'Retrying...' : 'Retry'}</span>
                                </button>
                              )}

                              {/* Sync Status: Fetch latest status from provider */}
                              {ord.providerOrderId && !ord.providerOrderId.startsWith('FAILED:') && !ord.providerOrderId.startsWith('QUEUED:') && (
                                <button
                                  type="button"
                                  onClick={() => handleSyncSingleOrder(ord.id)}
                                  disabled={syncingSingleOrderId === ord.id}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/35 text-purple-300 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Sync latest status from provider API"
                                >
                                  <RefreshCw className={`w-3 h-3 ${syncingSingleOrderId === ord.id ? 'animate-spin' : ''}`} />
                                  <span>{syncingSingleOrderId === ord.id ? 'Syncing...' : 'Sync Status'}</span>
                                </button>
                              )}

                              {/* View Details: Display provider order ID, provider response, and last error */}
                              <button
                                type="button"
                                onClick={() => handleViewOrderDetails(ord.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                                title="View provider order ID, raw response, and error history"
                              >
                                <Eye className="w-3 h-3 text-cyan-400" />
                                <span>Details</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with quick navigation */}
                <div className={`px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs ${
                  adminTheme === 'espresso'
                    ? 'border-[#352b25] bg-[#181310] text-[#a89f97]'
                    : adminTheme === 'light'
                    ? 'border-gray-200 bg-gray-50 text-gray-600'
                    : 'border-white/5 bg-white/[0.02] text-gray-400'
                }`}>
                  <span className="font-semibold">Showing all {filteredOrders.length} orders in pipeline</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (ordersTableScrollRef.current) {
                          ordersTableScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                        }
                      }}
                      className="hover:underline cursor-pointer font-medium"
                    >
                      ← Jump to Start (ID / User)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (ordersTableScrollRef.current) {
                          ordersTableScrollRef.current.scrollTo({ left: ordersTableScrollRef.current.scrollWidth, behavior: 'smooth' });
                        }
                      }}
                      className="hover:underline cursor-pointer text-blue-500 font-bold"
                    >
                      Jump to End (Pipeline Status) →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===================================== */}
        {/* TAB: SMM API PROVIDERS */}
        {/* ===================================== */}
        {activeTab === 'providers' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Sync Master Controller Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Manual SMM Order Status Sync */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <RefreshCw className={`w-5 h-5 text-purple-400 ${syncingOrders ? 'animate-spin' : ''}`} />
                    <span>Manual Order Sync Engine</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Directly polls and updates active provider orders with external API statuses (processing, completed, refunded, partial, etc.) from external APIs right now.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    SMM Catalog orders: <span className="text-purple-400 font-bold">{ordersList.length} orders total</span>
                  </div>
                  <button
                    onClick={handleSyncOrdersStatus}
                    disabled={syncingOrders}
                    className={`px-5 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                      syncingOrders
                        ? 'bg-purple-600/20 text-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/10'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingOrders ? 'animate-spin' : ''}`} />
                    <span>{syncingOrders ? 'Syncing...' : 'Sync Order Statuses'}</span>
                  </button>
                </div>
              </div>

              {/* Automated Background SMM Order Status Sync (Cron Job) */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
                    <span>Auto-Sync Background Job (Cron)</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      cronState?.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {cronState?.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={handleToggleCron}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        cronState?.isActive
                          ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20'
                          : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20'
                      }`}
                    >
                      {cronState?.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Last Sync Run</span>
                    <span className="text-white font-medium">
                      {cronState?.lastRun ? new Date(cronState.lastRun).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Execution Count</span>
                    <span className="text-white font-medium">{cronState?.runCount || 0} times</span>
                  </div>
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Job Status</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      cronState?.status === 'running' ? 'text-orange-400' :
                      cronState?.status === 'success' ? 'text-emerald-400' :
                      cronState?.status === 'failed' ? 'text-rose-400' : 'text-gray-400'
                    }`}>
                      {cronState?.status ? cronState.status.toUpperCase() : 'IDLE'}
                    </span>
                  </div>
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Last Synced Count</span>
                    <span className="text-white font-medium">{cronState?.lastSyncedCount || 0} orders</span>
                  </div>
                </div>

                {cronState?.error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">Error: {cronState.error}</span>
                  </div>
                )}

                {/* SMM Interval Setting Form */}
                <form onSubmit={handleUpdateCronSettings} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-white/5">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-gray-400 text-xs shrink-0 font-bold">Sync Interval (mins):</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={cronIntervalMinutes}
                      onChange={(e) => setCronIntervalMinutes(e.target.value)}
                      className="w-20 px-3 py-1.5 rounded-lg bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={updatingCronSettings}
                      className="flex-1 px-3 py-1.5 bg-[#0e1730] hover:bg-orange-600 border border-white/10 hover:border-orange-500 rounded-lg text-white font-bold text-xs transition-all shrink-0"
                    >
                      {updatingCronSettings ? 'Saving...' : 'Set Interval'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerCronSync}
                      disabled={triggeringCron || cronState?.status === 'running'}
                      className="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold text-xs shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${triggeringCron ? 'animate-spin' : ''}`} />
                      <span>Run Now</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Creator Column */}
              <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-2xl h-fit">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Register SMM Provider</span>
                </h3>
                <form onSubmit={handleCreateProvider} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Provider Name</label>
                    <input
                      type="text"
                      placeholder="e.g. SMMJust"
                      value={newProvider.name}
                      onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">API Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://smmprovider.com/api/v2"
                      value={newProvider.apiUrl}
                      onChange={(e) => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Secure API Key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••"
                      value={newProvider.apiKey}
                      onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md">
                    Connect Provider
                  </button>
                </form>
              </div>

              {/* Provider Registry Column */}
              <div className="lg:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 font-bold text-white flex justify-between items-center">
                  <span>Connected SMM API Providers</span>
                  <span className="text-xs font-mono text-gray-400">{providersList.length} Active integrations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-5 py-4">ID</th>
                        <th className="px-5 py-4">Provider / API Link</th>
                        <th className="px-5 py-4 text-center">Connection</th>
                        <th className="px-5 py-4 text-center">Provider Balance</th>
                        <th className="px-5 py-4 text-center">API Key</th>
                        <th className="px-5 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providersList.length > 0 ? (
                        providersList.map((prov) => {
                          const provSt = providerStatuses[prov.id];
                          const isChecking = provSt?.loading;
                          const isConnected = provSt?.connected !== undefined ? provSt.connected : Boolean(prov.apiKey && prov.apiUrl);
                          const isInsufficient = provSt?.insufficientBalance || (prov.balance !== null && prov.balance !== undefined && parseFloat(prov.balance) <= 0);
                          const isUnknown = provSt?.balanceUnknown || (prov.balance === null && provSt?.balance === undefined);

                          return (
                            <tr key={prov.id} className="border-b border-white/5 text-sm hover:bg-white/5 transition-all">
                              <td className="px-5 py-4 font-mono text-gray-500">#{prov.id}</td>
                              <td className="px-5 py-4">
                                <div className="font-bold text-white">{prov.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5 max-w-[220px] truncate font-mono" title={prov.apiUrl}>
                                  {prov.apiUrl}
                                </div>
                              </td>
                              {/* Connection Status: Connected in blue, Disconnected in red */}
                              <td className="px-5 py-4 text-center whitespace-nowrap">
                                {isChecking ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-gray-400 border border-white/10 inline-flex items-center gap-1.5">
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    <span>Verifying...</span>
                                  </span>
                                ) : isConnected ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1.5" title="Provider API verified successfully">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                    <span>Connected</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5" title={provSt?.error || "Connection failed"}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                    <span>Disconnected</span>
                                  </span>
                                )}
                              </td>
                              {/* Provider Balance: Insufficient balance separately in amber, Balance Unknown in purple, or numeric */}
                              <td className="px-5 py-4 text-center whitespace-nowrap">
                                {isInsufficient ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1" title="Account balance insufficient to dispatch orders">
                                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>Insufficient Balance (₹{parseFloat(prov.balance || '0').toFixed(2)})</span>
                                  </span>
                                ) : isUnknown ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1" title="Balance unknown; orders held safely for retry">
                                    <HelpCircle className="w-3 h-3 text-purple-400 shrink-0" />
                                    <span>Balance Unknown</span>
                                  </span>
                                ) : prov.balance !== null && prov.balance !== undefined ? (
                                  <span className="font-mono font-bold text-emerald-400">₹{parseFloat(prov.balance).toFixed(2)}</span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3 text-purple-400 shrink-0" />
                                    <span>Balance Unknown</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/25">
                                  {prov.apiKey ? 'Masked / Encrypted' : 'Missing Key'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => checkProviderStatus(prov.id)}
                                    disabled={isChecking}
                                    className="px-2 py-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-bold transition-all border border-blue-500/20 flex items-center gap-1"
                                    title="Verify live API connection and balance"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                                    <span>Test & Sync</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedProviderForEdit({ ...prov, apiKey: '' }); // Reset password field for security
                                    }}
                                    className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-bold transition-all border border-white/10"
                                  >
                                    Edit
                                  </button>
                                {providerIdToDelete === prov.id ? (
                                  <div className="flex items-center space-x-1.5 bg-red-500/10 p-1 rounded-lg border border-red-500/20 animate-pulse">
                                    <span className="text-[10px] text-red-300 font-bold px-1">Delete?</span>
                                    <button
                                      onClick={() => handleDeleteProvider(prov.id)}
                                      className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setProviderIdToDelete(null)}
                                      className="px-2 py-0.5 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setProviderIdToDelete(prov.id)}
                                    className="px-2.5 py-1 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg font-bold transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-500 text-xs">
                          No SMM providers registered. Add one using the form on the left.
                        </td>
                      </tr>
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Provider Modal */}
        {selectedProviderForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#090d1a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="text-md font-bold text-white">Edit SMM Provider #{selectedProviderForEdit.id}</h3>
                <button
                  onClick={() => setSelectedProviderForEdit(null)}
                  className="text-gray-400 hover:text-white font-mono text-lg font-bold transition-colors"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleUpdateProvider} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Provider Name</label>
                  <input
                    type="text"
                    value={selectedProviderForEdit.name}
                    onChange={(e) => setSelectedProviderForEdit({ ...selectedProviderForEdit, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">API Endpoint URL</label>
                  <input
                    type="url"
                    value={selectedProviderForEdit.apiUrl}
                    onChange={(e) => setSelectedProviderForEdit({ ...selectedProviderForEdit, apiUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                    API Key (Leave blank to keep current masked key)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••"
                    value={selectedProviderForEdit.apiKey || ''}
                    onChange={(e) => setSelectedProviderForEdit({ ...selectedProviderForEdit, apiKey: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setSelectedProviderForEdit(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md p-6 bg-[#0e1325] border border-white/10 rounded-2xl shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Edit Category</h3>
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category Name</label>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Category Logo / Icon</label>
                    {editingCategoryIcon && (
                      <button
                        type="button"
                        onClick={() => setEditingCategoryIcon('')}
                        className="text-[10px] text-purple-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Presets Grid */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                    {PRESET_ICONS.map((preset) => {
                      const isSelected = editingCategoryIcon === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setEditingCategoryIcon(preset.id)}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all text-center ${
                            isSelected 
                              ? 'bg-purple-600/20 border-purple-500 text-white' 
                              : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                          }`}
                        >
                          <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3.5 h-3.5')}</span>
                          <span className="text-[8px] font-medium truncate w-full">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                    value={editingCategoryIcon}
                    onChange={(e) => setEditingCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 4: CATALOG MANAGER */}
        {/* ===================================== */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Category Creator */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Create Category</span>
                </h3>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category Name</label>
                    <input
                      type="text"
                      placeholder="TikTok High retention"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Category Logo / Icon</label>
                      {newCategoryIcon && (
                        <button
                          type="button"
                          onClick={() => setNewCategoryIcon('')}
                          className="text-[10px] text-purple-400 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Presets Grid */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                      {PRESET_ICONS.map((preset) => {
                        const isSelected = newCategoryIcon === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setNewCategoryIcon(preset.id)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all text-center ${
                              isSelected 
                                ? 'bg-purple-600/20 border-purple-500 text-white' 
                                : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                            }`}
                          >
                            <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3.5 h-3.5')}</span>
                            <span className="text-[8px] font-medium truncate w-full">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                    />
                  </div>

                  <button type="submit" className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs">
                    Create Category
                  </button>
                </form>
              </div>

              {/* Manage Categories */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-bold text-white flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    <span>Manage Categories</span>
                  </h3>
                  {categories.length > 0 && (
                    <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full font-mono">
                      {categorySearchQuery ? `${filteredCategories.length} of ${categories.length}` : `${categories.length} total`}
                    </span>
                  )}
                </div>

                {/* Category Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search category by name or #ID..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {categories.length > 0 && (
                  <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none text-gray-300 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          filteredCategories.length > 0 &&
                          filteredCategories.every((c) => selectedCategoryIds.includes(c.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = Array.from(new Set([...selectedCategoryIds, ...filteredCategories.map((c) => c.id)]));
                            setSelectedCategoryIds(newIds);
                          } else {
                            const filteredIds = new Set(filteredCategories.map((c) => c.id));
                            setSelectedCategoryIds(selectedCategoryIds.filter((id) => !filteredIds.has(id)));
                            setShowBulkDeleteConfirm(false);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="font-semibold text-gray-300">
                        {categorySearchQuery ? `Select Filtered (${filteredCategories.length})` : 'Select All'}
                      </span>
                    </label>

                    {selectedCategoryIds.length > 0 && (
                      <div className="flex items-center">
                        {showBulkDeleteConfirm ? (
                          <div className="flex items-center space-x-1.5 bg-red-600/10 p-1 rounded-lg border border-red-500/20 animate-pulse">
                            <span className="text-[9px] text-red-300 font-bold px-1">Delete Selected?</span>
                            <button
                              type="button"
                              onClick={handleBulkDeleteCategories}
                              className="px-2 py-0.5 text-[9px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowBulkDeleteConfirm(false)}
                              className="px-2 py-0.5 text-[9px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white font-bold text-[10px] transition-all cursor-pointer"
                            title="Delete selected categories and all their services"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Selected ({selectedCategoryIds.length})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400">No categories created yet.</p>
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    <p>No categories match "{categorySearchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      className="mt-2 text-purple-400 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {filteredCategories.map((cat) => {
                      const serviceCount = services.filter((s) => s.categoryId === cat.id).length;
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                            } else {
                              setSelectedCategoryIds((prev) => [...prev, cat.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl bg-[#0b101f] border transition-all text-xs cursor-pointer select-none ${isSelected ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/5 hover:border-white/10'}`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 border border-white/5 text-gray-400">
                              {getCategoryIcon(cat.icon, cat.name, 'w-3.5 h-3.5')}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="font-bold text-gray-200 truncate">{cat.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5">{serviceCount} {serviceCount === 1 ? 'service' : 'services'}</span>
                            </div>
                          </div>
                          {categoryIdToDelete === cat.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center space-x-1.5 bg-red-500/10 p-1.5 rounded-lg border border-red-500/20 animate-pulse flex-shrink-0"
                            >
                              <span className="text-[9px] text-red-300 font-bold px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat.id);
                                }}
                                className="px-2 py-0.5 text-[9px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryIdToDelete(null);
                                }}
                                className="px-2 py-0.5 text-[9px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditingCategoryName(cat.name);
                                  setEditingCategoryIcon(cat.icon || '');
                                }}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[10px] font-bold transition-all border border-white/5"
                                title="Edit category"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryIdToDelete(cat.id);
                                }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold transition-all border border-red-500/10"
                                title="Delete category and all its services"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bulk Actions / Danger Zone */}
              <div className="glass-card p-6 rounded-2xl border border-red-500/10 bg-red-950/5 shadow-2xl space-y-4">
                <div className="flex items-start space-x-2">
                  <Trash2 className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Bulk Catalog Purge</h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Wipe the entire services and categories database clean to build your custom catalog from scratch.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCatalog}
                  className="w-full py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs border border-red-500/20 hover:border-red-600 transition-all"
                >
                  Delete All Categories & Services
                </button>
              </div>

              {/* Service Creator */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Create Service</span>
                </h3>
                <form onSubmit={handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category</label>
                    <select
                      value={newService.categoryId}
                      onChange={(e) => setNewService({ ...newService, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Service Name</label>
                    <input
                      type="text"
                      placeholder="Instagram Likes [Instant / Max 100K]"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Start time: 0-1 hour, Non Drop guarantee."
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Service Logo / Icon (Optional)</label>
                      {newService.icon && (
                        <button
                          type="button"
                          onClick={() => setNewService({ ...newService, icon: '' })}
                          className="text-[10px] text-purple-400 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Presets Grid */}
                    <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                      {PRESET_ICONS.map((preset) => {
                        const isSelected = newService.icon === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setNewService({ ...newService, icon: preset.id })}
                            className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all text-center ${
                              isSelected 
                                ? 'bg-purple-600/20 border-purple-500 text-white' 
                                : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                            }`}
                          >
                            <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3 h-3')}</span>
                            <span className="text-[7px] font-medium truncate w-full">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                      value={newService.icon}
                      onChange={(e) => setNewService({ ...newService, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Price/1K (INR/Base)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="1.25"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Min Qty</label>
                      <input
                        type="number"
                        value={newService.min}
                        onChange={(e) => setNewService({ ...newService, min: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Max Qty</label>
                      <input
                        type="number"
                        value={newService.max}
                        onChange={(e) => setNewService({ ...newService, max: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">SMM Provider</label>
                      <select
                        value={newService.providerId}
                        onChange={(e) => setNewService({ ...newService, providerId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none"
                      >
                        <option value="">Manual Processing</option>
                        {providersList.map((prov) => (
                          <option key={prov.id} value={prov.id}>{prov.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Provider Service ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 1954"
                        value={newService.providerServiceId}
                        onChange={(e) => setNewService({ ...newService, providerServiceId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md">
                    Publish Service
                  </button>
                </form>
              </div>
            </div>

            {/* Catalog List */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden">
              {/* Header with Sub-Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-white/5 bg-[#0e1424]/40 p-4 gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setServiceSubTab('catalog')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                      serviceSubTab === 'catalog'
                        ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Curated SMM Catalog</span>
                  </button>
                  <button
                    onClick={() => setServiceSubTab('importer')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                      serviceSubTab === 'importer'
                        ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>SMM API Importer</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-gray-400 flex items-center space-x-1 justify-end">
                  {serviceSubTab === 'catalog' ? (
                    <span>{services.length} Packages registered</span>
                  ) : (
                    <span>Import remote SMM folders instantly</span>
                  )}
                </div>
              </div>

              {serviceSubTab === 'catalog' ? (
                <div>
                  {/* Search and Filters & Selection Bar */}
                  <div className="p-4 border-b border-white/5 bg-[#0b101f]/60 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Search Input */}
                      <div className="md:col-span-6 relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search services by Name, #ID, Provider Service ID, or keyword..."
                          value={serviceSearchQuery}
                          onChange={(e) => setServiceSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        {serviceSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setServiceSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Filter by Provider */}
                      <div className="md:col-span-3">
                        <select
                          value={serviceProviderFilter}
                          onChange={(e) => {
                            const newProv = e.target.value;
                            setServiceProviderFilter(newProv);
                            setServiceCategoryFilter('');
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                        >
                          <option value="">All Providers ({providersList.length})</option>
                          <option value="manual">Manual Processing (No API)</option>
                          {providersList.map((prov) => (
                            <option key={prov.id} value={String(prov.id)}>
                              {prov.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter by Category */}
                      <div className="md:col-span-3">
                        <select
                          value={serviceCategoryFilter}
                          onChange={(e) => setServiceCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                        >
                          <option value="">
                            {serviceProviderFilter
                              ? `All Categories for this Provider (${catalogCategoriesForProvider.length})`
                              : `All Categories (${categories.length})`}
                          </option>
                          {catalogCategoriesForProvider.map((cat) => {
                            const count = services.filter((s) => {
                              const matchCat = s.categoryId === cat.id;
                              if (!serviceProviderFilter) return matchCat;
                              if (serviceProviderFilter === 'manual') return matchCat && !s.providerId;
                              return matchCat && String(s.providerId) === String(serviceProviderFilter);
                            }).length;
                            return (
                              <option key={cat.id} value={String(cat.id)}>
                                {cat.name} ({count})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Active Filters & Selection Stats Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <span>
                          Showing <strong className="text-white">{filteredServices.length}</strong> of {services.length} services
                        </span>
                        {(serviceSearchQuery || serviceCategoryFilter || serviceProviderFilter) && (
                          <button
                            type="button"
                            onClick={() => {
                              setServiceSearchQuery('');
                              setServiceCategoryFilter('');
                              setServiceProviderFilter('');
                            }}
                            className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer ml-1"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>

                      {/* Bulk Delete Bar for Services */}
                      {selectedServiceIds.length > 0 && (
                        <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                          <span className="text-xs font-bold text-red-300">
                            {selectedServiceIds.length} services selected
                          </span>

                          {showBulkDeleteServicesConfirm ? (
                            <div className="flex items-center space-x-1.5 pl-2 border-l border-red-500/30">
                              <span className="text-[10px] text-red-200 font-bold">Delete permanently?</span>
                              <button
                                type="button"
                                onClick={handleBulkDeleteServices}
                                className="px-2.5 py-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow cursor-pointer"
                              >
                                Yes, Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowBulkDeleteServicesConfirm(false)}
                                className="px-2 py-1 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setShowBulkDeleteServicesConfirm(true)}
                                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition-all shadow cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Selected</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedServiceIds([])}
                                className="text-[11px] text-gray-400 hover:text-white px-1 cursor-pointer"
                              >
                                Deselect All
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                          <th className="px-4 py-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredServices.length > 0 &&
                                filteredServices.every((s) => selectedServiceIds.includes(s.id))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newIds = Array.from(new Set([...selectedServiceIds, ...filteredServices.map((s) => s.id)]));
                                  setSelectedServiceIds(newIds);
                                } else {
                                  const filteredIds = new Set(filteredServices.map((s) => s.id));
                                  setSelectedServiceIds(selectedServiceIds.filter((id) => !filteredIds.has(id)));
                                  setShowBulkDeleteServicesConfirm(false);
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              title="Select all matching services"
                            />
                          </th>
                          <th className="px-4 py-4">ID</th>
                          <th className="px-6 py-4">Service Name</th>
                          <th className="px-6 py-4 text-right">Price / 1K</th>
                          <th className="px-6 py-4 text-center">Limits</th>
                          <th className="px-6 py-4 text-center">SMM API Link</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredServices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-xs">
                              <p className="font-semibold text-gray-300">No services match your search or filter.</p>
                              {(serviceSearchQuery || serviceCategoryFilter || serviceProviderFilter) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setServiceSearchQuery('');
                                    setServiceCategoryFilter('');
                                    setServiceProviderFilter('');
                                  }}
                                  className="mt-3 px-4 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20 text-xs font-bold transition-all cursor-pointer"
                                >
                                  Reset Search & Filters
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          filteredServices.map(srv => {
                            const linkedProvider = providersList.find(p => p.id === srv.providerId);
                            const catObj = categories.find(c => c.id === srv.categoryId);
                            const isSelected = selectedServiceIds.includes(srv.id);
                            return (
                              <tr
                                key={srv.id}
                                className={`border-b border-white/5 text-sm transition-all ${
                                  isSelected ? 'bg-purple-500/10 border-purple-500/20' : 'hover:bg-white/5'
                                }`}
                              >
                                <td className="px-4 py-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      if (isSelected) {
                                        setSelectedServiceIds(prev => prev.filter(id => id !== srv.id));
                                      } else {
                                        setSelectedServiceIds(prev => [...prev, srv.id]);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-4 font-mono text-gray-500">#{srv.id}</td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-white">{srv.name}</div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    {catObj && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                                        {catObj.name}
                                      </span>
                                    )}
                                    {srv.description && (
                                      <p className="text-[11px] text-gray-400 truncate max-w-[240px]" title={srv.description}>
                                        {srv.description}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">₹{srv.pricePerThousand.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">{srv.minAmount} &ndash; {srv.maxAmount}</td>
                                <td className="px-6 py-4 text-center">
                                  {linkedProvider ? (
                                    <div className="flex flex-col items-center">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        {linkedProvider.name}
                                      </span>
                                      <span className="text-[9px] font-mono text-gray-500 mt-0.5">API-ID: {srv.providerServiceId}</span>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                      Manual Dispatch
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex justify-center space-x-2">
                                    <button
                                      onClick={() => setSelectedServiceForEdit(srv)}
                                      className="px-2 py-1 text-xs bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg font-bold transition-all cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    {serviceIdToDelete === srv.id ? (
                                      <div className="flex items-center space-x-1.5 bg-red-500/10 p-1 rounded-lg border border-red-500/20 animate-pulse">
                                        <span className="text-[10px] text-red-300 font-bold px-1">Delete?</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteService(srv.id)}
                                          className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all cursor-pointer"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setServiceIdToDelete(null)}
                                          className="px-2 py-0.5 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all cursor-pointer"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setServiceIdToDelete(srv.id)}
                                        className="px-2 py-1 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg font-bold transition-all cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Importer Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-[#0b101f]/80 p-4 rounded-xl border border-white/5">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        1. Select SMM Provider
                      </label>
                      <select
                        value={selectedImporterProviderId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedImporterProviderId(val);
                          handleFetchProviderServices(val);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none"
                      >
                        <option value="">-- Choose SMM Provider --</option>
                        {providersList.map((prov) => (
                          <option key={prov.id} value={prov.id}>{prov.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        2. Price Multiplier
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">x</span>
                        <input
                          type="number"
                          step="0.05"
                          min="1.0"
                          placeholder="1.50"
                          value={priceMultiplier}
                          onChange={(e) => setPriceMultiplier(e.target.value)}
                          className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        3. Search / Filter Remote List
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search TikTok, Instagram, Likes, etc..."
                          value={importerSearchQuery}
                          onChange={(e) => setImporterSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loading State */}
                  {importerLoading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                      <p className="text-sm font-semibold text-gray-400 animate-pulse">
                        Querying SMM provider's remote service inventory...
                      </p>
                    </div>
                  )}

                  {/* Error State */}
                  {importerError && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <div className="text-xs leading-relaxed">
                        <p className="font-bold">Failed to connect to API endpoint</p>
                        <p className="opacity-90">{importerError}</p>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!importerLoading && !importerError && !selectedImporterProviderId && (
                    <div className="py-16 text-center border border-dashed border-white/5 rounded-xl">
                      <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 font-medium">No SMM Provider Selected</p>
                      <p className="text-xs text-gray-500 mt-1">Select an active provider above to pull service listings in real-time.</p>
                    </div>
                  )}

                  {/* Services Loaded Table */}
                  {!importerLoading && !importerError && selectedImporterProviderId && importerServices.length > 0 && (() => {
                    const query = importerSearchQuery.toLowerCase().trim();
                    const filtered = importerServices.filter(item => {
                      const name = (item.name || '').toLowerCase();
                      const cat = (item.category || '').toLowerCase();
                      const srvId = String(item.service);
                      return name.includes(query) || cat.includes(query) || srvId === query;
                    });

                    return (
                      <div className="space-y-4">
                        {/* Summary / Actions row */}
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0e1424]/40 p-4 rounded-xl border border-white/5 gap-4">
                          <div className="text-xs text-gray-400">
                            Showing <span className="font-bold text-white">{filtered.length}</span> of{' '}
                            <span className="font-bold text-white">{importerServices.length}</span> remote SMM services folder items.
                            {selectedImporterServiceIds.size > 0 && (
                              <span className="ml-2 text-purple-400 font-bold">
                                ({selectedImporterServiceIds.size} selected for import)
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const newSelected = new Set(selectedImporterServiceIds);
                                filtered.forEach(item => newSelected.add(item.service));
                                setSelectedImporterServiceIds(newSelected);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all"
                            >
                              Select Page
                            </button>
                            <button
                              onClick={() => {
                                const newSelected = new Set(selectedImporterServiceIds);
                                filtered.forEach(item => newSelected.delete(item.service));
                                setSelectedImporterServiceIds(newSelected);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all"
                            >
                              Clear Page
                            </button>
                            <button
                              onClick={handleImportSelectedServices}
                              disabled={selectedImporterServiceIds.size === 0}
                              className={`px-4 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 ${
                                selectedImporterServiceIds.size > 0
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/10'
                                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <Plus className="w-4.5 h-4.5" />
                              <span>Import Selected ({selectedImporterServiceIds.size})</span>
                            </button>
                          </div>
                        </div>

                        {/* Importer List Table */}
                        <div className="max-h-[500px] overflow-y-auto rounded-xl border border-white/5">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#080c16] z-10">
                              <tr className="border-b border-white/10 bg-[#080c16] text-gray-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-4 py-3 text-center w-12">
                                  <input
                                    type="checkbox"
                                    checked={filtered.length > 0 && filtered.every(item => selectedImporterServiceIds.has(item.service))}
                                    onChange={() => toggleSelectAllImporterServices(filtered)}
                                    className="rounded border-white/20 bg-gray-900 text-purple-600 focus:ring-purple-500"
                                  />
                                </th>
                                <th className="px-4 py-3 w-16 text-center">ID</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Service Name</th>
                                <th className="px-4 py-3 text-right">Provider Rate</th>
                                <th className="px-4 py-3 text-right text-purple-400">Our Cost</th>
                                <th className="px-4 py-3 text-center">Min/Max</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center py-12 text-xs text-gray-500">
                                    No services matching filter found.
                                  </td>
                                </tr>
                              ) : (
                                filtered.map(item => {
                                  const isSelected = selectedImporterServiceIds.has(item.service);
                                  const multiplier = parseFloat(priceMultiplier) || 1.0;
                                  const originalRate = parseFloat(item.rate) || 0;
                                  const ourCost = originalRate * multiplier;

                                  return (
                                    <tr
                                      key={item.service}
                                      onClick={() => {
                                        const newSelected = new Set(selectedImporterServiceIds);
                                        if (newSelected.has(item.service)) {
                                          newSelected.delete(item.service);
                                        } else {
                                          newSelected.add(item.service);
                                        }
                                        setSelectedImporterServiceIds(newSelected);
                                      }}
                                      className={`border-b border-white/5 text-xs hover:bg-white/5 transition-all cursor-pointer ${
                                        isSelected ? 'bg-purple-600/5' : ''
                                      }`}
                                    >
                                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            const newSelected = new Set(selectedImporterServiceIds);
                                            if (newSelected.has(item.service)) {
                                              newSelected.delete(item.service);
                                            } else {
                                              newSelected.add(item.service);
                                            }
                                            setSelectedImporterServiceIds(newSelected);
                                          }}
                                          className="rounded border-white/20 bg-gray-900 text-purple-600 focus:ring-purple-500"
                                        />
                                      </td>
                                      <td className="px-4 py-3 text-center font-mono text-gray-500">{item.service}</td>
                                      <td className="px-4 py-3">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                                          {item.category || 'Default'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-white max-w-[220px] truncate" title={item.name}>
                                        {item.name}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-gray-400">₹{originalRate.toFixed(4)}</td>
                                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">₹{ourCost.toFixed(4)}</td>
                                      <td className="px-4 py-3 text-center font-mono text-[10px] text-gray-500">
                                        {item.min} / {item.max}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Edit Modal overlay */}
        {selectedServiceForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#090d1a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="text-md font-bold text-white">Edit Service Package #{selectedServiceForEdit.id}</h3>
                <button
                  onClick={() => setSelectedServiceForEdit(null)}
                  className="text-gray-400 hover:text-white font-mono text-lg font-bold transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Service Name</label>
                  <input
                    type="text"
                    value={selectedServiceForEdit.name}
                    onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={selectedServiceForEdit.description || ''}
                    onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, description: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Price / 1K (INR/Base)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedServiceForEdit.pricePerThousand}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, pricePerThousand: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Category</label>
                    <select
                      value={selectedServiceForEdit.categoryId}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, categoryId: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Min Qty</label>
                    <input
                      type="number"
                      value={selectedServiceForEdit.minAmount}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, minAmount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Max Qty</label>
                    <input
                      type="number"
                      value={selectedServiceForEdit.maxAmount}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, maxAmount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Link to SMM Provider</label>
                    <select
                      value={selectedServiceForEdit.providerId || ''}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, providerId: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Manual Processing</option>
                      {providersList.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Provider Service ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1954"
                      value={selectedServiceForEdit.providerServiceId || ''}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, providerServiceId: e.target.value || null })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Service Logo / Icon (Optional)</label>
                    {selectedServiceForEdit.icon && (
                      <button
                        type="button"
                        onClick={() => setSelectedServiceForEdit({ ...selectedServiceForEdit, icon: '' })}
                        className="text-[10px] text-purple-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Presets Grid */}
                  <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                    {PRESET_ICONS.map((preset) => {
                      const isSelected = selectedServiceForEdit.icon === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedServiceForEdit({ ...selectedServiceForEdit, icon: preset.id })}
                          className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all text-center ${
                            isSelected 
                              ? 'bg-purple-600/20 border-purple-500 text-white' 
                              : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                          }`}
                        >
                          <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3 h-3')}</span>
                          <span className="text-[7px] font-medium truncate w-full">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                    value={selectedServiceForEdit.icon || ''}
                    onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedServiceForEdit(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateService(selectedServiceForEdit.id, {
                    name: selectedServiceForEdit.name,
                    description: selectedServiceForEdit.description,
                    pricePerThousand: selectedServiceForEdit.pricePerThousand,
                    categoryId: selectedServiceForEdit.categoryId,
                    minAmount: selectedServiceForEdit.minAmount,
                    maxAmount: selectedServiceForEdit.maxAmount,
                    providerId: selectedServiceForEdit.providerId,
                    providerServiceId: selectedServiceForEdit.providerServiceId,
                    icon: selectedServiceForEdit.icon || null,
                  })}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 5: PROMOS & COUPONS */}
        {/* ===================================== */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-2xl h-fit">
              <h3 className="text-md font-bold text-white mb-4">Create Promocode</h3>
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Code</label>
                  <input
                    type="text"
                    placeholder="BOOST20"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Discount Percentage</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={newCoupon.discountPercent}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs">
                  Publish Coupon
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 font-bold text-white">Active Promo Coupon Registry</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Coupon Code</th>
                      <th className="px-6 py-4 text-center">Discount</th>
                      <th className="px-6 py-4 text-center">Usages</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(cp => (
                      <tr key={cp.id} className="border-b border-white/5 text-sm">
                        <td className="px-6 py-4 font-bold font-mono text-purple-400">{cp.code}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-400 font-bold">{cp.discountPercent}%</td>
                        <td className="px-6 py-4 text-center font-mono">{cp.usageCount}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                            {cp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: APPOINTMENTS (SUPABASE INTEGRATED) */}
        {/* ===================================== */}
        {activeTab === 'appointments' && (() => {
          const filteredAppointments = adminAppointments.filter((apt) => {
            const matchesSearch =
              apt.name.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
              apt.email.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
              apt.serviceType.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
              (apt.phone && apt.phone.includes(appointmentSearch));
            const matchesStatus =
              appointmentFilterStatus === 'all' || (apt.status || 'pending') === appointmentFilterStatus;
            return matchesSearch && matchesStatus;
          });

          const pendingCount = adminAppointments.filter((a) => (a.status || 'pending') === 'pending').length;
          const confirmedCount = adminAppointments.filter((a) => a.status === 'confirmed').length;
          const completedCount = adminAppointments.filter((a) => a.status === 'completed').length;
          const cancelledCount = adminAppointments.filter((a) => a.status === 'cancelled').length;

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>Client Appointments & Consultations</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                        Supabase Backend
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      Manage booking requests, 1-on-1 strategy sessions, and reseller onboarding consultations
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => fetchAdminAppointments()}
                    disabled={loadingAdminAppointments}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                    title="Refresh Supabase Appointments"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAdminAppointments ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Supabase Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-gray-900 to-blue-950/70 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Database className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Supabase Database Connected</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div className="text-[11px] text-indigo-300 font-mono">
                      Project: esyfiidahljvwjqcvskg &bull; Table: <span className="text-emerald-400 font-bold">appointments</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dual Database Persistence (Supabase + Local PostgreSQL)</span>
                </div>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">Total Bookings</span>
                  <div className="text-2xl font-extrabold text-white font-mono">{adminAppointments.length}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-amber-300 uppercase">Pending Requests</span>
                  <div className="text-2xl font-extrabold text-amber-400 font-mono">{pendingCount}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-300 uppercase">Confirmed Sessions</span>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">{confirmedCount}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-1">
                  <span className="text-[11px] font-semibold text-blue-300 uppercase">Completed</span>
                  <div className="text-2xl font-extrabold text-blue-400 font-mono">{completedCount}</div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    placeholder="Search by client name, email, phone, or service..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setAppointmentFilterStatus(st)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        appointmentFilterStatus === st
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table / List */}
              <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                {loadingAdminAppointments ? (
                  <div className="py-16 text-center text-gray-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                    <p className="text-xs">Loading appointments from Supabase...</p>
                  </div>
                ) : filteredAppointments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="bg-[#0b101f] text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                        <tr>
                          <th className="px-5 py-3.5">ID & Date</th>
                          <th className="px-5 py-3.5">Client Details</th>
                          <th className="px-5 py-3.5">Service / Consultation</th>
                          <th className="px-5 py-3.5">Time Slot</th>
                          <th className="px-5 py-3.5">Notes / Message</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="font-mono font-bold text-indigo-400">#{apt.id}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{apt.date}</div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-bold text-white">{apt.name}</div>
                              <div className="text-[11px] text-indigo-300">{apt.email}</div>
                              {apt.phone && (
                                <div className="text-[10px] text-gray-400 mt-0.5">📞 {apt.phone}</div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-200">{apt.serviceType}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                Booked: {new Date(apt.createdAt).toLocaleDateString()}
                              </div>
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-200 font-mono text-[11px] border border-gray-700">
                                {apt.timeSlot}
                              </span>
                            </td>

                            <td className="px-5 py-4 max-w-xs">
                              <p className="text-gray-400 truncate text-[11px]" title={apt.message || ''}>
                                {apt.message || <span className="italic text-gray-600">No notes provided</span>}
                              </p>
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap">
                              <select
                                value={apt.status || 'pending'}
                                onChange={(e) => handleUpdateAppointmentStatus(apt.id, e.target.value)}
                                disabled={updatingAppointmentId === apt.id}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer focus:outline-none transition-all ${
                                  apt.status === 'confirmed'
                                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                                    : apt.status === 'completed'
                                    ? 'bg-blue-950/80 text-blue-400 border-blue-500/40'
                                    : apt.status === 'cancelled'
                                    ? 'bg-red-950/80 text-red-400 border-red-500/40'
                                    : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                                }`}
                              >
                                <option value="pending" className="bg-gray-900 text-amber-400">Pending</option>
                                <option value="confirmed" className="bg-gray-900 text-emerald-400">Confirmed</option>
                                <option value="completed" className="bg-gray-900 text-blue-400">Completed</option>
                                <option value="cancelled" className="bg-gray-900 text-red-400">Cancelled</option>
                              </select>
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                              {apt.status !== 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateAppointmentStatus(apt.id, 'confirmed')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Confirm
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAppointment(apt.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer inline-flex items-center"
                                title="Delete from Supabase & Database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-3">
                    <Calendar className="w-10 h-10 text-indigo-400 mx-auto opacity-60" />
                    <h4 className="font-bold text-white text-sm">No Appointments Found</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      {appointmentSearch || appointmentFilterStatus !== 'all'
                        ? 'No appointments matching your current search criteria.'
                        : 'Appointments booked by users or guests on the homepage will appear here automatically synced with Supabase.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ===================================== */}
        {/* TAB 6: SUPPORT DESK */}
        {/* ===================================== */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
              <h3 className="text-md font-bold text-white mb-4">Support Tickets Registry</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {tickets.length > 0 ? (
                  tickets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleOpenTicket(t.id)}
                      className={`w-full p-4 rounded-xl text-left border transition-all text-xs flex justify-between items-center ${
                        activeTicketId === t.id
                          ? 'bg-purple-600/10 border-purple-500'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white truncate max-w-[150px]">{t.subject}</div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">#{t.id} &middot; {t.userEmail}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'open' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {t.status}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">No active tickets.</div>
                )}
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="lg:col-span-2">
              {activeTicketId ? (
                <div className="glass-card rounded-2xl border border-white/5 flex flex-col h-[500px] shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/5 font-bold text-white flex justify-between items-center">
                    <span>Support Ticket Thread #{activeTicketId}</span>
                    <button
                      onClick={() => handleUpdateOrderStatus(activeTicketId, 'closed')}
                      className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold transition-all"
                    >
                      Close Ticket
                    </button>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {ticketMessages.map(msg => {
                      const isAdminMsg = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 rounded-2xl max-w-sm text-sm leading-relaxed ${
                            isAdminMsg
                              ? 'bg-purple-600 text-white'
                              : 'bg-blue-600/10 border border-blue-500/20 text-blue-300'
                          }`}>
                            <p>{msg.message}</p>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1 font-mono pl-1 pr-1">
                            {msg.senderName || 'Sender'} &middot; {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={handleTicketReply} className="p-4 border-t border-white/5 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type official admin reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button type="submit" className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors">
                      Reply
                    </button>
                  </form>
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-white/5 h-[500px] flex flex-col items-center justify-center text-center text-gray-500">
                  <Ticket className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm">Select an active ticket from the left column to view/respond to client threads.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 7: SYSTEM BROADCASTS */}
        {/* ===================================== */}
        {activeTab === 'announcements' && (
          <div className="max-w-xl mx-auto glass-card p-8 rounded-2xl border border-white/5 shadow-2xl h-fit">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-purple-400" />
              <span>Broadcast System Announcement</span>
            </h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Announcement Title</label>
                <input
                  type="text"
                  placeholder="🔥 Promocode Active!"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Detailed Content</label>
                <textarea
                  rows={4}
                  placeholder="Enter details text..."
                  value={newAnn.content}
                  onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Display Style / Urgency</label>
                <select
                  value={newAnn.type}
                  onChange={(e) => setNewAnn({ ...newAnn, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none"
                >
                  <option value="info">Info (Blue banner)</option>
                  <option value="success">Success (Emerald banner)</option>
                  <option value="warning">Warning (Amber banner)</option>
                  <option value="danger">Danger (Red banner)</option>
                </select>
              </div>

              <button type="submit" className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm shadow-lg shadow-purple-500/10">
                Broadcast Announcement
              </button>
            </form>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: BLOGS MANAGER */}
        {/* ===================================== */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Articles & Blog Posts</h2>
                <p className="text-xs text-gray-400 mt-1">Publish marketing articles, SEO copy, tutorials, and panel updates for your audience.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBlogForEdit(null);
                  setBlogForm({ title: '', slug: '', content: '', status: 'published', coverImage: '' });
                  setBlogEditorOpen(true);
                }}
                className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/15 flex items-center space-x-2 w-fit"
              >
                <Plus className="w-4 h-4" />
                <span>Create Blog Post</span>
              </button>
            </div>

            {/* Error/Success Feedbacks */}
            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Blogs List Table */}
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 font-bold uppercase tracking-wide">
                      <th className="px-6 py-4">Cover</th>
                      <th className="px-6 py-4">Post Info</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {fetchingBlogs ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                          <p className="mt-2 text-xs">Loading blog directory...</p>
                        </td>
                      </tr>
                    ) : blogsList.length > 0 ? (
                      blogsList.map((blog) => (
                        <tr key={blog.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            {blog.coverImage ? (
                              <img
                                src={blog.coverImage}
                                alt={blog.title}
                                referrerPolicy="no-referrer"
                                className="w-12 h-8 rounded-lg object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-12 h-8 rounded-lg bg-[#0b101f] border border-white/5 flex items-center justify-center text-[8px] font-mono text-gray-500">
                                NO COV
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white text-sm hover:text-purple-400 transition-colors">
                              {blog.title}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 font-mono">
                              slug: {blog.slug} &middot; Author: {blog.authorName || 'Admin'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                blog.status === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                              }`}
                            >
                              {blog.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-400">
                            {new Date(blog.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <button
                                onClick={() => {
                                  setSelectedBlogForEdit(blog);
                                  setBlogForm({
                                    title: blog.title,
                                    slug: blog.slug,
                                    content: blog.content,
                                    status: blog.status,
                                    coverImage: blog.coverImage || '',
                                  });
                                  setBlogEditorOpen(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 font-semibold text-xs"
                              >
                                Edit
                              </button>
                              
                              {blogIdToDelete === blog.id ? (
                                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                                  <span className="text-[10px] text-red-400 font-bold uppercase">Confirm?</span>
                                  <button
                                    onClick={() => handleDeleteBlog(blog.id)}
                                    className="text-red-500 hover:text-red-400 font-bold text-[10px] underline"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setBlogIdToDelete(null)}
                                    className="text-gray-400 hover:text-white text-[10px] underline"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setBlogIdToDelete(blog.id)}
                                  className="text-red-400 hover:text-red-300 font-semibold text-xs flex items-center space-x-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500 text-xs">
                          No blog posts created yet. Get started by clicking "Create Blog Post".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Blog Post Editor Drawer/Modal */}
            {blogEditorOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-[#090d1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">
                      {selectedBlogForEdit ? 'Edit Blog Post' : 'Create New Blog Post'}
                    </h3>
                    <button
                      onClick={() => setBlogEditorOpen(false)}
                      className="text-gray-400 hover:text-white font-semibold text-xs"
                    >
                      Close
                    </button>
                  </div>

                  {/* Form Content */}
                  <form onSubmit={handleSaveBlog} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Post Title
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5 SMM Growth Hacks for Instagram"
                          value={blogForm.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            const suggestedSlug = val
                              .toLowerCase()
                              .replace(/[^a-z0-9-_]/g, '-')
                              .replace(/-+/g, '-');
                            
                            setBlogForm({
                              ...blogForm,
                              title: val,
                              // Auto-suggest slug only when writing a new post
                              slug: selectedBlogForEdit ? blogForm.slug : suggestedSlug,
                            });
                          }}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {/* Slug */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          URL Slug (SEO Friendly)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="instagram-smm-growth-hacks"
                          value={blogForm.slug}
                          onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cover Image */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Cover Image URL (optional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={blogForm.coverImage}
                          onChange={(e) => setBlogForm({ ...blogForm, coverImage: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {/* Status */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Publication Status
                        </label>
                        <select
                          value={blogForm.status}
                          onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-colors font-semibold"
                        >
                          <option value="published">Published (Visible to all clients)</option>
                          <option value="draft">Draft (Admin eyes only)</option>
                        </select>
                      </div>
                    </div>

                    {/* Blog Content */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                        Article Content (Markdown or plain text)
                      </label>
                      <textarea
                        required
                        rows={10}
                        placeholder="Write your article here..."
                        value={blogForm.content}
                        onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none font-sans text-sm leading-relaxed"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 bg-white/[0.01] -mx-6 -mb-6 p-6">
                      <button
                        type="button"
                        onClick={() => setBlogEditorOpen(false)}
                        className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingBlog}
                        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg flex items-center space-x-2"
                      >
                        {savingBlog && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{savingBlog ? 'Saving...' : 'Save Blog Post'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 8: PLATFORM LOGS */}
        {/* ===================================== */}
        {activeTab === 'logs' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-bold text-white">Platform Activity Audits</h2>
              <button onClick={fetchAdminData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Audit Details</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Audit Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                        <td className="px-6 py-4 font-mono text-gray-500">#{log.id}</td>
                        <td className="px-6 py-4 font-semibold text-white">{log.userEmail || 'System / Visitor'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-300 max-w-sm truncate">{log.details}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{log.ipAddress}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">No activity logs recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 9: RESELLER CHILD PANELS */}
        {/* ===================================== */}
        {activeTab === 'child-panels' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl space-y-6">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-sky-400" />
                  <span>Reseller Child Panels Management</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Approve, configure, and manage white-label child panels ordered by resellers.
                </p>
              </div>
              <button onClick={fetchAdminData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/60 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <table className="w-full min-w-[950px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-3.5 whitespace-nowrap">ID</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Reseller User</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Domain</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Currency</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Admin Account</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Price</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                  {childPanels.length > 0 ? (
                    childPanels.map((panel) => (
                      <tr key={panel.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{panel.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{panel.userName}</div>
                          <div className="text-xs text-gray-400 font-mono">{panel.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-sky-400 flex items-center space-x-1 mt-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          <span>{panel.domain}</span>
                        </td>
                        <td className="px-6 py-4 font-mono">{panel.currency}</td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <div>User: {panel.adminUsername}</div>
                          <div className="text-gray-500">Pass: {panel.adminPassword}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold">₹{Number(panel.price).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              panel.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : panel.status === 'pending'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {panel.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {panel.status !== 'active' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/child-panels/${panel.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'active' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Child panel activated successfully!');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to activate child panel.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Activate
                            </button>
                          )}
                          {panel.status !== 'expired' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/child-panels/${panel.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'expired' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Child panel marked as expired.');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to update status.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Expire
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500">No reseller child panels found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 10: REFILL REQUESTS */}
        {/* ===================================== */}
        {activeTab === 'refills' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl space-y-6">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <RotateCcw className="w-5 h-5 text-teal-400" />
                  <span>Refill Requests Queue</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Manage dropped followers/likes replenish requests and update their dispatch statuses.
                </p>
              </div>
              <button onClick={fetchAdminData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400/60 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <table className="w-full min-w-[850px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-3.5 whitespace-nowrap">Refill ID</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Order ID</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">User</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Service</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Link</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                  {refills.length > 0 ? (
                    refills.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{req.id}</td>
                        <td className="px-6 py-4 font-mono text-purple-400">#{req.orderId}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{req.userName}</div>
                          <div className="text-xs text-gray-400 font-mono">{req.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white max-w-[200px] truncate">
                          {req.serviceName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs truncate max-w-[150px]">
                          <a href={req.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                            {req.link}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              req.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : req.status === 'processing'
                                ? 'bg-amber-500/10 text-amber-400'
                                : req.status === 'rejected'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {req.status !== 'processing' && req.status !== 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/refill-requests/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'processing' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Refill request marked as processing.');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to update refill status.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Process
                            </button>
                          )}
                          {req.status !== 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/refill-requests/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'completed' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Refill request completed successfully!');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to complete refill request.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          {req.status !== 'rejected' && req.status !== 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/refill-requests/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'rejected' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Refill request rejected.');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to reject refill request.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">No refill requests found in queue.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: MANUAL SELLER SYNC ENGINE */}
        {/* ===================================== */}
        {activeTab === 'manual-sync' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-12">
            {/* Sync Control & Configuration */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl space-y-6">
                <h3 className="text-md font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-orange-400" />
                  <span>Sync Configurations</span>
                </h3>

                {/* Seller Select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    1. Select SMM Seller
                  </label>
                  <select
                    value={selectedSyncProviderId}
                    onChange={(e) => handleSelectProviderForSync(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all"
                  >
                    <option value="">-- Choose SMM Provider --</option>
                    {providersList.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name} (Balance: ₹{parseFloat(prov.balance || '0').toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sync Scope */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    2. Sync Scope
                  </label>
                  <div className="space-y-2.5">
                    {[
                      { id: 'all', title: 'Sync All Services', desc: 'Add brand new items & update price/limits of matched ones' },
                      { id: 'new_only', title: 'New Services Only', desc: 'Only import services not already in our catalog' },
                      { id: 'price_only', title: 'Price & Limits Only', desc: 'Only update customer prices & amount boundaries' },
                      { id: 'selected', title: 'Only Selected Services', desc: 'Manually check specific services from list below to import' },
                    ].map((scope) => (
                      <label
                        key={scope.id}
                        onClick={() => setSyncScope(scope.id as any)}
                        className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          syncScope === scope.id
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-[#080d1a]/50 border-white/5 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="radio"
                          name="syncScope"
                          checked={syncScope === scope.id}
                          onChange={() => {}}
                          className="mt-0.5 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{scope.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{scope.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Dynamic Service IDs Input field for high usability */}
                  {syncScope === 'selected' && (
                    <div className="mt-3 p-3.5 bg-[#080c16]/90 border border-orange-500/15 rounded-xl space-y-2">
                      <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                        Selected SMM Service IDs
                      </label>
                      <textarea
                        rows={3}
                        value={manualSyncIdsStr}
                        onChange={(e) => handleManualSyncIdsChange(e.target.value)}
                        placeholder="Type or paste SMM Service IDs (e.g. 101, 102, 350)"
                        className="w-full p-2.5 rounded-lg bg-[#040710] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-orange-500/50 resize-none"
                      />
                      <div className="flex justify-between items-center text-[9px] text-gray-500 leading-normal">
                        <span>Tip: Separate with commas or spaces.</span>
                        <span className="font-bold text-orange-400">{selectedSyncServiceIds.size} selected</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profit Margin */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    3. Profit Percentage Markup
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="30"
                      value={syncProfitPercentage}
                      onChange={(e) => setSyncProfitPercentage(e.target.value)}
                      className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500 transition-all"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-gray-500">%</span>
                  </div>

                  {/* Profit Presets */}
                  <div className="flex gap-2 mt-2">
                    {['15', '30', '50', '100'].map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setSyncProfitPercentage(percent)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                          syncProfitPercentage === percent
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                        }`}
                      >
                        +{percent}%
                      </button>
                    ))}
                  </div>

                  {/* Live Cost Preview Block */}
                  <div className="mt-3 p-3 bg-[#080c16] rounded-xl border border-white/5 space-y-1.5 text-[10px]">
                    <div className="text-gray-400 font-bold uppercase tracking-wider">Example markup math:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provider base cost:</span>
                      <span className="font-mono text-white">₹10.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Margin markup:</span>
                      <span className="font-mono text-orange-400">+{syncProfitPercentage || '0'}%</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1 font-bold">
                      <span className="text-gray-400">Our Catalog Price:</span>
                      <span className="font-mono text-emerald-400">
                        ₹{(10 * (1 + (parseFloat(syncProfitPercentage) || 0) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleFetchSyncPreview()}
                    disabled={previewLoading || syncing || !selectedSyncProviderId}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
                  >
                    <RefreshCw className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`} />
                    <span>Preview Remote Listings</span>
                  </button>

                  <button
                    onClick={handleExecuteSync}
                    disabled={syncing || previewLoading || !selectedSyncProviderId}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-xs font-bold text-white tracking-wider uppercase transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center space-x-2 disabled:opacity-40"
                  >
                    <Activity className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    <span>Run Sync Operations</span>
                  </button>
                </div>
              </div>

              {/* Sync Results Feedback Card */}
              {syncResult && (
                <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xl space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Sync Task Completed</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#0b101f]/80 p-3 rounded-xl border border-white/5">
                      <div className="text-xl font-bold font-mono text-emerald-400">{syncResult.addedCount}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Imported</div>
                    </div>
                    <div className="bg-[#0b101f]/80 p-3 rounded-xl border border-white/5">
                      <div className="text-xl font-bold font-mono text-blue-400">{syncResult.updatedCount}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Updated</div>
                    </div>
                    <div className="bg-[#0b101f]/80 p-3 rounded-xl border border-white/5">
                      <div className="text-xl font-bold font-mono text-gray-400">{syncResult.skippedCount}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Skipped</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-center text-gray-500">
                    A total of <span className="font-bold text-white">{syncResult.totalProcessed}</span> services evaluated successfully.
                  </div>
                </div>
              )}
            </div>

            {/* Remote Inventory Workspace Preview */}
            <div className="lg:col-span-8 glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-[#0e1424]/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Remote SMM Inventory Preview</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Real-time mapping & cost simulations for selected seller</p>
                  </div>
                </div>

                {/* Filter */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search remote listings..."
                    value={syncSearchQuery}
                    onChange={(e) => setSyncSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Provider, Category & Service Fast Select (User Panel Style) */}
              <div className="p-4 border-b border-white/5 bg-[#0a0f1d] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* 1. Provider Select */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>1. Provider</span>
                    {selectedSyncProviderId && !previewLoading && syncPreviewServices.length > 0 && (
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">
                        {syncPreviewServices.length} loaded
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedSyncProviderId}
                    onChange={(e) => handleSelectProviderForSync(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all truncate"
                  >
                    <option value="">-- Choose SMM Provider --</option>
                    {providersList.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name} (₹{parseFloat(prov.balance || '0').toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Category Select (Only of selected provider) */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>2. Category</span>
                    {selectedSyncCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSyncCategory('');
                          setSelectedSyncQuickService('');
                        }}
                        className="text-[9px] text-orange-400 hover:text-orange-300 font-semibold cursor-pointer lowercase"
                      >
                        Clear filter
                      </button>
                    )}
                  </label>
                  <select
                    disabled={!selectedSyncProviderId || previewLoading}
                    value={selectedSyncCategory}
                    onChange={(e) => {
                      setSelectedSyncCategory(e.target.value);
                      setSelectedSyncQuickService('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {!selectedSyncProviderId ? (
                      <option value="">-- Select Provider First --</option>
                    ) : previewLoading ? (
                      <option value="">Loading categories...</option>
                    ) : (
                      <>
                        <option value="">All Categories ({uniqueSyncCategories.length})</option>
                        {uniqueSyncCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* 3. Service Select */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>3. Service</span>
                    {selectedSyncCategory && (
                      <span className="text-[9px] text-gray-400 font-mono">
                        {categoryFilteredSyncServices.length} items
                      </span>
                    )}
                  </label>
                  <select
                    disabled={!selectedSyncProviderId || previewLoading || categoryFilteredSyncServices.length === 0}
                    value={selectedSyncQuickService}
                    onChange={(e) => setSelectedSyncQuickService(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all truncate disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedSyncProviderId
                        ? '-- Select Provider First --'
                        : previewLoading
                        ? 'Loading...'
                        : categoryFilteredSyncServices.length === 0
                        ? 'No services found'
                        : '-- Choose Service to Add --'}
                    </option>
                    {categoryFilteredSyncServices.map((s) => (
                      <option key={s.service} value={s.service}>
                        #{s.service} - {s.name} (₹{parseFloat(s.rate || '0').toFixed(3)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Add Button */}
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    disabled={!selectedSyncQuickService}
                    onClick={() => {
                      if (!selectedSyncQuickService) return;
                      const newSelected = new Set<string>(selectedSyncServiceIds);
                      newSelected.add(String(selectedSyncQuickService));
                      updateSelectedSyncServiceIds(newSelected);
                      if (syncScope !== 'selected') {
                        setSyncScope('selected');
                      }
                      showSuccess(`Service #${selectedSyncQuickService} added to sync selection!`);
                    }}
                    className="w-full px-2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                    title="Add selected service to sync list"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {previewLoading && (
                <div className="py-24 flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-sm font-semibold text-gray-400 animate-pulse">
                    Querying seller inventory and retrieving pricing matrices...
                  </p>
                </div>
              )}

              {previewError && (
                <div className="p-6 m-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">Failed to load remote listings</p>
                    <p className="opacity-90">{previewError}</p>
                  </div>
                </div>
              )}

              {!previewLoading && !previewError && syncPreviewServices.length === 0 && (
                <div className="py-24 text-center border border-dashed border-white/5 m-6 rounded-2xl bg-[#080c16]/50">
                  <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-semibold">No SMM Seller Preview Loaded</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Choose an SMM Seller on the left control panel and click "Preview Remote Listings" to run live mapping before sync.
                  </p>
                </div>
              )}

              {!previewLoading && !previewError && syncPreviewServices.length > 0 && (() => {
                const query = syncSearchQuery.toLowerCase().trim();
                const filtered = syncPreviewServices.filter((item) => {
                  const catMatch = !selectedSyncCategory || (item.category || 'Uncategorized').trim() === selectedSyncCategory.trim();
                  if (!catMatch) return false;
                  if (!query) return true;
                  const name = (item.name || '').toLowerCase();
                  const cat = (item.category || '').toLowerCase();
                  const srvId = String(item.service);
                  return name.includes(query) || cat.includes(query) || srvId === query;
                });

                return (
                  <div className="p-4 space-y-4">
                    {/* Header summary info & toggle all for selected scope */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-[#080d1a] p-3 rounded-xl border border-white/5 gap-3 text-xs">
                      <div className="text-gray-400">
                        Matching: <span className="font-bold text-white">{filtered.length}</span> of{' '}
                        <span className="font-bold text-white">{syncPreviewServices.length}</span> services.
                        {selectedSyncServiceIds.size > 0 && (
                          <span className="ml-2 text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20 animate-pulse">
                            ({selectedSyncServiceIds.size} checked for sync)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newSelected = new Set<string>(selectedSyncServiceIds);
                            filtered.forEach(item => newSelected.add(String(item.service)));
                            updateSelectedSyncServiceIds(newSelected);
                            if (syncScope !== 'selected') {
                              setSyncScope('selected');
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white transition-all border border-white/10"
                        >
                          Check All Matching
                        </button>
                        <button
                          onClick={() => {
                            const newSelected = new Set<string>(selectedSyncServiceIds);
                            filtered.forEach(item => newSelected.delete(String(item.service)));
                            updateSelectedSyncServiceIds(newSelected);
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white transition-all border border-white/10"
                        >
                          Uncheck All
                        </button>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="max-h-[500px] overflow-y-auto rounded-xl border border-white/5">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#080c16] z-10">
                          <tr className="border-b border-white/10 bg-[#080c16] text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-center w-12">Select</th>
                            <th className="px-4 py-3 w-16 text-center">ID</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Service Name</th>
                            <th className="px-4 py-3 text-right">Seller Cost</th>
                            <th className="px-4 py-3 text-right text-orange-400">Our Cost</th>
                            <th className="px-4 py-3 text-center">Min / Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-xs text-gray-500">
                                No remote services match your search query.
                              </td>
                            </tr>
                          ) : (
                            filtered.map((item) => {
                              const srvIdStr = String(item.service);
                              const isSelected = selectedSyncServiceIds.has(srvIdStr);
                              const originalRate = parseFloat(item.rate) || 0;
                              const markupPercent = parseFloat(syncProfitPercentage) || 0;
                              const ourCost = originalRate * (1 + markupPercent / 100);

                              return (
                                <tr
                                  key={srvIdStr}
                                  onClick={() => {
                                    const newSelected = new Set<string>(selectedSyncServiceIds);
                                    if (newSelected.has(srvIdStr)) {
                                      newSelected.delete(srvIdStr);
                                    } else {
                                      newSelected.add(srvIdStr);
                                    }
                                    updateSelectedSyncServiceIds(newSelected);
                                    if (syncScope !== 'selected') {
                                      setSyncScope('selected');
                                    }
                                  }}
                                  className={`border-b border-white/5 text-xs hover:bg-[#121b33] transition-all cursor-pointer ${
                                    isSelected ? 'bg-orange-500/5 text-orange-400 font-medium' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        const newSelected = new Set<string>(selectedSyncServiceIds);
                                        if (newSelected.has(srvIdStr)) {
                                          newSelected.delete(srvIdStr);
                                        } else {
                                          newSelected.add(srvIdStr);
                                        }
                                        updateSelectedSyncServiceIds(newSelected);
                                        if (syncScope !== 'selected') {
                                          setSyncScope('selected');
                                        }
                                      }}
                                      className="rounded border-white/20 bg-gray-900 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-gray-500">#{srvIdStr}</td>
                                  <td className="px-4 py-3">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-gray-300 border border-white/10 truncate max-w-[120px] block" title={item.category}>
                                      {item.category || 'Uncategorized'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-white max-w-[200px] truncate" title={item.name}>
                                    {item.name}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-gray-400">₹{originalRate.toFixed(4)}</td>
                                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">₹{ourCost.toFixed(4)}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[10px] text-gray-500">
                                    {item.min} &ndash; {item.max}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: SMM PANEL SETTINGS */}
        {/* ===================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-8 pb-12">
            {/* Header / Save Action Banner */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-950/20 to-blue-950/20">
              <div>
                <h3 className="text-md font-bold text-white">Save Changes</h3>
                <p className="text-xs text-gray-400 mt-1">Submit parameters to synchronize branding and script modifications globally.</p>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold font-mono text-white tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Persist Customizations</span>
              </button>
            </div>

            {/* Quick Access to Payment Gateways Hub */}
            <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-teal-950/20 to-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Payment Gateway & UPI QR Management</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Dedicated Hub</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configure BharatPe, PhonePe, Paytm, Google Pay, Mobile Phone OTP, and Instant 12-digit UTR Auto-Credit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('payment-settings')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer shrink-0"
              >
                <span>Manage Payment Settings</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Box 1: Core Identity & Multi-Channel Support */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Brand Identity & Multi-Channel Support</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control panel brand name, language, and customer care channels.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Website / Brand Name</label>
                    <input
                      type="text"
                      placeholder="YouthSMM"
                      value={panelSettings.websiteName || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, websiteName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Default Language</label>
                    <select
                      value={panelSettings.defaultLanguage || 'en'}
                      onChange={e => setPanelSettings({ ...panelSettings, defaultLanguage: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="en">English (Default)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="pt">Português (Portuguese)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">WhatsApp Contact Number</label>
                      <input
                        type="text"
                        placeholder="919999999999"
                        value={panelSettings.whatsappNumber || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, whatsappNumber: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Telegram Username / Link</label>
                      <input
                        type="text"
                        placeholder="@youthsmm"
                        value={panelSettings.telegramUsername || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, telegramUsername: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Support Helpdesk Email</label>
                      <input
                        type="email"
                        placeholder="support@youthsmm.com"
                        value={panelSettings.supportEmail || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, supportEmail: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Support Working Hours Badge</label>
                      <input
                        type="text"
                        placeholder="24x7 Customer Helpdesk"
                        value={panelSettings.supportWorkingHours || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, supportWorkingHours: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Visual Media Assets */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Visual Media Assets</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Customize logotypes, dynamic web icons, and explainers.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Website Logo URL</label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={panelSettings.websiteLogo || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, websiteLogo: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      {panelSettings.websiteLogo && (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                          <img src={panelSettings.websiteLogo} alt="Logo preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Favicon Icon URL</label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        placeholder="https://example.com/favicon.ico"
                        value={panelSettings.favicon || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, favicon: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      {panelSettings.favicon && (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-2">
                          <img src={panelSettings.favicon} alt="Favicon preview" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Home Page YouTube Video ID</label>
                    <input
                      type="text"
                      placeholder="dQw4w9WgXcQ"
                      value={panelSettings.homepageYoutubeId || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, homepageYoutubeId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      Enter the 11-character video key (e.g. <strong>dQw4w9WgXcQ</strong>) to embed an interactive platform explainer tutorial directly inside the public guest portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 3: Currency Exchange Rates */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Currency Conversion Rates (INR Base)</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control live user currency switcher calculations against Indian Rupee.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">1 INR to USD Rate ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="0.012"
                      value={panelSettings.inrToUsdRate || '0.012'}
                      onChange={e => setPanelSettings({ ...panelSettings, inrToUsdRate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">e.g. 0.012 means ₹100 = $1.20 USD</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">1 INR to EUR Rate (€)</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="0.011"
                      value={panelSettings.inrToEurRate || '0.011'}
                      onChange={e => setPanelSettings({ ...panelSettings, inrToEurRate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">e.g. 0.011 means ₹100 = €1.10 EUR</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">1 INR to PKR Rate (₨)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="3.32"
                      value={panelSettings.inrToPkrRate || '3.32'}
                      onChange={e => setPanelSettings({ ...panelSettings, inrToPkrRate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">e.g. 3.32 means ₹100 = ₨ 332 PKR</p>
                  </div>
                </div>
              </div>

              {/* Box 4: User Dashboard Promo Banners (Multi-Banner Carousel, Edit & Add New) */}
              <div className="lg:col-span-2">
                <PromoBannerManager
                  panelSettings={panelSettings}
                  setPanelSettings={setPanelSettings}
                  token={token}
                  showSuccess={showSuccess}
                  showError={showError}
                />
              </div>

              {/* Box 5: User Dashboard Greeting, Sidebar & XP Badges */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">User Dashboard Greeting, Sidebar & XP Gamification</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Customize greeting notices, sidebar tier labels, reward texts, and copyright messages.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Dashboard Top Greeting Notice</label>
                    <input
                      type="text"
                      placeholder="Place a new order in a few taps — orders delivered on YouthSMM | Main SMM Provider."
                      value={panelSettings.greetingNotice || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, greetingNotice: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sidebar "+ Add funds" Button</label>
                      <input
                        type="text"
                        placeholder="+ Add funds"
                        value={panelSettings.sidebarAddFundsBtnText || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, sidebarAddFundsBtnText: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sidebar Level Badge</label>
                      <input
                        type="text"
                        placeholder="Level 3"
                        value={panelSettings.sidebarLevelNum || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, sidebarLevelNum: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sidebar Tier Name</label>
                      <input
                        type="text"
                        placeholder="BRONZE"
                        value={panelSettings.sidebarLevelName || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, sidebarLevelName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sidebar XP Counter</label>
                      <input
                        type="text"
                        placeholder="66 / 120 XP"
                        value={panelSettings.sidebarXpText || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, sidebarXpText: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sidebar Next Target</label>
                      <input
                        type="text"
                        placeholder="Next: 54 XP"
                        value={panelSettings.sidebarNextXp || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, sidebarNextXp: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sidebar Rewards Link Label</label>
                      <input
                        type="text"
                        placeholder="🏆 VIEW REWARDS & LEVELS"
                        value={panelSettings.sidebarRewardsLinkText || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, sidebarRewardsLinkText: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Global Footer Copyright Line</label>
                      <input
                        type="text"
                        placeholder="© YouthSMM | Main SMM Provider"
                        value={panelSettings.footerCopyright || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, footerCopyright: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 6: Child Panels Reseller Settings */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Child Panels Reseller Package</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control title, pricing, features, and nameserver instructions shown to users under the "Child Panels" tab.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Product Heading</label>
                    <input
                      type="text"
                      placeholder="Rent a Child Panel"
                      value={panelSettings.childPanelTitle || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, childPanelTitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Price Tag</label>
                    <input
                      type="text"
                      placeholder="₹ 1,500 / month"
                      value={panelSettings.childPanelPrice || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, childPanelPrice: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tagline / Subtitle</label>
                    <input
                      type="text"
                      placeholder="Start your own automated SMM panel website connected to our provider API"
                      value={panelSettings.childPanelDescription || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, childPanelDescription: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Nameservers Text</label>
                    <input
                      type="text"
                      placeholder="ns1.youthsmm.com & ns2.youthsmm.com"
                      value={panelSettings.childPanelNameservers || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, childPanelNameservers: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Box 6B: Affiliate Program & Rewards Perks Customization */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Affiliate & Rewards Modal Tier Perks</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Customize texts shown in Affiliate Program tab and the Rewards & Levels popup modal.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Affiliate Heading</label>
                    <input
                      type="text"
                      placeholder="Affiliate Referral Program"
                      value={panelSettings.affiliateTitle || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, affiliateTitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Affiliate Description / Rate Subtitle</label>
                    <input
                      type="text"
                      placeholder="Earn 5% lifetime commission on every deposit by referred users"
                      value={panelSettings.affiliateSubtitle || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, affiliateSubtitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Level 1 (Bronze) Perk Text</label>
                    <input
                      type="text"
                      placeholder="Standard Rates"
                      value={panelSettings.level1Perk || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, level1Perk: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Level 2 (Silver) Perk Text</label>
                    <input
                      type="text"
                      placeholder="300 XP · 2% Lifetime Discount"
                      value={panelSettings.level2Perk || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, level2Perk: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Level 3 (Gold) Perk Text</label>
                    <input
                      type="text"
                      placeholder="1000 XP · 5% Lifetime Discount"
                      value={panelSettings.level3Perk || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, level3Perk: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Box 6C: Add Funds, QR Code & Bank Transfer Content */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Add Funds Page, QR Code & Bank Details</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Customize payment QR image, UPI ID, manual bank transfer instructions, and helper text for deposits.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">UPI / BharatPe QR Code Image URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/qr-code.png"
                      value={panelSettings.bharatpeQrUrl || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, bharatpeQrUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Merchant Name</label>
                    <input
                      type="text"
                      placeholder="YouthSMM Official"
                      value={panelSettings.bharatpeMerchantName || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, bharatpeMerchantName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">UPI VPA / ID</label>
                    <input
                      type="text"
                      placeholder="paytm-12345@paytm"
                      value={panelSettings.bharatpeVpa || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, bharatpeVpa: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Manual Bank Transfer Details / Instructions</label>
                    <textarea
                      rows={3}
                      placeholder="Bank: HDFC Bank&#10;A/C: 50100234567890&#10;IFSC: HDFC0001234&#10;Holder: Youth SMM Services"
                      value={panelSettings.bankTransferInstructions || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, bankTransferInstructions: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Add Funds Page Note / Notice</label>
                    <textarea
                      rows={3}
                      placeholder="⚠️ Please make sure to enter correct 12-digit UTR number for automatic credit."
                      value={panelSettings.addFundPageContent || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, addFundPageContent: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Box 7: Legal, Knowledgebase & Policy Management */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Policies, Terms & FAQ Management</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Customize complete text for Terms of Service, Privacy Policy, and Frequently Asked Questions tabs.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Terms & Conditions (Custom Content)</label>
                    <textarea
                      rows={5}
                      placeholder="Enter custom terms and rules..."
                      value={panelSettings.termsOfService || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, termsOfService: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Leave empty to use automatic standard terms.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Privacy Policy (Custom Content)</label>
                    <textarea
                      rows={5}
                      placeholder="Enter custom privacy policy..."
                      value={panelSettings.privacyPolicy || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, privacyPolicy: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Leave empty to use automatic standard privacy policy.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">FAQ / Help Knowledgebase (Custom Content)</label>
                    <textarea
                      rows={5}
                      placeholder="Q: How long do orders take?&#10;A: Usually 1-5 minutes."
                      value={panelSettings.faqContent || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, faqContent: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Leave empty to use built-in rich FAQ accordion.</p>
                  </div>
                </div>
              </div>

              {/* Box 3: Site Optimization & SEO */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Search Engine Optimization (SEO)</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control indexing keywords, crawler tags, and search result snippets.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">SEO Keywords (Comma Separated)</label>
                    <textarea
                      rows={3}
                      placeholder="smm panel, social followers, automatic likes, cheapest smm panel"
                      value={panelSettings.seoKeywords || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, seoKeywords: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">SEO Description Meta Tag</label>
                    <textarea
                      rows={3}
                      placeholder="Access high-speed automated social growth services with instant dispatch protocols."
                      value={panelSettings.seoDescription || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, seoDescription: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Box: Exclusive Payment Gateway Policy & Status */}
              <div className="glass-card p-6 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-950/20 to-emerald-950/20 space-y-4 lg:col-span-2 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-emerald-600 text-white rounded-xl shadow-md">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center space-x-2">
                        <span>Exclusive Payment Gateway: BharatPe</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold uppercase">
                          Single Active Gateway
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        All legacy payment methods (Razorpay, PhonePe, Stripe, PayPal, manual UPI, etc.) are permanently removed and disabled. Only BharatPe is active.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/30 flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>View BharatPe Payments Ledger</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0b101f]/80 border border-white/5 space-y-1">
                    <div className="flex items-center space-x-1.5 text-teal-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Security & Storage</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      BharatPe Merchant ID & Token are securely stored server-side in <code className="text-teal-300 font-mono">.env</code> and never exposed in the browser frontend.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b101f]/80 border border-white/5 space-y-1">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Official API Verification</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Every deposit transaction is verified against the official BharatPe merchant API before crediting wallet balance. Duplicate credits are prevented.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b101f]/80 border border-white/5 space-y-1">
                    <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>Audit & Status Tracking</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Track and manage all transaction statuses (Pending, Success, Failed, Cancelled) in real time from the BharatPe Payments Ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box: BharatPe Gateway Account OTP Linking */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
                      <Smartphone className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">BharatPe UPI Dynamic QR Account Linking</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">Link your BharatPe merchant account via registered mobile number and OTP verification, or configure manually.</p>
                    </div>
                  </div>
                </div>

                {panelSettings.bharatpeStatus === 'linked' ? (
                  // Linked View (Fully Editable & Direct Modification Allowed!)
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-r from-emerald-950/10 to-blue-950/10 p-5 rounded-2xl border border-emerald-500/10 relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">Gateway Active & Linked</span>
                        </div>

                        <div className="flex items-center space-x-2 bg-[#0b101f]/80 px-2.5 py-1 rounded-lg border border-white/5">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Gateway:</span>
                          <select
                            value={panelSettings.bharatpeStatus || 'linked'}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpeStatus: e.target.value })}
                            className="px-1.5 py-0.5 rounded bg-transparent text-xs font-bold text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                          >
                            <option value="linked" className="bg-[#0b101f] text-emerald-400">Enabled (Active)</option>
                            <option value="unlinked" className="bg-[#0b101f] text-red-400">Disabled (Inactive)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">BharatPe Merchant ID</label>
                              <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20">Active</span>
                            </div>
                            <input
                              type="text"
                              value={panelSettings.bharatpeMerchantId || ''}
                              onChange={e => setPanelSettings({ ...panelSettings, bharatpeMerchantId: e.target.value })}
                              placeholder="Enter Merchant ID (or set in Vercel)"
                              className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-teal-500/30 text-teal-300 text-xs focus:outline-none focus:border-teal-500 transition-colors font-mono font-bold"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">BharatPe API Token</label>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Authenticated</span>
                            </div>
                            <input
                              type="password"
                              value={panelSettings.bharatpeToken || ''}
                              onChange={e => setPanelSettings({ ...panelSettings, bharatpeToken: e.target.value })}
                              placeholder="Enter API Token (or set in Vercel)"
                              className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-emerald-500/30 text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Merchant Display Name</label>
                          <input
                            type="text"
                            value={panelSettings.bharatpeMerchantName || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpeMerchantName: e.target.value })}
                            placeholder="BharatPe Merchant"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Registered Mobile (+91)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={panelSettings.bharatpePhone || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpePhone: e.target.value.replace(/\D/g, '') })}
                            placeholder="8795005604"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Linked UPI ID (VPA) for Dynamic Payments</label>
                          <input
                            type="text"
                            value={panelSettings.bharatpeVpa || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpeVpa: e.target.value })}
                            placeholder="BHARATPE2H0D0Q1Y4T29351@unitype"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono text-purple-400 font-bold"
                          />
                        </div>

                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <div className="text-xs font-bold text-purple-300">Instant UTR Auto-Credit Mode</div>
                            <div className="text-[10px] text-gray-400">
                              When enabled, user wallet is credited instantly upon entering a valid 12-digit UTR with anti-fraud duplicate checks.
                            </div>
                          </div>
                          <select
                            value={panelSettings.instantUtrAutoCredit || 'enabled'}
                            onChange={e => setPanelSettings({ ...panelSettings, instantUtrAutoCredit: e.target.value })}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0b101f] border border-purple-500/30 text-xs font-bold text-purple-300 focus:outline-none cursor-pointer"
                          >
                            <option value="enabled" className="bg-[#0b101f] text-emerald-400">Instant Credit (Active)</option>
                            <option value="disabled" className="bg-[#0b101f] text-amber-400">Require Admin Approval</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 space-y-2.5">
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          Need to make changes? Modify any details above and click <strong>"Save QR Customizations"</strong> to persist updates instantly, or disconnect to start over.
                        </p>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={handleSaveBharatpeSettings}
                            disabled={bpLoading}
                            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center space-x-2 animate-in fade-in duration-300"
                          >
                            {bpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save QR Customizations</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleUnlinkBharatpe}
                            disabled={bpLoading}
                            className="px-3.5 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 transition-all flex items-center space-x-1"
                          >
                            <span>Disconnect Account</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Standee Visualization */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative">
                      {/* High fidelity BharatPe Standee Preview */}
                      <div className="w-56 rounded-[2rem] p-3.5 border border-[#02a08b]/30 shadow-2xl relative overflow-hidden flex flex-col items-center select-none" style={{ background: 'linear-gradient(171deg, #f26c5f 63%, #017f6e 63%)' }}>
                        {/* Top area of standee: BharatPe Branding */}
                        <div className="w-full text-center mb-3 pt-1">
                          <div className="text-white text-[8px] tracking-[0.15em] uppercase font-bold text-center leading-none opacity-90 drop-shadow-sm mb-1">
                            Hai Yakeen
                          </div>
                          <div className="flex items-center justify-center space-x-1">
                            {/* Beautiful high-fidelity BharatPe circle logo */}
                            <span className="w-4 h-4 rounded-full bg-[#35cac0] flex items-center justify-center shadow-sm relative">
                              <span className="w-2 h-2 rounded-full border-[1.5px] border-white border-t-transparent border-l-transparent transform -rotate-45 -translate-y-[0.5px]"></span>
                            </span>
                            <span className="text-white text-sm font-extrabold tracking-tight drop-shadow-sm leading-none flex items-center">
                              <span>Bharat</span>
                              <span className="font-light opacity-95">Pe</span>
                            </span>
                          </div>
                        </div>

                        {/* Central White Payment Info Card */}
                        <div className="w-full bg-white rounded-[1.25rem] p-3 flex flex-col items-center shadow-lg border border-white/10 z-10">
                          {/* Merchant Name */}
                          <div className="text-center font-extrabold text-sm text-gray-950 tracking-wider uppercase mb-2 mt-0.5 leading-none">
                            {panelSettings.bharatpeMerchantName || 'PRIYA'}
                          </div>

                          {/* QR Code Container with subtle grey border */}
                          <div className="w-32 h-32 border border-gray-100 rounded-xl p-1.5 flex items-center justify-center bg-white relative shadow-sm overflow-hidden">
                            {/* Dynamic QR image preview */}
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                `upi://pay?pa=${panelSettings.bharatpeVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype'}&pn=${encodeURIComponent(
                                  panelSettings.bharatpeMerchantName || 'PRIYA'
                                )}&am=100.00&cu=INR&tn=SMMPreview&mc=0000&mode=02&purpose=00`
                              )}`}
                              alt="BharatPe QR Code Preview"
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {/* High fidelity BharatPe Logo Overlay in the center of the QR code */}
                            <div className="absolute inset-0 m-auto w-8 h-8 bg-white rounded-full flex items-center justify-center p-[1.5px] shadow-md border border-gray-100">
                              <div className="w-full h-full rounded-full bg-[#35cac0] flex items-center justify-center relative overflow-hidden">
                                <div className="flex flex-col space-y-[1px] w-4 transform rotate-[15deg] items-center">
                                  <div className="w-3.5 h-[1.5px] bg-[#eb5e52] rounded-full"></div>
                                  <div className="w-3.5 h-[1.5px] bg-[#003831] rounded-full"></div>
                                  <div className="w-3.5 h-[1.5px] bg-white rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* UPI ID / VPA Pill exactly like the image */}
                          <div className="w-full py-2 px-2 rounded-lg bg-[#F8F9FA] border border-gray-200/60 flex items-center justify-center space-x-1.5 mt-2.5 shadow-inner">
                            {/* Dynamic UPI Tricolor Triangle Badge */}
                            <span className="flex-shrink-0 w-3 h-3 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                              <span className="w-0 h-0 border-t-[4px] border-t-amber-500 border-l-[4px] border-l-emerald-500 border-r-[4px] border-r-transparent border-b-[4px] border-b-transparent transform rotate-[45deg] -translate-x-[0.5px]"></span>
                            </span>
                            <span className="text-[8px] font-extrabold text-[#0D233A] font-mono tracking-wide break-all text-center select-all leading-none">
                              {panelSettings.bharatpeVpa || 'BHARATPE2H0D0Q1Y4T29351@unitype'}
                            </span>
                          </div>
                        </div>

                        {/* BHIM UPI Bottom Footer section */}
                        <div className="w-full pt-3 flex flex-col items-center">
                          <div className="flex items-center space-x-1.5 justify-center mb-0.5">
                            <span className="text-white text-base font-black tracking-widest italic font-sans drop-shadow-sm">BHIM</span>
                            <span className="text-white/60 text-sm font-light leading-none">❯</span>
                            <span className="text-white text-base font-black tracking-widest italic font-sans drop-shadow-sm">UPI</span>
                          </div>
                          <div className="text-[5.5px] text-white/70 tracking-[0.18em] font-extrabold uppercase leading-none text-center mb-3">
                            BHARAT INTERFACE FOR MONEY <span className="mx-0.5 text-white/30">•</span> UNIFIED PAYMENTS INTERFACE
                          </div>
                          
                          <div className="text-[8px] text-white/95 font-medium mb-1">
                            Pay with any UPI app
                          </div>

                          {/* Circular Payment App Logos */}
                          <div className="flex items-center justify-center space-x-2 pb-1">
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/10 font-bold text-[6px] text-[#002E6E] leading-none">paytm</div>
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/10 font-bold text-[6px] text-[#1E88E5] leading-none">G Pay</div>
                            <div className="w-5 h-5 rounded-full bg-[#5f259f] flex items-center justify-center shadow-sm border border-white/10 font-bold text-[10px] text-white leading-none">पे</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-3 text-center leading-relaxed">
                        Live dynamic QR payload is generated per transaction on Checkout.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Multi-Step Setup Wizard
                  <div className="space-y-5 bg-white/[0.01] p-6 rounded-2xl border border-white/5 relative overflow-hidden min-h-[220px]">
                    {bpLoading && (
                      <div className="absolute inset-0 bg-[#070b14]/95 z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
                        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
                        <div className="text-xs font-bold text-white tracking-wide">Processing Secure Link request...</div>
                        <div className="text-[10px] text-gray-400">Communicating with BharatPe Settlement APIs</div>
                      </div>
                    )}

                    {setupStep === 'intro' && (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-pink-500/[0.03] p-5 rounded-xl border border-pink-500/10">
                          <div className="space-y-1.5 max-w-lg">
                            <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 text-[10px] font-bold uppercase tracking-wider">Dynamic QR Settlements</span>
                            <h5 className="text-sm font-bold text-white">Automate SMM Client Payments with BharatPe</h5>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Enable direct UPI transfers from any client device into your bank account. The system automatically reconciles 12-digit transaction UTR codes in real time to auto-credit fund balances.
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-lg">
                              <QrCode className="w-8 h-8 text-pink-400" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1">
                            <div className="text-xs font-bold text-white">0% Fees</div>
                            <div className="text-[10px] text-gray-400">Direct peer-to-peer bank settlement via standard UPI channels.</div>
                          </div>
                          <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1">
                            <div className="text-xs font-bold text-white">Auto Reconciliation</div>
                            <div className="text-[10px] text-gray-400">Users enter UTR codes to verify payment receipts instantly.</div>
                          </div>
                          <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1">
                            <div className="text-xs font-bold text-white">Interactive Checkout</div>
                            <div className="text-[10px] text-gray-400">Elegant dynamic QR codes are rendered based on user-entered amounts.</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center pt-2">
                          <button
                            type="button"
                            onClick={() => setSetupStep('mobile')}
                            className="px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all flex items-center space-x-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            <Smartphone className="w-4 h-4" />
                            <span>Connect BharatPe QR (via Phone OTP)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowSmsGatewayConfig(!showSmsGatewayConfig)}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5 flex items-center space-x-2 cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-pink-400" />
                            <span>SMS Gateway Config</span>
                          </button>
                        </div>

                        {/* Expandable SMS Gateway Configuration */}
                        {showSmsGatewayConfig && (
                          <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3 mt-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center space-x-2">
                                <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                                <span>SMS Delivery Gateway Credentials (Fast2SMS / 2Factor)</span>
                              </span>
                              <span className="text-[10px] text-gray-400">Phone SMS Dispatch</span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              To receive OTPs directly on your mobile phone, enter your Fast2SMS or 2Factor API Key below. You can also configure <code className="text-pink-400">FAST2SMS_API_KEY</code> in Vercel Environment Variables.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Fast2SMS API Key</label>
                                <input
                                  type="password"
                                  placeholder="Enter Fast2SMS API Key"
                                  value={panelSettings.fast2smsApiKey || ''}
                                  onChange={e => setPanelSettings({ ...panelSettings, fast2smsApiKey: e.target.value })}
                                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">2Factor API Key (Optional)</label>
                                <input
                                  type="password"
                                  placeholder="Enter 2Factor API Key"
                                  value={panelSettings.twoFactorApiKey || ''}
                                  onChange={e => setPanelSettings({ ...panelSettings, twoFactorApiKey: e.target.value })}
                                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleSaveSettings}
                                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save SMS Gateway Keys</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {setupStep === 'mobile' && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300 rounded-xl flex items-start space-x-2.5 leading-relaxed">
                          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>Link your BharatPe merchant account securely. Enter your 10-digit mobile number to receive a verification OTP via phone SMS.</span>
                        </div>

                        <div className="max-w-md">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Registered Mobile (10-Digit)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-3 text-xs font-bold font-mono text-gray-500">+91</span>
                            <input
                              type="text"
                              maxLength={10}
                              placeholder="8795005604"
                              value={bharatpePhone}
                              onChange={e => setBharatpePhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center pt-2">
                          <button
                            type="button"
                            onClick={handleRequestBharatpeOtp}
                            disabled={bpLoading || bharatpePhone.length < 10}
                            className="px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center space-x-2 shadow-lg cursor-pointer"
                          >
                            {bpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Send Verification OTP to Phone</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowSmsGatewayConfig(!showSmsGatewayConfig)}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-pink-400" />
                            <span>SMS Gateway Config</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSetupStep('intro')}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5 cursor-pointer"
                          >
                            Back
                          </button>
                        </div>

                        {/* Inline SMS Gateway Config when on mobile step */}
                        {showSmsGatewayConfig && (
                          <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3 mt-3 animate-in fade-in duration-200">
                            <span className="text-xs font-bold text-white flex items-center space-x-2">
                              <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                              <span>SMS Gateway API Keys</span>
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Fast2SMS API Key</label>
                                <input
                                  type="password"
                                  placeholder="Enter Fast2SMS API Key"
                                  value={panelSettings.fast2smsApiKey || ''}
                                  onChange={e => setPanelSettings({ ...panelSettings, fast2smsApiKey: e.target.value })}
                                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">2Factor API Key (Optional)</label>
                                <input
                                  type="password"
                                  placeholder="Enter 2Factor API Key"
                                  value={panelSettings.twoFactorApiKey || ''}
                                  onChange={e => setPanelSettings({ ...panelSettings, twoFactorApiKey: e.target.value })}
                                  className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleSaveSettings}
                                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Keys</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {setupStep === 'otp' && (
                      <div className="space-y-5 max-w-xl animate-in fade-in duration-300">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs rounded-2xl space-y-1.5 leading-relaxed">
                          <div className="font-bold text-emerald-400 flex items-center space-x-2 text-sm">
                            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>OTP Dispatched via SMS to +91 {bharatpePhone}</span>
                          </div>
                          <p className="text-gray-300 text-xs">
                            A 6-digit verification code has been sent directly to your phone via SMS. Please check your SMS inbox on your mobile phone and enter the code below.
                          </p>
                          <p className="text-amber-400/90 text-[11px]">
                            ⚠️ Note: Arbitrary or random 6-digit codes will be rejected. Only the code sent to your phone can activate the BharatPe merchant QR.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Enter 6-Digit Verification OTP (From Phone SMS)</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="______"
                              value={bharatpeOTP}
                              onChange={e => setBharatpeOTP(e.target.value.replace(/\D/g, ''))}
                              className="w-full max-w-[220px] text-center tracking-[0.5em] px-4 py-3.5 rounded-xl bg-[#0b101f] border border-white/20 text-white text-xl font-black focus:outline-none focus:border-pink-500 transition-colors font-mono placeholder:text-gray-600"
                            />
                            <p className="text-[11px] text-gray-400 mt-1.5">
                              Enter the exact 6-digit code received on your mobile device.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Merchant Display Name (Optional)</label>
                            <input
                              type="text"
                              placeholder="My youthsmm QR"
                              value={bharatpeMerchantName}
                              onChange={e => setBharatpeMerchantName(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Custom VPA / UPI ID (Optional)</label>
                            <input
                              type="text"
                              placeholder="BHARATPE2H0D0Q1Y4T29351@unitype"
                              value={bharatpeVpa}
                              onChange={e => setBharatpeVpa(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleVerifyBharatpeOtp}
                            disabled={bpLoading || bharatpeOTP.length < 6}
                            className="px-6 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center space-x-2 shadow-lg cursor-pointer"
                          >
                            {bpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Verify & Link QR Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRequestBharatpeOtp}
                            disabled={bpLoading}
                            className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/10 flex items-center space-x-1.5 cursor-pointer"
                            title="Resend SMS to phone"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${bpLoading ? 'animate-spin' : ''}`} />
                            <span>Resend SMS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOtpRequested(false); setBharatpeOTP(''); setSetupStep('mobile'); }}
                            className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5 cursor-pointer"
                          >
                            Change Mobile / Back
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Box 4: Advanced Operational Tuning */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Advanced Operations Tuning</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Regulate payment flow displays and offset database identity pipelines.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Order ID Skip Offset</label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={panelSettings.orderIdSkip || '0'}
                      onChange={e => setPanelSettings({ ...panelSettings, orderIdSkip: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Offsets user-facing order IDs globally. e.g. setting to 10000 makes Order #5 display as #10005, making the system look more established.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Add Funds Instructions Content</label>
                    <textarea
                      rows={4}
                      placeholder="To pay manually:&#10;1. Scan the UPI QR Code above&#10;2. Send the desired INR amount&#10;3. Submit a manual support ticket with the transaction reference ID."
                      value={panelSettings.addFundPageContent || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, addFundPageContent: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      Configure custom guidelines, bank details, QR details, or manual transfer rules. Displays in a prominent alert box inside the user's "Deposit Wallet" page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box: Google Authentication (OAuth) Configuration */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-display">Google Authentication (OAuth) Settings</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Configure status, dynamic administrator email mapping, and Google Sign-In credentials.</p>
                  </div>
                </div>

                {/* Instruction Banner with Copyable Callback URL */}
                <div className="p-4 bg-red-500/5 border border-red-500/10 text-xs text-red-300 rounded-xl space-y-3 leading-relaxed">
                  <span className="font-bold text-red-200 block">Authorized Redirect URIs (Required for Google Cloud Console)</span>
                  <div className="text-[11px] text-gray-400">
                    Copy and paste the exact URL below into the <strong>Authorized redirect URIs</strong> section of your OAuth 2.0 Client in Google Cloud Console:
                  </div>
                  
                  {/* Production Domain Callback */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 font-semibold">Production Callback (www.youthsmm.com):</div>
                    <div className="flex items-center justify-between gap-3 bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[11px] text-emerald-400">
                      <span className="break-all select-all">https://www.youthsmm.com/api/auth/google/callback</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://www.youthsmm.com/api/auth/google/callback');
                          showSuccess('Production Callback URL copied to clipboard!');
                        }}
                        className="flex-shrink-0 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-200 rounded transition-all text-[9px] uppercase font-bold cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Current Environment Callback */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] text-gray-400 font-semibold">Current Origin Callback ({typeof window !== 'undefined' ? window.location.host : 'current'}):</div>
                    <div className="flex items-center justify-between gap-3 bg-black/40 p-2.5 rounded border border-white/5 font-mono text-[10px] text-red-300">
                      <span className="break-all select-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/google/callback</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/auth/google/callback`);
                          showSuccess('Current Callback URL copied to clipboard!');
                        }}
                        className="flex-shrink-0 px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-all text-[9px] uppercase font-bold cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Google Login Status</label>
                    <select
                      value={panelSettings.googleLoginStatus || 'enabled'}
                      onChange={e => setPanelSettings({ ...panelSettings, googleLoginStatus: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                      <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed font-sans">
                      Toggle Google Sign-In button visibility on the login portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Primary Administrator Email Address</label>
                    <input
                      type="email"
                      placeholder="bhattg805@gmail.com"
                      value={panelSettings.adminEmail || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, adminEmail: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Matches the Gmail address of the owner. Grants administrator dashboard access to this email dynamically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Google OAuth Client ID</label>
                    <input
                      type="text"
                      placeholder="220010257054-pv05rshg..."
                      value={panelSettings.googleClientId || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, googleClientId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Optional override. Google Client ID from Google Cloud credentials console.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Google OAuth Client Secret</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={panelSettings.googleClientSecret || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, googleClientSecret: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Optional override. Google Client Secret key from Google Cloud credentials console.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 5: Code Injection Matrices */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dynamic Header & Footer Code Injections</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Inject dynamic script protocols, analytics trackers, CSS overrides, or widgets safely.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Additional Header Code (Injected into &lt;head&gt; Globally)</label>
                    <textarea
                      rows={4}
                      placeholder="<!-- Google Tag Manager / Analytics / Custom Global CSS -->&#10;<script>console.log('Global script loaded');</script>"
                      value={panelSettings.additionalHeaderCode || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, additionalHeaderCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Additional Footer Code (Injected into &lt;body&gt; Globally)</label>
                    <textarea
                      rows={4}
                      placeholder="<!-- Custom Chat Widget or analytics timers -->"
                      value={panelSettings.additionalFooterCode || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, additionalFooterCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Additional Header Code - After Login pages (Only on Authenticated Views)</label>
                    <textarea
                      rows={4}
                      placeholder="<!-- Injected exclusively for registered panels -->"
                      value={panelSettings.additionalHeaderCodeAfterLogin || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, additionalHeaderCodeAfterLogin: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed"
                    />
                  </div>
                </div>
              </div>


            </div>

            {/* Bottom Sticky Save Action Bar */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 flex justify-end items-center bg-gray-950/20 backdrop-blur-md">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-8 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold font-mono text-white tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Persist Customizations</span>
              </button>
            </div>
          </div>
        )}
        {/* Order Details & Provider Telemetry Modal (Requirement 3: View Details) */}
        {detailsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Order Provider Details & Telemetry</span>
                      {selectedOrderDetails?.order && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          #{selectedOrderDetails.order.displayId || selectedOrderDetails.order.id}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400">Upstream provider response, API order ID, and error diagnostics</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                {loadingOrderDetails ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3 text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
                    <span>Loading order and provider details...</span>
                  </div>
                ) : selectedOrderDetails ? (
                  <>
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Status</span>
                        <span className={`font-bold uppercase text-xs ${
                          selectedOrderDetails.order.status === 'completed' ? 'text-emerald-400' :
                          selectedOrderDetails.order.status === 'processing' ? 'text-blue-400' :
                          selectedOrderDetails.order.status === 'pending' ? 'text-amber-400' :
                          selectedOrderDetails.order.status === 'partial' ? 'text-purple-400' :
                          'text-rose-400'
                        }`}>
                          {selectedOrderDetails.order.status}
                        </span>
                      </div>

                      <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Provider</span>
                        <span className="font-bold text-white text-xs truncate block" title={selectedOrderDetails.provider?.name || selectedOrderDetails.dispatchDetail?.providerName || 'Manual'}>
                          {selectedOrderDetails.provider?.name || selectedOrderDetails.dispatchDetail?.providerName || 'Manual'}
                        </span>
                      </div>

                      <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Provider Service ID</span>
                        <span className="font-mono font-bold text-white text-xs">
                          {selectedOrderDetails.dispatchDetail?.providerServiceId || selectedOrderDetails.service?.providerServiceId || 'Not Mapped'}
                        </span>
                      </div>

                      <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wide">Provider Order ID</span>
                        <span className="font-mono font-bold text-xs truncate block text-emerald-400" title={selectedOrderDetails.order.providerOrderId || 'None'}>
                          {selectedOrderDetails.order.providerOrderId || 'Not Dispatched'}
                        </span>
                      </div>
                    </div>

                    {/* Order Meta Info */}
                    <div className="bg-[#080d1a] p-3.5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Service:</span>
                        <span className="font-bold text-white text-right max-w-[320px] truncate">{selectedOrderDetails.order.serviceName}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Target Link:</span>
                        <a href={selectedOrderDetails.order.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono truncate max-w-[320px]">
                          {selectedOrderDetails.order.link}
                        </a>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Quantity</span>
                          <span className="font-mono font-bold text-white">{selectedOrderDetails.order.quantity}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Start Count</span>
                          <span className="font-mono font-bold text-white">{selectedOrderDetails.order.startCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Remains</span>
                          <span className="font-mono font-bold text-amber-400">{selectedOrderDetails.order.remains}</span>
                        </div>
                      </div>
                    </div>

                    {/* Provider Balance Check Info */}
                    {selectedOrderDetails.dispatchDetail?.balanceStatus && (
                      <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        selectedOrderDetails.dispatchDetail.balanceStatus === 'sufficient'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : selectedOrderDetails.dispatchDetail.balanceStatus === 'insufficient'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">
                            Provider Balance Check: {selectedOrderDetails.dispatchDetail.balanceStatus.toUpperCase()}
                          </span>
                        </div>
                        {selectedOrderDetails.dispatchDetail.balanceChecked !== null && selectedOrderDetails.dispatchDetail.balanceChecked !== undefined && (
                          <span className="font-mono font-bold">₹{Number(selectedOrderDetails.dispatchDetail.balanceChecked).toFixed(2)}</span>
                        )}
                      </div>
                    )}

                    {/* Last Error (if any) */}
                    {selectedOrderDetails.dispatchDetail?.lastError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-1">
                        <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Last Upstream Provider Note / Error:</span>
                        </span>
                        <div className="font-mono text-[11px] text-rose-200 break-words">
                          {selectedOrderDetails.dispatchDetail.lastError}
                        </div>
                      </div>
                    )}

                    {/* Raw Provider Response */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upstream Provider API Response Payload:</span>
                      </span>
                      <pre className="p-3 bg-black/60 rounded-xl border border-white/10 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 select-all">
                        {JSON.stringify(
                          selectedOrderDetails.dispatchDetail?.providerResponse ?? {
                            order_id: selectedOrderDetails.order.providerOrderId || null,
                            note: 'Direct provider response not cached or order dispatched previously.'
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>

                    {/* Dispatch Timestamps */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-2 border-t border-white/5">
                      <div>
                        <span>Dispatched: </span>
                        <span className="text-gray-200">
                          {selectedOrderDetails.dispatchDetail?.dispatchedAt
                            ? new Date(selectedOrderDetails.dispatchDetail.dispatchedAt).toLocaleString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span>Last Synced: </span>
                        <span className="text-gray-200">
                          {selectedOrderDetails.dispatchDetail?.lastSyncedAt
                            ? new Date(selectedOrderDetails.dispatchDetail.lastSyncedAt).toLocaleString()
                            : 'Pending next cron tick'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-gray-400">Order details not found.</div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedOrderDetails?.order && (
                    <>
                      {/* Push / Retry Button inside modal */}
                      <button
                        type="button"
                        onClick={() => handleDispatchOrderToProvider(selectedOrderDetails.order.id)}
                        disabled={dispatchingOrderId === selectedOrderDetails.order.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className={`w-3 h-3 ${dispatchingOrderId === selectedOrderDetails.order.id ? 'animate-pulse' : ''}`} />
                        <span>{dispatchingOrderId === selectedOrderDetails.order.id ? 'Pushing...' : 'Push / Retry Order'}</span>
                      </button>

                      {/* Sync Button inside modal */}
                      {selectedOrderDetails.order.providerOrderId &&
                        !selectedOrderDetails.order.providerOrderId.startsWith('FAILED:') &&
                        !selectedOrderDetails.order.providerOrderId.startsWith('QUEUED:') && (
                          <button
                            type="button"
                            onClick={() => handleSyncSingleOrder(selectedOrderDetails.order.id)}
                            disabled={syncingSingleOrderId === selectedOrderDetails.order.id}
                            className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${syncingSingleOrderId === selectedOrderDetails.order.id ? 'animate-spin' : ''}`} />
                            <span>{syncingSingleOrderId === selectedOrderDetails.order.id ? 'Syncing...' : 'Sync Provider Status'}</span>
                          </button>
                        )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;

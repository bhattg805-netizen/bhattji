import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BookOpen,
  FileCode,
  Layers,
  Share2,
  Ticket,
  FileText,
  Shield,
  Send,
  Copy,
  Check,
  Headphones,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Zap,
  Globe,
  DollarSign,
  Info,
  TrendingUp,
  Users,
  Award,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface LoginModalsProps {
  showAboutModal?: boolean;
  setShowAboutModal?: (show: boolean) => void;
  showBlogModal: boolean;
  setShowBlogModal: (show: boolean) => void;
  showApiModal: boolean;
  setShowApiModal: (show: boolean) => void;
  showChildPanelsModal: boolean;
  setShowChildPanelsModal: (show: boolean) => void;
  showAffiliatesModal: boolean;
  setShowAffiliatesModal: (show: boolean) => void;
  showTermsModal: boolean;
  setShowTermsModal: (show: boolean) => void;
  showPrivacyModal: boolean;
  setShowPrivacyModal: (show: boolean) => void;
  showContactModal: boolean;
  setShowContactModal: (show: boolean) => void;
  showSupportModal: boolean;
  setShowSupportModal: (show: boolean) => void;
  websiteName?: string;
  customTerms?: string;
  customPrivacy?: string;
  onSelectAuthMode: (mode: 'signin' | 'register') => void;
}

const BLOG_ARTICLES = [
  {
    id: 1,
    title: 'How to Maximize Organic Reach with SMM in 2026',
    date: 'August 2026',
    readTime: '4 min read',
    category: 'Strategy',
    excerpt:
      'Learn how combining high-quality social proof with consistent content scheduling accelerates engagement across Instagram Reels and YouTube Shorts.',
    content: `Building social proof early gives the algorithm the positive signals needed to push your content onto Explore and recommendation feeds. 

Key strategies:
1. Pacing & Gradual Volume: Spread views and interactions naturally across the first 24 hours of uploading.
2. High-Retention Delivery: Prioritize services with genuine retention time to signal audience watch-through.
3. Call-to-Action Optimization: Pair initial boosts with prompt comment responses to foster organic conversation.`,
  },
  {
    id: 2,
    title: 'YouTube Algorithm Essentials: Watch-Time vs Click-Through Rate',
    date: 'July 2026',
    readTime: '5 min read',
    category: 'YouTube',
    excerpt:
      'Understand how YouTube calculates viewer satisfaction and why balanced engagement metrics are essential for channel growth.',
    content: `YouTube balances CTR (Click-Through Rate) with AVD (Average View Duration) to determine audience satisfaction scores.

When boosting YouTube videos:
- Pair subscriber growth with high-retention video views.
- Ensure your video thumbnail accurately represents your content to maintain organic click-through stability.
- Utilize drip-feed features when scaling high-volume campaigns over several days.`,
  },
  {
    id: 3,
    title: 'How to Launch a Profitable Reseller Panel with YouthSMM Child Panels',
    date: 'June 2026',
    readTime: '6 min read',
    category: 'Reseller',
    excerpt:
      'A complete step-by-step roadmap to setting up your own domain, customizing prices, and automating orders with zero technical overhead.',
    content: `YouthSMM Child Panels provide a turnkey solution for entrepreneurs to start their own branded SMM panel.

What you get:
- Automated order routing directly through the YouthSMM core API.
- Live currency exchange and automated payment gateway support.
- Ability to set custom markups on thousands of active services.
- Turnkey deployment within 24 hours on your custom domain.`,
  },
];

export const LoginModals: React.FC<LoginModalsProps> = ({
  showAboutModal = false,
  setShowAboutModal = (_s: boolean) => {},
  showBlogModal,
  setShowBlogModal,
  showApiModal,
  setShowApiModal,
  showChildPanelsModal,
  setShowChildPanelsModal,
  showAffiliatesModal,
  setShowAffiliatesModal,
  showTermsModal,
  setShowTermsModal,
  showPrivacyModal,
  setShowPrivacyModal,
  showContactModal,
  setShowContactModal,
  showSupportModal,
  setShowSupportModal,
  websiteName = 'YouthSMM',
  customTerms,
  customPrivacy,
  onSelectAuthMode,
}) => {
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);
  const [dynamicBlogs, setDynamicBlogs] = useState<any[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [apiCodeTab, setApiCodeTab] = useState<'curl' | 'nodejs' | 'python'>('curl');

  // Load published blogs from API when blog modal opens
  useEffect(() => {
    if (showBlogModal) {
      setLoadingBlogs(true);
      fetch('/api/blogs')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map((b: any) => ({
              id: `db-${b.id}`,
              title: b.title,
              category: 'Tutorial & Guide',
              readTime: '3 min read',
              date: new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
              excerpt: b.content.slice(0, 160) + (b.content.length > 160 ? '...' : ''),
              content: b.content,
              coverImage: b.coverImage,
            }));
            setDynamicBlogs(formatted);
          } else {
            setDynamicBlogs([]);
          }
        })
        .catch(err => {
          console.warn('Failed to load published blogs:', err);
        })
        .finally(() => setLoadingBlogs(false));
    }
  }, [showBlogModal]);

  const allArticles = dynamicBlogs.length > 0 ? [...dynamicBlogs, ...BLOG_ARTICLES] : BLOG_ARTICLES;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://youthsmm.com';
  const apiEndpoint = `${originUrl}/api/v2`;

  const copyToClipboard = (text: string, isSnippet = false) => {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } else {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    }
  };

  const codeSnippets = {
    curl: `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "YOUR_API_KEY",
    "action": "add",
    "service": 101,
    "link": "https://instagram.com/p/xxxxxx",
    "quantity": 1000
  }'`,
    nodejs: `const axios = require('axios');

async function placeOrder() {
  const response = await axios.post('${apiEndpoint}', {
    key: 'YOUR_API_KEY',
    action: 'add',
    service: 101,
    link: 'https://instagram.com/p/xxxxxx',
    quantity: 1000
  });
  console.log(response.data);
}

placeOrder();`,
    python: `import requests

url = "${apiEndpoint}"
payload = {
    "key": "YOUR_API_KEY",
    "action": "add",
    "service": 101,
    "link": "https://instagram.com/p/xxxxxx",
    "quantity": 1000
}

response = requests.post(url, json=payload)
print(response.json())`,
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* BLOG MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBlogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowBlogModal(false);
                setSelectedBlog(null);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] text-left"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="px-5 sm:px-6 pt-3 pb-2 flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium border-b border-gray-100 dark:border-gray-800 bg-stone-50/60 dark:bg-stone-900/30">
                <button type="button" onClick={() => { setShowBlogModal(false); setSelectedBlog(null); }} className="hover:text-red-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Blog</span>
                {selectedBlog && (
                  <>
                    <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="text-red-600 font-bold truncate max-w-[200px]">{selectedBlog.title}</span>
                  </>
                )}
              </nav>

              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {selectedBlog ? selectedBlog.title : `${websiteName} Blog & Resources`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedBlog ? `${selectedBlog.date} · ${selectedBlog.readTime}` : 'Insights, marketing tutorials & platform tips'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (selectedBlog) {
                      setSelectedBlog(null);
                    } else {
                      setShowBlogModal(false);
                    }
                  }}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {selectedBlog ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setSelectedBlog(null)}
                      className="text-xs font-semibold text-red-600 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>&larr; Back to articles</span>
                    </button>
                    {selectedBlog.coverImage && (
                      <img 
                        src={selectedBlog.coverImage} 
                        alt={selectedBlog.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-48 object-cover rounded-2xl border border-gray-200 dark:border-gray-800" 
                      />
                    )}
                    <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs font-medium text-red-700 dark:text-red-300">
                      {selectedBlog.excerpt}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed space-y-3">
                      {selectedBlog.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loadingBlogs && (
                      <div className="text-center py-4 text-xs text-gray-400">Loading latest articles...</div>
                    )}
                    {allArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedBlog(article)}
                        className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-red-500/40 bg-gray-50/60 dark:bg-[#131b2e] hover:bg-white dark:hover:bg-[#18233c] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                          <span className="font-bold text-red-600 uppercase tracking-wider">{article.category}</span>
                          <span>{article.readTime}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>
                        <div className="mt-2.5 flex items-center text-xs font-bold text-red-600 space-x-1">
                          <span>Read full guide</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* API DOCUMENTATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showApiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApiModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] text-left"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="px-5 sm:px-6 pt-3 pb-2 flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium border-b border-gray-100 dark:border-gray-800 bg-stone-50/60 dark:bg-stone-900/30">
                <button type="button" onClick={() => setShowApiModal(false)} className="hover:text-red-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">API Documentation</span>
              </nav>

              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {websiteName} API v2 Documentation
                    </h3>
                    <p className="text-xs text-gray-500">RESTful API documentation for developers and resellers</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm">
                {/* Endpoint Bar */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    API Endpoint (POST)
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-900 text-white font-mono text-xs">
                    <span className="truncate pr-2">{apiEndpoint}</span>
                    <button
                      onClick={() => copyToClipboard(apiEndpoint)}
                      className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors flex items-center space-x-1 cursor-pointer flex-shrink-0"
                    >
                      {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* API Actions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
                    Available Actions
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800">
                      <span className="font-mono font-bold text-red-600">action: "services"</span>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Retrieves complete list of active services, IDs, rates, min and max amounts.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800">
                      <span className="font-mono font-bold text-red-600">action: "add"</span>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Submits a new order with service ID, target link, and quantity.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800">
                      <span className="font-mono font-bold text-red-600">action: "status"</span>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Checks progress status, start count, and remains for an order ID.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800">
                      <span className="font-mono font-bold text-red-600">action: "balance"</span>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Returns current account balance and active currency.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Code Example */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
                      Sample Code
                    </h4>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl text-xs font-semibold">
                      {(['curl', 'nodejs', 'python'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setApiCodeTab(tab)}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            apiCodeTab === tab ? 'bg-white dark:bg-[#0a0e1a] text-red-600 shadow-xs' : 'text-gray-500'
                          }`}
                        >
                          {tab === 'curl' ? 'cURL' : tab === 'nodejs' ? 'Node.js' : 'Python'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-gray-900 text-gray-200 p-4 font-mono text-xs overflow-x-auto">
                    <pre>{codeSnippets[apiCodeTab]}</pre>
                    <button
                      onClick={() => copyToClipboard(codeSnippets[apiCodeTab], true)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copiedSnippet ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0e1a] flex justify-between items-center text-xs">
                <span className="text-gray-500">Sign in to generate your unique API key</span>
                <button
                  onClick={() => {
                    setShowApiModal(false);
                    onSelectAuthMode('signin');
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all cursor-pointer shadow-sm"
                >
                  Sign In to Access Key
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CHILD PANELS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showChildPanelsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChildPanelsModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 text-left space-y-5"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium">
                <button type="button" onClick={() => setShowChildPanelsModal(false)} className="hover:text-teal-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Child Panels</span>
              </nav>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Reseller Child Panels</h3>
                    <p className="text-xs text-gray-500">Launch your own branded SMM panel in minutes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChildPanelsModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                    <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">Custom Domain Setup</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Connect your domain by pointing nameservers. Full SSL certificates included automatically.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                    <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">100% Automated Sync</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Orders placed on your panel route directly to YouthSMM with instant status webhooks.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                    <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">Custom Pricing & Profits</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Set custom profit margins and prices for individual services and categories.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                    <span className="font-bold text-teal-700 dark:text-teal-300 block mb-1">Payment Gateways Ready</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Accept UPI, credit cards, and cryptocurrency payments from your customers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => {
                    setShowChildPanelsModal(false);
                    onSelectAuthMode('register');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer text-center"
                >
                  Create Account to Order Panel
                </button>
                <button
                  onClick={() => setShowChildPanelsModal(false)}
                  className="px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* AFFILIATES MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAffiliatesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAffiliatesModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 text-left space-y-5"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium">
                <button type="button" onClick={() => setShowAffiliatesModal(false)} className="hover:text-emerald-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Affiliate Program</span>
              </nav>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Affiliate Partner Program</h3>
                    <p className="text-xs text-gray-500">Earn recurring revenue by referring friends and clients</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAffiliatesModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center space-x-4">
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-display">5% - 10%</div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Lifetime Commission</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Earn on every single deposit made by referred customers forever.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800 text-center">
                    <div className="font-bold text-gray-900 dark:text-white text-xs">1. Share Link</div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Post your referral link anywhere</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800 text-center">
                    <div className="font-bold text-gray-900 dark:text-white text-xs">2. Users Deposit</div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Users add funds to order services</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800 text-center">
                    <div className="font-bold text-gray-900 dark:text-white text-xs">3. Get Paid</div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Use balance or request payouts</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => {
                    setShowAffiliatesModal(false);
                    onSelectAuthMode('register');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer text-center"
                >
                  Join Affiliate Program
                </button>
                <button
                  onClick={() => setShowAffiliatesModal(false)}
                  className="px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* TERMS OF SERVICE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] text-left"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="px-5 sm:px-6 pt-3 pb-2 flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium border-b border-gray-100 dark:border-gray-800 bg-stone-50/60 dark:bg-stone-900/30">
                <button type="button" onClick={() => setShowTermsModal(false)} className="hover:text-red-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Terms of Service</span>
              </nav>

              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      Terms of Service
                    </h3>
                    <p className="text-xs text-gray-500">Platform usage agreement and service guidelines</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {customTerms ? (
                  <div className="whitespace-pre-wrap">{customTerms}</div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Acceptance of Terms</h4>
                      <p>
                        By placing an order or creating an account with {websiteName}, you automatically accept all terms of service listed below. We reserve the right to alter these terms without prior notice.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Service Usage & Delivery</h4>
                      <p>
                        {websiteName} will only be used to promote your social media accounts and help enhance your online presence. Rates are subject to change at any time without notice. Delivery start times and speeds are estimates and not strict guarantees.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Payment & Refund Policy</h4>
                      <p>
                        Deposits made to your account balance are non-refundable once credited. You agree that once you complete a payment, you will not file a dispute or chargeback against us. If an order cannot be completed, the remaining balance for that order will be refunded to your {websiteName} account balance.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">4. Refill & Drop Policy</h4>
                      <p>
                        Services marked with a Refill button or refill guarantee qualify for manual or automated refills during the stated warranty period if drops occur. Private accounts or changed usernames void refill eligibility.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0e1a] flex justify-end">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PRIVACY POLICY MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacyModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] text-left"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="px-5 sm:px-6 pt-3 pb-2 flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium border-b border-gray-100 dark:border-gray-800 bg-stone-50/60 dark:bg-stone-900/30">
                <button type="button" onClick={() => setShowPrivacyModal(false)} className="hover:text-red-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Privacy Policy</span>
              </nav>

              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Privacy Policy</h3>
                    <p className="text-xs text-gray-500">How we handle and protect your data</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {customPrivacy ? (
                  <div className="whitespace-pre-wrap">{customPrivacy}</div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Information We Collect</h4>
                      <p>
                        We collect only necessary information required to manage your account and process orders, including email addresses, usernames, transaction identifiers, and target URLs. We never collect or ask for passwords to your social media accounts.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Data Security & Storage</h4>
                      <p>
                        All user data is encrypted in transit and stored in protected databases. Access is strictly limited to authorized personnel to maintain account integrity and prevent unauthorized disclosure.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Third-Party Sharing</h4>
                      <p>
                        We do not sell, trade, or transfer your personally identifiable information to outside parties. Payment verification is conducted securely through authorized financial gateway providers.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0e1a] flex justify-end">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SUPPORT & TICKETS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupportModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 text-left space-y-4"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium">
                <button type="button" onClick={() => setShowSupportModal(false)} className="hover:text-purple-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Support</span>
              </nav>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Customer Support</h3>
                    <p className="text-xs text-gray-500">24/7 dedicated assistance for all inquiries</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Our support staff is active around the clock. For registered accounts, tickets can be submitted directly from the user dashboard with priority tracking.
              </p>

              <div className="space-y-2">
                <a
                  href="https://t.me/securesmmtursted"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30 flex items-center justify-between hover:bg-sky-100/70 transition-colors text-xs font-semibold text-sky-700 dark:text-sky-300"
                >
                  <div className="flex items-center space-x-2.5">
                    <Send className="w-4 h-4 text-sky-500" />
                    <span>Instant Telegram Support</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-center space-x-2.5">
                    <Headphones className="w-4 h-4 text-purple-500" />
                    <span>Support Ticket Turnaround</span>
                  </div>
                  <span className="font-bold text-emerald-600">&lt; 15 mins</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setShowSupportModal(false);
                    onSelectAuthMode('signin');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer text-center"
                >
                  Sign In to Open Ticket
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CONTACT US MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContactModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 text-left space-y-4"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium">
                <button type="button" onClick={() => setShowContactModal(false)} className="hover:text-red-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">Contact Us</span>
              </nav>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Contact Us</h3>
                    <p className="text-xs text-gray-500">Reach our global assistance team anytime</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                <a
                  href="https://t.me/securesmmtursted"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30 flex items-center justify-between hover:bg-sky-100/70 transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Send className="w-4 h-4 text-sky-500" />
                    <div>
                      <div className="font-bold text-sky-700 dark:text-sky-300">Telegram Channel & Chat</div>
                      <div className="text-[11px] text-gray-500">@securesmmtursted</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                </a>

                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#131b2e] border border-gray-100 dark:border-gray-800 flex items-center space-x-2.5">
                  <Globe className="w-4 h-4 text-red-500" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Operating Hours</div>
                    <div className="text-[11px] text-gray-500">24 Hours / 7 Days a Week / 365 Days</div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. ABOUT US MODAL (WHAT WE DO & PLATFORM CAPABILITIES) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAboutModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-white dark:bg-[#0e1424] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh] text-left"
            >
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="px-5 sm:px-6 pt-3 pb-2 flex items-center space-x-1.5 text-[11px] text-stone-500 font-medium border-b border-gray-100 dark:border-gray-800 bg-stone-50/60 dark:bg-stone-900/30">
                <button type="button" onClick={() => setShowAboutModal(false)} className="hover:text-red-600 transition-colors cursor-pointer font-semibold">Home</button>
                <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="text-stone-800 dark:text-stone-200 font-bold truncate">About Us</span>
              </nav>

              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-red-600/5 via-transparent to-transparent">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center space-x-2">
                      <span>About {websiteName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
                        Official Overview
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Affordable, automated & reliable Social Media Marketing Services
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scroll Area */}
              <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                
                {/* Intro Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-[#131b2e] border border-gray-200/80 dark:border-gray-800/80 space-y-2">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center space-x-2">
                    <Info className="w-4 h-4 text-red-600 shrink-0" />
                    <span>What is {websiteName}?</span>
                  </h4>
                  <p>
                    <strong>{websiteName}</strong> is India's leading and most affordable automated Social Media Marketing (SMM) platform. We empower content creators, influencers, digital marketers, small businesses, and agencies to accelerate their digital growth and establish strong social proof across all major social networks.
                  </p>
                </div>

                {/* What We Do (Kya Karta Hai) */}
                <div>
                  <h4 className="font-black text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">
                    What We Do & Key Capabilities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Instant Automated Delivery</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Orders are routed and executed automatically 24/7 through high-speed server APIs with zero manual delay.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span>Wholesale & Cheap Pricing</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Direct-source wholesale pricing starting from just ₹1 per 1,000 views, likes, or interactions.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        <span>100% Safe & Password-Free</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        We never ask for account passwords. All promotions require only public links/handles, complying with safety norms.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white">
                        <Layers className="w-4 h-4 text-purple-500" />
                        <span>2,500+ Active Services</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Complete solutions for Instagram, YouTube, Facebook, Telegram, TikTok, Twitter/X, and more.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white">
                        <FileCode className="w-4 h-4 text-teal-500" />
                        <span>API & Reseller Panels</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Developers can connect via REST API v2, and entrepreneurs can launch their own branded Child Panels.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-xs space-y-1.5">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white">
                        <Headphones className="w-4 h-4 text-rose-500" />
                        <span>24/7 Dedicated Support</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Round-the-clock helpdesk via ticket system and direct Telegram channel for instant assistance.
                      </p>
                    </div>

                  </div>
                </div>

                {/* How It Works Section */}
                <div className="p-4 sm:p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 space-y-3">
                  <h4 className="font-bold text-xs text-red-600 dark:text-red-400 uppercase tracking-wider">
                    How To Get Started in 3 Easy Steps:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center mx-auto sm:mx-0">
                        1
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white text-xs">Create Account</div>
                      <p className="text-[10px] text-gray-500">Sign up for free in 10 seconds with just an email.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center mx-auto sm:mx-0">
                        2
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white text-xs">Add Funds & Choose</div>
                      <p className="text-[10px] text-gray-500">Instant UPI/QR deposits and choose from 2,500+ services.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center mx-auto sm:mx-0">
                        3
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white text-xs">Watch Growth</div>
                      <p className="text-[10px] text-gray-500">Orders deliver automatically with real-time status tracking.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer CTA */}
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-[#131b2e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-[11px] text-gray-500 text-center sm:text-left">
                  Join over 10,000+ satisfied creators & digital agencies.
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setShowAboutModal(false);
                      onSelectAuthMode('register');
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowAboutModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoginModals;

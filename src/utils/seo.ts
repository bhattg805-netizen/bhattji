// Centralized SEO Metadata Engine for YouthSMM
// Ensures clean, duplicate-free, and high-impact SEO metadata for public and private routes.

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
  ogType?: string;
  image?: string;
}

export const CANONICAL_SITE_URL = 'https://www.youthsmm.com';
export const DEFAULT_OG_IMAGE = 'https://www.youthsmm.com/favicon-512x512.png';

export const PRIMARY_SEO: SeoConfig = {
  title: 'YouthSMM – Best & Cheapest SMM Panel | Instagram, YouTube & Facebook Growth',
  description:
    "YouthSMM is India's #1 cheapest & most trusted SMM panel. Buy real Instagram followers, YouTube views, Facebook likes & Telegram members with instant 24/7 delivery.",
  canonicalPath: '/',
  noIndex: false,
  ogType: 'website',
  image: DEFAULT_OG_IMAGE,
};

export const PAGE_SEO_REGISTRY: Record<string, SeoConfig> = {
  home: {
    title: 'YouthSMM – Best & Cheapest SMM Panel in world | Instagram, YouTube & Facebook Growth',
    description:
      "YouthSMM is India's #1 cheapest & most trusted SMM panel. Buy real Instagram followers, YouTube views, Facebook likes & Telegram members with instant 24/7 delivery.",
    canonicalPath: '/',
    noIndex: false,
    ogType: 'website',
    image: DEFAULT_OG_IMAGE,
  },
  services: {
    title: 'All SMM Services & Reseller Rates | YouthSMM',
    description:
      'Browse 2,400+ cheapest SMM reseller services for Instagram followers, YouTube watchtime, Facebook likes & Telegram members with instant delivery.',
    canonicalPath: '/services',
    noIndex: false,
  },
  about: {
    title: 'About YouthSMM – #1 Global SMM Reseller Provider',
    description:
      'Learn about YouthSMM, our automated high-speed API infrastructure, reseller capabilities, and why over 10,000+ businesses and agencies trust us.',
    canonicalPath: '/about',
    noIndex: false,
  },
  login: {
    title: 'Sign In – Access Your Dashboard & Orders | YouthSMM',
    description:
      'Log in to your YouthSMM account to manage social media marketing orders, track live provider delivery, and add funds with zero fees.',
    canonicalPath: '/login',
    noIndex: false,
  },
  register: {
    title: 'Create Free Account – Start Reselling SMM Services | YouthSMM',
    description:
      'Sign up for YouthSMM in 30 seconds. Get immediate access to wholesale reseller rates for Instagram, YouTube, Telegram, and Facebook services.',
    canonicalPath: '/register',
    noIndex: false,
  },
  'api-docs': {
    title: 'SMM API Documentation & Reseller Integration | YouthSMM',
    description:
      'Connect your website or reseller panel directly to YouthSMM using our ultra-fast REST API. Automate order placement, status tracking, and balance sync.',
    canonicalPath: '/api-docs',
    noIndex: false,
  },
  faq: {
    title: 'FAQ & Help Center – SMM Orders & UPI Payments | YouthSMM',
    description:
      'Get instant answers about YouthSMM order speeds, automated refill guarantees, BharatPe UPI payment verification, and reseller child panels.',
    canonicalPath: '/faq',
    noIndex: false,
  },
  blog: {
    title: 'Social Media Growth Blog & Algorithm Guides 2026 | YouthSMM',
    description:
      'Read actionable growth strategies, algorithmic breakdown for Instagram Reels, YouTube watch hours, and tips to scale your social presence.',
    canonicalPath: '/blog',
    noIndex: false,
  },
  contact: {
    title: 'Contact Us & 24/7 Customer Support | YouthSMM',
    description:
      'Contact YouthSMM 24/7 via WhatsApp (+91-8795005604), Telegram (@securesmmtursted), or ticket system for instant assistance.',
    canonicalPath: '/contact',
    noIndex: false,
  },
  'child-panels': {
    title: 'Start Your Own SMM Reseller Business – Child Panels | YouthSMM',
    description:
      'Launch your fully branded social media marketing panel in minutes. Connect directly to YouthSMM with automatic service syncing and easy payment gateways.',
    canonicalPath: '/child-panels',
    noIndex: false,
  },
  affiliates: {
    title: 'Affiliate Partner Program – Earn Lifetime Commission | YouthSMM',
    description:
      'Earn recurring lifetime commissions by inviting creators, agencies, and businesses to YouthSMM. Instant payouts and real-time affiliate tracking.',
    canonicalPath: '/affiliates',
    noIndex: false,
  },
  terms: {
    title: 'Terms of Service – SMM Usage Guidelines & Policies | YouthSMM',
    description:
      'Review the official terms of service, acceptable use guidelines, refund terms, and customer rights for using YouthSMM marketing solutions.',
    canonicalPath: '/terms',
    noIndex: false,
  },
  privacy: {
    title: 'Privacy Policy – Data Protection & Security | YouthSMM',
    description:
      'Read how YouthSMM securely manages, protects, and encrypts your private data. Transparent data safety standards and zero sharing with third parties.',
    canonicalPath: '/privacy',
    noIndex: false,
  },

  // Auth alias
  auth: {
    title: 'Sign In & Register | YouthSMM',
    description:
      'Log in or create a new account on YouthSMM to access wholesale social media reseller services.',
    canonicalPath: '/login',
    noIndex: false,
  },

  // Private states: strictly blocked from search engines
  dashboard: {
    title: 'Dashboard – My Account | YouthSMM',
    description: 'Manage your social media orders, account balance, and active tickets.',
    canonicalPath: '/',
    noIndex: true,
  },
  admin: {
    title: 'Admin Panel – Management Workspace | YouthSMM',
    description: 'YouthSMM administrative dashboard and system management.',
    canonicalPath: '/',
    noIndex: true,
  },
};

/**
 * Generates Schema.org BreadcrumbList JSON-LD object for any page
 */
export function generateBreadcrumbSchema(pageName: string, pagePath: string) {
  const cleanPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${CANONICAL_SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageName,
        item: `${CANONICAL_SITE_URL}${cleanPath}`,
      },
    ],
  };
}

/**
 * Updates DOM metadata cleanly, eliminating duplicates and enforcing SEO standards.
 */
export function updateSeoMetadata(config: Partial<SeoConfig> = {}): void {
  if (typeof document === 'undefined') return;

  const title = config.title || PRIMARY_SEO.title;
  const description = config.description || PRIMARY_SEO.description;
  const canonicalPath = config.canonicalPath !== undefined ? config.canonicalPath : PRIMARY_SEO.canonicalPath;
  const noIndex = Boolean(config.noIndex);
  const ogType = config.ogType || 'website';
  const image = config.image || DEFAULT_OG_IMAGE;

  // 1. Title
  document.title = title;

  // 2. Meta Description (single source of truth)
  let descMeta = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.name = 'description';
    document.head.appendChild(descMeta);
  }
  descMeta.content = description;

  // 4. Robots Tag (index, follow vs noindex, nofollow)
  let robotsMeta = document.querySelector("meta[name='robots']") as HTMLMetaElement | null;
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    document.head.appendChild(robotsMeta);
  }
  robotsMeta.content = noIndex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  // 5. Canonical Link
  const fullCanonicalUrl = canonicalPath
    ? `${CANONICAL_SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
    : `${CANONICAL_SITE_URL}/`;

  let canonicalLink = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = fullCanonicalUrl;

  // 6. Open Graph Tags
  const setMetaProperty = (prop: string, val: string) => {
    let el = document.querySelector(`meta[property='${prop}']`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.content = val;
  };

  setMetaProperty('og:site_name', 'YouthSMM');
  setMetaProperty('og:title', title);
  setMetaProperty('og:description', description);
  setMetaProperty('og:url', fullCanonicalUrl);
  setMetaProperty('og:type', ogType);
  setMetaProperty('og:image', image);
  setMetaProperty('og:locale', 'en_US');

  // 7. Twitter / X Card Tags
  const setMetaName = (name: string, val: string) => {
    let el = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = val;
  };

  setMetaName('twitter:card', 'summary_large_image');
  setMetaName('twitter:title', title);
  setMetaName('twitter:description', description);
  setMetaName('twitter:image', image);
}

/**
 * Injects or updates dynamic JSON-LD structured data for fast search indexing.
 */
export function updateStructuredData(schemaData: object | null, scriptId = 'youthsmm-dynamic-ldjson'): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!schemaData) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaData);
}

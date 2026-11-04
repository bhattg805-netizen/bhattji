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
  title: 'YouthSMM – Cheapest SMM Panel | Instagram, Facebook & Telegram Growth',
  description:
    'YouthSMM is a reliable and affordable SMM panel for Instagram, Facebook and Telegram. Buy followers, likes, views, members and other social media services at affordable prices with fast delivery.',
  canonicalPath: '/',
  noIndex: false,
  ogType: 'website',
  image: DEFAULT_OG_IMAGE,
};

export const PAGE_SEO_REGISTRY: Record<string, SeoConfig> = {
  home: PRIMARY_SEO,
  services: {
    title: 'All SMM Services & Pricing – Instagram, Facebook & Telegram | YouthSMM',
    description:
      'Explore affordable social media marketing services with instant delivery. Buy real Instagram followers, Facebook likes, and Telegram members on YouthSMM.',
    canonicalPath: '/services',
    noIndex: false,
  },
  blog: {
    title: 'Social Media Marketing Blog & Growth Guides | YouthSMM',
    description:
      'Read proven social media growth strategies, algorithm insights, and marketing tips for Instagram, YouTube, Telegram, and Facebook on YouthSMM.',
    canonicalPath: '/blog',
    noIndex: false,
  },
  faq: {
    title: 'Frequently Asked Questions & Help Center | YouthSMM',
    description:
      'Find answers to common questions regarding orders, payments, automated delivery, refill policies, and child panels on YouthSMM.',
    canonicalPath: '/faq',
    noIndex: false,
  },
  'api-docs': {
    title: 'SMM Reseller API Documentation & Integration | YouthSMM',
    description:
      'Connect your reseller website or panel to YouthSMM using our high-speed REST API. Automate order placement, refills, and balance checks.',
    canonicalPath: '/api-docs',
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
  about: {
    title: 'About YouthSMM – Reliable Global Social Media Partner',
    description:
      'Learn about YouthSMM, our mission, 24/7 automated infrastructure, and why thousands of creators and agencies trust us for social media growth.',
    canonicalPath: '/about',
    noIndex: false,
  },
  contact: {
    title: 'Contact & 24/7 Customer Support | YouthSMM',
    description:
      'Get 24/7 assistance from the YouthSMM support team. Contact us via live chat, WhatsApp, Telegram, or ticket system for instant help.',
    canonicalPath: '/contact',
    noIndex: false,
  },
  terms: {
    title: 'Terms of Service – Usage Guidelines & Policies | YouthSMM',
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
  auth: {
    title: 'Sign In & Register | YouthSMM',
    description: 'Log in or create a new account on YouthSMM.',
    canonicalPath: '/',
    noIndex: true,
  },
};

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

  // 2. Remove obsolete or stuffed meta keywords if any exist
  const keywordsTag = document.querySelector("meta[name='keywords']");
  if (keywordsTag) {
    keywordsTag.remove();
  }

  // 3. Meta Description (single source of truth)
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

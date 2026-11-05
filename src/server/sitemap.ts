import { Request, Response } from 'express';
import { db } from '../db/index';
import { blogs, settings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

// Static public pages that should always be indexed for SEO and Google Sitelinks
const STATIC_PUBLIC_PAGES = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/services', changefreq: 'daily', priority: '0.95' },
  { path: '/about', changefreq: 'weekly', priority: '0.85' },
  { path: '/api-docs', changefreq: 'weekly', priority: '0.85' },
  { path: '/faq', changefreq: 'weekly', priority: '0.85' },
  { path: '/blog', changefreq: 'daily', priority: '0.85' },
  { path: '/contact', changefreq: 'weekly', priority: '0.80' },
  { path: '/login', changefreq: 'weekly', priority: '0.80' },
  { path: '/register', changefreq: 'weekly', priority: '0.80' },
  { path: '/child-panels', changefreq: 'weekly', priority: '0.75' },
  { path: '/affiliates', changefreq: 'weekly', priority: '0.75' },
  { path: '/terms', changefreq: 'monthly', priority: '0.50' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.50' },
];

// Fallback editorial articles present in the frontend
const STATIC_EDITORIAL_ARTICLES = [
  {
    slug: 'how-to-maximize-organic-reach-with-smm-in-2026',
    updatedAt: '2026-08-15',
    priority: '0.7',
    changefreq: 'weekly',
  },
  {
    slug: 'youtube-algorithm-essentials-watch-time-vs-click-through-rate',
    updatedAt: '2026-07-20',
    priority: '0.7',
    changefreq: 'weekly',
  },
  {
    slug: 'how-to-launch-a-profitable-reseller-panel-with-youthsmm-child-panels',
    updatedAt: '2026-06-10',
    priority: '0.7',
    changefreq: 'weekly',
  },
];

/**
 * Automatically detects the canonical domain from the request, database settings, or environment.
 * Prevents hardcoded placeholder domains like example.com.
 */
export function getCanonicalBaseUrl(req?: Request, customDomainSetting?: string): string {
  // 1. Explicit domain configured in settings table
  if (customDomainSetting && /^https?:\/\//i.test(customDomainSetting.trim())) {
    return customDomainSetting.trim().replace(/\/+$/, '');
  }

  // 2. Dynamic header inspection from the incoming request (supports custom domains, proxies, Cloud Run)
  if (req) {
    const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const proto = rawProto.split(',')[0].trim();
    const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
    const host = rawHost.split(',')[0].trim();

    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      // Production domain canonicalization for youthsmm
      if (host === 'youthsmm.com' || host === 'www.youthsmm.com') {
        return 'https://www.youthsmm.com';
      }
      const safeProto = proto === 'http' ? 'https' : proto;
      return `${safeProto}://${host}`;
    }
  }

  // 3. Environment variables (Cloud Run, Vercel, or custom deployment)
  const envUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    process.env.SITE_URL ||
    process.env.DOMAIN ||
    ''
  ).trim().replace(/\/+$/, '');
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl;
  }

  // 4. Request from localhost
  if (req) {
    const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
    if (rawHost) {
      return `http://${rawHost.split(',')[0].trim()}`;
    }
  }

  // 5. Default production canonical fallback matching index.html
  return 'https://www.youthsmm.com';
}

/**
 * Generates the full XML content for sitemap.xml.
 */
export async function generateSitemapXml(baseUrl: string): Promise<string> {
  const currentDate = new Date().toISOString().split('T')[0];
  const cleanBase = baseUrl.replace(/\/+$/, '');

  const urls: Array<{
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: string;
  }> = [];

  // 1. Add static public pages (canonical format, no trailing slash except root)
  for (const page of STATIC_PUBLIC_PAGES) {
    urls.push({
      loc: page.path === '' ? `${cleanBase}/` : `${cleanBase}${page.path}`,
      lastmod: currentDate,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  }

  // 2. Add published blog articles from the database
  const seenSlugs = new Set<string>();

  try {
    const publishedBlogs = await db
      .select({
        id: blogs.id,
        slug: blogs.slug,
        updatedAt: blogs.updatedAt,
        createdAt: blogs.createdAt,
      })
      .from(blogs)
      .where(eq(blogs.status, 'published'))
      .orderBy(desc(blogs.createdAt));

    for (const blog of publishedBlogs) {
      const identifier = blog.slug || String(blog.id);
      if (identifier && !seenSlugs.has(identifier)) {
        seenSlugs.add(identifier);
        const lastmodDate = blog.updatedAt || blog.createdAt;
        const formattedDate = lastmodDate
          ? new Date(lastmodDate).toISOString().split('T')[0]
          : currentDate;

        urls.push({
          loc: `${cleanBase}/blog/${encodeURIComponent(identifier)}`,
          lastmod: formattedDate,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
    }
  } catch (err) {
    console.warn('[SITEMAP] Could not query dynamic blogs table:', err);
  }

  // 3. Add static editorial articles if not already present
  for (const article of STATIC_EDITORIAL_ARTICLES) {
    if (!seenSlugs.has(article.slug)) {
      seenSlugs.add(article.slug);
      urls.push({
        loc: `${cleanBase}/blog/${article.slug}`,
        lastmod: article.updatedAt,
        changefreq: article.changefreq,
        priority: article.priority,
      });
    }
  }

  // 4. Build standard XML 0.9 format
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const item of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${item.loc}</loc>\n`;
    xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Generates the robots.txt content referencing the auto-detected sitemap.
 */
export function generateRobotsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');

  return `# robots.txt for YouthSMM
# Generated automatically with dynamic canonical domain detection

User-agent: *
Allow: /
Allow: /favicon*
Allow: /apple-touch-icon*
Allow: /*.ico
Allow: /*.png
Allow: /*.svg
Allow: /site.webmanifest
Allow: /services
Allow: /about
Allow: /api-docs
Allow: /faq
Allow: /blog
Allow: /blog/*
Allow: /contact
Allow: /login
Allow: /register
Allow: /signin
Allow: /signup
Allow: /child-panels
Allow: /affiliates
Allow: /terms
Allow: /privacy

# Explicitly allow Google Search & Image crawlers to index favicon and brand assets
User-agent: Googlebot-Image
Allow: /

User-agent: Googlebot
Allow: /

# Disallow private user workspace, admin portal and internal API backend routes
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/

# Sitemap Location
Sitemap: ${cleanBase}/sitemap.xml
`;
}

/**
 * Express handler for GET /sitemap.xml
 */
export async function sitemapHandler(req: Request, res: Response): Promise<void> {
  try {
    let customDomain: string | undefined;
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'websiteUrl')).limit(1);
      if (rows.length > 0 && rows[0].value) {
        customDomain = rows[0].value;
      }
    } catch (_) {}

    const baseUrl = getCanonicalBaseUrl(req, customDomain);
    const xml = await generateSitemapXml(baseUrl);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error) {
    console.error('[SITEMAP ERROR]', error);
    res.status(500).setHeader('Content-Type', 'text/plain').send('Failed to generate sitemap.');
  }
}

/**
 * Express handler for GET /robots.txt
 */
export async function robotsHandler(req: Request, res: Response): Promise<void> {
  try {
    let customDomain: string | undefined;
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'websiteUrl')).limit(1);
      if (rows.length > 0 && rows[0].value) {
        customDomain = rows[0].value;
      }
    } catch (_) {}

    const baseUrl = getCanonicalBaseUrl(req, customDomain);
    const text = generateRobotsTxt(baseUrl);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(text);
  } catch (error) {
    console.error('[ROBOTS.TXT ERROR]', error);
    res.status(500).setHeader('Content-Type', 'text/plain').send('User-agent: *\nAllow: /\n');
  }
}

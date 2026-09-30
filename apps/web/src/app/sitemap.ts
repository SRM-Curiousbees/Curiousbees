import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

const PUBLIC_PAGES: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/about', priority: 0.7 },
  { path: '/research', priority: 0.7 },
  { path: '/education', priority: 0.6 },
  { path: '/institution', priority: 0.6 },
  { path: '/contact', priority: 0.5 },
  { path: '/login', priority: 0.5 },
  { path: '/ethics-framework', priority: 0.3 },
  { path: '/privacy-policy', priority: 0.3 },
  { path: '/terms-of-service', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map(({ path, priority }) => ({
    url: `${SITE}${path}`,
    changeFrequency: 'monthly',
    priority,
  }));
}

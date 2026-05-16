import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://broadcasthq.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,         lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/pricing`,  lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/about`,    lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/contact`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/docs`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/login`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/signup`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/privacy`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE}/terms`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
  ]

  return staticRoutes
}

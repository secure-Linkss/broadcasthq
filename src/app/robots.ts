import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://broadcasthq.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/dashboard', '/billing', '/settings', '/team', '/campaigns', '/contacts', '/templates', '/analytics', '/inbox', '/tools'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces, campaigns, contacts } from '@/lib/db'
import { sql, gt } from 'drizzle-orm'

// Cached for 60 s to avoid hammering DB on every page load
let cache: { data: unknown; at: number } | null = null
const TTL = 60_000

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      })
    }

    const [[wsRow], [campRow], [contactRow]] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(workspaces),
      db.select({
        total:         sql<number>`count(*)::int`,
        totalMessages: sql<number>`coalesce(sum(recipients_count), 0)::int`,
        avgReadRate:   sql<number>`coalesce(avg(nullif(read_rate, 0)), 0)::float`,
      }).from(campaigns).where(gt(campaigns.recipientsCount, 0)),
      db.select({ total: sql<number>`count(*)::int` }).from(contacts),
    ])

    const data = {
      stats: {
        teams:       wsRow?.total       ?? 0,
        campaigns:   campRow?.total     ?? 0,
        messages:    campRow?.totalMessages ?? 0,
        readRate:    Math.round((campRow?.avgReadRate ?? 0) * 10) / 10,
        contacts:    contactRow?.total  ?? 0,
      },
    }

    cache = { data, at: Date.now() }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    })
  } catch {
    return NextResponse.json({ stats: null })
  }
}

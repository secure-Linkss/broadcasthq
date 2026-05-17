export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, supportTickets } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const isAdmin = ['super_admin', 'admin', 'owner'].includes(user.role)

    const whereClause = isAdmin
      ? sql`1=1`
      : eq(supportTickets.userId, user.id)

    const [stats] = await db.select({
      total:            sql<number>`count(*)::int`,
      open:             sql<number>`count(*) filter (where status = 'open')::int`,
      in_progress:      sql<number>`count(*) filter (where status = 'in_progress')::int`,
      waiting_response: sql<number>`count(*) filter (where status = 'waiting_response')::int`,
      resolved:         sql<number>`count(*) filter (where status = 'resolved')::int`,
      closed:           sql<number>`count(*) filter (where status = 'closed')::int`,
      urgent:           sql<number>`count(*) filter (where priority = 'urgent')::int`,
      high:             sql<number>`count(*) filter (where priority = 'high')::int`,
    }).from(supportTickets).where(whereClause)

    return NextResponse.json({ stats })
  } catch (err) {
    console.error('GET /api/support/stats:', err)
    return serverErrorJson()
  }
}

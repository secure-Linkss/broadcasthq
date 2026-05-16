import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, webhooks, workspaces } from '@/lib/db'
import { eq, ilike, or, sql, desc } from 'drizzle-orm'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const where = search
      ? or(ilike(webhooks.name, `%${search}%`), ilike(webhooks.url, `%${search}%`))
      : undefined

    const [rows, countResult] = await Promise.all([
      db.select({
        id:             webhooks.id,
        workspaceId:    webhooks.workspaceId,
        workspaceName:  workspaces.name,
        name:           webhooks.name,
        url:            webhooks.url,
        isActive:       webhooks.isActive,
        failCount:      webhooks.failCount,
        lastTriggeredAt: webhooks.lastTriggeredAt,
        lastStatus:     webhooks.lastStatus,
        events:         webhooks.events,
        createdAt:      webhooks.createdAt,
      })
        .from(webhooks)
        .leftJoin(workspaces, eq(webhooks.workspaceId, workspaces.id))
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(webhooks.createdAt)),
      db.select({ count: sql<number>`count(*)::int` }).from(webhooks).where(where),
    ])

    return NextResponse.json({ webhooks: rows, total: countResult[0]?.count ?? 0 })
  } catch (err) {
    console.error('Admin webhooks GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

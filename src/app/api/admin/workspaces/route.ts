import { NextRequest, NextResponse } from 'next/server'
import { db, workspaces, users, campaigns, contacts, messages } from '@/lib/db'
import { eq, ilike, desc, and, sql, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

export async function GET(request: NextRequest) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const plan   = searchParams.get('plan')
  const status = searchParams.get('status')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const conditions: ReturnType<typeof eq>[] = []
    if (plan)   conditions.push(eq(workspaces.planId, plan) as any)
    if (status) conditions.push(eq(workspaces.subscriptionStatus, status) as any)
    if (search) conditions.push(ilike(workspaces.name, `%${search}%`) as any)

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id:                 workspaces.id,
        name:               workspaces.name,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        isActive:           workspaces.isActive,
        createdAt:          workspaces.createdAt,
        userCount:          sql<number>`count(distinct ${users.id})::int`,
        campaignCount:      sql<number>`count(distinct ${campaigns.id})::int`,
        contactCount:       sql<number>`count(distinct ${contacts.id})::int`,
        messageCount:       sql<number>`count(distinct ${messages.id})::int`,
      })
      .from(workspaces)
      .leftJoin(users,     eq(users.workspaceId,     workspaces.id))
      .leftJoin(campaigns, eq(campaigns.workspaceId, workspaces.id))
      .leftJoin(contacts,  eq(contacts.workspaceId,  workspaces.id))
      .leftJoin(messages,  eq(messages.workspaceId,  workspaces.id))
      .where(whereClause)
      .groupBy(workspaces.id)
      .orderBy(desc(workspaces.createdAt))
      .limit(limit).offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaces)
      .where(whereClause)

    return NextResponse.json({ workspaces: rows, total: count })
  } catch (err) {
    console.error('GET /api/admin/workspaces:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

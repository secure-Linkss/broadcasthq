import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns, workspaces } from '@/lib/db'
import { eq, ilike, desc, and, sql } from 'drizzle-orm'
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
  const status = searchParams.get('status')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const conditions: any[] = []
    if (status) conditions.push(eq(campaigns.status, status))
    if (search) conditions.push(ilike(campaigns.name, `%${search}%`))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id:              campaigns.id,
        name:            campaigns.name,
        status:          campaigns.status,
        recipientsCount: campaigns.recipientsCount,
        deliveryRate:    campaigns.deliveryRate,
        readRate:        campaigns.readRate,
        failCount:       campaigns.failCount,
        sentDate:        campaigns.sentDate,
        createdAt:       campaigns.createdAt,
        workspaceId:     campaigns.workspaceId,
        workspaceName:   workspaces.name,
        workspacePlan:   workspaces.planId,
      })
      .from(campaigns)
      .leftJoin(workspaces, eq(campaigns.workspaceId, workspaces.id))
      .where(whereClause)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit).offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(whereClause)

    return NextResponse.json({ campaigns: rows, total: count })
  } catch (err) {
    console.error('GET /api/admin/campaigns:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

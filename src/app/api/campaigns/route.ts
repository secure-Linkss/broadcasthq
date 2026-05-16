import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns } from '@/lib/db'
import { eq, and, desc, sql, ilike } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tag    = searchParams.get('tag')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const conditions = [eq(campaigns.workspaceId, user.workspaceId)]
    if (status) conditions.push(eq(campaigns.status, status))

    const rows = await db
      .select()
      .from(campaigns)
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(and(...conditions))

    return NextResponse.json({ campaigns: rows.map(mapCampaign), total: count })
  } catch (err) {
    console.error('GET /api/campaigns:', err)
    return serverErrorJson()
  }
}

function mapCampaign(row: typeof campaigns.$inferSelect) {
  return {
    id:              row.id,
    name:            row.name,
    status:          row.status,
    recipientsCount: row.recipientsCount,
    deliveryRate:    row.deliveryRate,
    readRate:        row.readRate,
    failCount:       row.failCount,
    sentDate:        row.sentDate?.toISOString() ?? null,
    scheduledDate:   row.scheduledDate?.toISOString() ?? null,
    tags:            row.tags ?? [],
    createdAt:       row.createdAt.toISOString(),
    templateName:    row.templateName,
    templateVariables: row.templateVariables,
  }
}

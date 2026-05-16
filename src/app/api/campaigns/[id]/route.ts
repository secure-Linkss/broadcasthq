export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns, messages, contacts } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, notFoundJson, forbiddenJson, serverErrorJson, canManage } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  const { id } = await params

  try {
    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, user.workspaceId)))
      .limit(1)

    if (!campaign) return notFoundJson('Campaign')

    const [breakdown, timeline, audienceTiers] = await Promise.all([
      db.select({
        status: messages.status,
        count:  sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(eq(messages.campaignId, id))
      .groupBy(messages.status),

      db.select({
        hour:      sql<number>`date_part('hour', sent_at)::int`,
        sent:      sql<number>`count(*)::int`,
        delivered: sql<number>`count(delivered_at)::int`,
        read:      sql<number>`count(read_at)::int`,
      })
      .from(messages)
      .where(eq(messages.campaignId, id))
      .groupBy(sql`date_part('hour', sent_at)`)
      .orderBy(sql`date_part('hour', sent_at)`),

      db.select({
        tier:  contacts.engagementTier,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(eq(messages.campaignId, id))
      .groupBy(contacts.engagementTier),
    ])

    const stats: Record<string, number> = {}
    for (const row of breakdown) stats[row.status] = row.count

    const timelineFormatted = timeline.map(t => ({
      ...t,
      label: `${t.hour % 12 === 0 ? 12 : t.hour % 12}${t.hour < 12 ? 'am' : 'pm'}`,
    }))

    return NextResponse.json({
      campaign:         mapCampaign(campaign),
      messageBreakdown: stats,
      timeline:         timelineFormatted,
      audienceTiers,
    })
  } catch (err) {
    console.error('GET /api/campaigns/[id]:', err)
    return serverErrorJson()
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  const { id } = await params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name)              updates.name             = body.name
    if (body.status)            updates.status           = body.status
    if (body.tags)              updates.tags             = body.tags
    if (body.scheduledDate)     updates.scheduledDate    = new Date(body.scheduledDate)
    if (body.templateName)      updates.templateName     = body.templateName
    if (body.templateVariables) updates.templateVariables= body.templateVariables

    const [updated] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, user.workspaceId)))
      .returning()

    if (!updated) return notFoundJson('Campaign')
    return NextResponse.json({ campaign: mapCampaign(updated) })
  } catch (err) {
    console.error('PATCH /api/campaigns/[id]:', err)
    return serverErrorJson()
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()
  const { id } = await params

  try {
    await db.delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, user.workspaceId)))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/campaigns/[id]:', err)
    return serverErrorJson()
  }
}

function mapCampaign(row: typeof campaigns.$inferSelect) {
  return {
    id:                row.id,
    name:              row.name,
    status:            row.status,
    recipientsCount:   row.recipientsCount,
    deliveryRate:      row.deliveryRate,
    readRate:          row.readRate,
    failCount:         row.failCount,
    replyCount:        row.replyCount,
    engagementScore:   row.engagementScore,
    description:       row.description,
    sentDate:          row.sentDate?.toISOString() ?? null,
    scheduledDate:     row.scheduledDate?.toISOString() ?? null,
    tags:              row.tags ?? [],
    createdAt:         row.createdAt.toISOString(),
    templateName:      row.templateName,
    templateVariables: row.templateVariables,
  }
}

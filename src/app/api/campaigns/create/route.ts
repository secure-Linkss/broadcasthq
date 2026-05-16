export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns } from '@/lib/db'
import { z } from 'zod'
import { getSessionUser, unauthorizedJson, badRequestJson, serverErrorJson } from '@/lib/session'

const schema = z.object({
  name:              z.string().min(1).max(200),
  templateName:      z.string().min(1),
  templateVariables: z.record(z.string(), z.string()).optional(),
  scheduledDate:     z.string().optional(),
  tags:              z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const { name, templateName, templateVariables, scheduledDate, tags } = parsed.data

    const [campaign] = await db
      .insert(campaigns)
      .values({
        workspaceId:       user.workspaceId,
        name,
        templateName,
        templateVariables: templateVariables ?? {},
        scheduledDate:     scheduledDate ? new Date(scheduledDate) : null,
        tags:              tags ?? [],
        status:            scheduledDate ? 'scheduled' : 'draft',
      })
      .returning()

    return NextResponse.json({ success: true, campaignId: campaign.id, campaign: mapCampaign(campaign) })
  } catch (err) {
    console.error('POST /api/campaigns/create:', err)
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
  }
}


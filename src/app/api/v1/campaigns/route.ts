import { NextRequest } from 'next/server'
import { db, campaigns } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { authenticateApiKey, hasPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'campaigns', 'read')) return forbiddenResponse()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const rows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.workspaceId, auth.workspaceId))
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset)

    const filtered = status ? rows.filter(c => c.status === status) : rows

    return Response.json({
      data: filtered.map(mapCampaign),
      meta: { limit, offset },
    })
  } catch (err) {
    console.error('GET /api/v1/campaigns:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  name:              z.string().min(1),
  templateName:      z.string().min(1),
  templateVariables: z.record(z.string(), z.string()).optional(),
  scheduledDate:     z.string().datetime().optional(),
  tags:              z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'campaigns', 'write')) return forbiddenResponse()

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, templateName, templateVariables, scheduledDate, tags } = parsed.data

    const [row] = await db.insert(campaigns).values({
      workspaceId:       auth.workspaceId,
      name,
      templateName,
      templateVariables: templateVariables ?? {},
      scheduledDate:     scheduledDate ? new Date(scheduledDate) : null,
      tags:              tags ?? [],
      status:            scheduledDate ? 'scheduled' : 'draft',
    }).returning()

    return Response.json({ data: mapCampaign(row) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/v1/campaigns:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
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
    sentDate:        row.sentDate,
    scheduledDate:   row.scheduledDate,
    tags:            row.tags ?? [],
    createdAt:       row.createdAt,
    templateName:    row.templateName,
  }
}

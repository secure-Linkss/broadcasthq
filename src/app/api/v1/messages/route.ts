import { NextRequest } from 'next/server'
import { db, messages, contacts, campaigns } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { authenticateApiKey, hasPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'messages', 'read')) return forbiddenResponse()

  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const contactId  = searchParams.get('contactId')
  const status     = searchParams.get('status')
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset     = parseInt(searchParams.get('offset') ?? '0')

  try {
    const conditions: any[] = [eq(messages.workspaceId, auth.workspaceId)]
    if (campaignId) conditions.push(eq(messages.campaignId, campaignId))
    if (contactId)  conditions.push(eq(messages.contactId, contactId))
    if (status)     conditions.push(eq(messages.status, status))

    const rows = await db
      .select({
        id:          messages.id,
        status:      messages.status,
        content:     messages.content,
        sentAt:      messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt:      messages.readAt,
        errorReason: messages.errorReason,
        contactId:   messages.contactId,
        campaignId:  messages.campaignId,
        contactPhone:     contacts.phone,
        contactFirstName: contacts.firstName,
        contactLastName:  contacts.lastName,
        campaignName:     campaigns.name,
      })
      .from(messages)
      .leftJoin(contacts,  eq(messages.contactId,  contacts.id))
      .leftJoin(campaigns, eq(messages.campaignId, campaigns.id))
      .where(and(...conditions))
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .offset(offset)

    return Response.json({
      data: rows.map(r => ({
        id:          r.id,
        status:      r.status,
        content:     r.content,
        sentAt:      r.sentAt,
        deliveredAt: r.deliveredAt,
        readAt:      r.readAt,
        errorReason: r.errorReason,
        contact: {
          id:        r.contactId,
          phone:     r.contactPhone,
          firstName: r.contactFirstName,
          lastName:  r.contactLastName,
        },
        campaign: r.campaignId ? { id: r.campaignId, name: r.campaignName } : null,
      })),
      meta: { limit, offset },
    })
  } catch (err) {
    console.error('GET /api/v1/messages:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

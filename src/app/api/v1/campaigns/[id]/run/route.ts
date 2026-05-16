export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { db, campaigns, contacts, messages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { authenticateApiKey, hasPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { sendWhatsAppMessage, buildTemplateBody } from '@/lib/twilio'

const BATCH_SIZE     = 10
const BATCH_DELAY_MS = 1000

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'campaigns', 'run')) return forbiddenResponse()

  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, auth.workspaceId)))
      .limit(1)

    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'running') return Response.json({ error: 'Campaign already running' }, { status: 409 })
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return Response.json({ error: `Cannot run campaign in status "${campaign.status}"` }, { status: 400 })
    }

    const activeContacts = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.workspaceId, auth.workspaceId), eq(contacts.status, 'active')))

    if (activeContacts.length === 0) {
      return Response.json({ error: 'No active contacts' }, { status: 400 })
    }

    // Insert pending messages in chunks
    const CHUNK = 500
    for (let i = 0; i < activeContacts.length; i += CHUNK) {
      await db.insert(messages).values(
        activeContacts.slice(i, i + CHUNK).map(c => ({
          workspaceId: auth.workspaceId,
          campaignId:  id,
          contactId:   c.id,
          status:      'pending' as const,
        }))
      )
    }

    await db.update(campaigns)
      .set({ status: 'running', sentDate: new Date() })
      .where(eq(campaigns.id, id))

    // Fire-and-forget
    const dispatch = async () => {
      const vars = (campaign.templateVariables as Record<string, string>) ?? {}

      for (let i = 0; i < activeContacts.length; i += BATCH_SIZE) {
        const batch = activeContacts.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async contact => {
          const personalVars = {
            ...vars,
            name:       contact.firstName ?? contact.phone,
            first_name: contact.firstName ?? '',
            last_name:  contact.lastName  ?? '',
            ...((contact.customFields as Record<string, string>) ?? {}),
          }
          const body   = buildTemplateBody(campaign.templateName ?? '', personalVars)
          const result = await sendWhatsAppMessage(contact.phone, body)

          await db.update(messages)
            .set({
              status:      result.success ? 'sent' : 'failed',
              twilioSid:   result.sid ?? null,
              errorReason: result.error ?? null,
            })
            .where(and(eq(messages.campaignId, id), eq(messages.contactId, contact.id)))
        }))

        if (i + BATCH_SIZE < activeContacts.length) {
          await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
        }
      }

      await db.update(campaigns).set({ status: 'completed' }).where(eq(campaigns.id, id))
    }

    dispatch().catch(err => {
      console.error(`v1 campaign ${id} dispatch error:`, err)
      db.update(campaigns).set({ status: 'failed' }).where(eq(campaigns.id, id))
    })

    return Response.json({
      success:       true,
      campaignId:    id,
      totalContacts: activeContacts.length,
      message:       `Dispatching to ${activeContacts.length} contacts`,
    })
  } catch (err) {
    console.error('POST /api/v1/campaigns/[id]/run:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

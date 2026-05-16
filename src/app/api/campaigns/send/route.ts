import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns, contacts, messages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, badRequestJson, canManage } from '@/lib/session'
import { sendWhatsAppMessage, buildTemplateBody } from '@/lib/twilio'

const BATCH_SIZE     = 10
const BATCH_DELAY_MS = 1000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()
  if (!canManage(user.role) && user.role !== 'editor') return forbiddenJson()

  try {
    const { campaignId } = await request.json()
    if (!campaignId) return badRequestJson('campaignId is required')

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, user.workspaceId)))
      .limit(1)

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'running') {
      return NextResponse.json({ error: 'Campaign is already running' }, { status: 409 })
    }

    const activeContacts = await db
      .select({ id: contacts.id, phone: contacts.phone, firstName: contacts.firstName, lastName: contacts.lastName, customFields: contacts.customFields })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, user.workspaceId), eq(contacts.status, 'active')))

    if (activeContacts.length === 0) {
      return badRequestJson('No active contacts found')
    }

    // Bulk-insert pending message rows
    await db.insert(messages).values(
      activeContacts.map(c => ({
        workspaceId: user.workspaceId,
        campaignId,
        contactId:   c.id,
        status:      'pending' as const,
      }))
    )

    await db
      .update(campaigns)
      .set({ status: 'running', sentDate: new Date(), updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))

    const variables = (campaign.templateVariables as Record<string, string>) ?? {}

    // Fire-and-forget batch dispatch
    const sendBatches = async () => {
      let sent   = 0
      let failed = 0

      for (let i = 0; i < activeContacts.length; i += BATCH_SIZE) {
        const batch = activeContacts.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async contact => {
          const personalVars = {
            ...variables,
            name:       contact.firstName ?? contact.phone,
            first_name: contact.firstName ?? '',
            last_name:  contact.lastName  ?? '',
            ...((contact.customFields as Record<string, string>) ?? {}),
          }

          const body   = buildTemplateBody(campaign.templateName as string, personalVars)
          const result = await sendWhatsAppMessage(contact.phone, body)

          await db
            .update(messages)
            .set({
              status:      result.success ? 'sent' : 'failed',
              twilioSid:   result.sid,
              errorReason: result.error ?? null,
              content:     body,
            })
            .where(and(eq(messages.campaignId, campaignId), eq(messages.contactId, contact.id)))

          if (result.success) sent++
          else failed++
        }))

        if (i + BATCH_SIZE < activeContacts.length) await sleep(BATCH_DELAY_MS)
      }

      await db
        .update(campaigns)
        .set({
          status:     failed === activeContacts.length ? 'failed' : 'completed',
          updatedAt:  new Date(),
        })
        .where(eq(campaigns.id, campaignId))

      console.log(`Campaign ${campaignId}: ${sent} sent, ${failed} failed`)
    }

    sendBatches().catch(err => {
      console.error('Batch send error:', err)
      db.update(campaigns)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId))
        .catch(console.error)
    })

    return NextResponse.json({
      success:       true,
      message:       `Sending to ${activeContacts.length} contacts in batches of ${BATCH_SIZE}`,
      totalContacts: activeContacts.length,
    })
  } catch (err) {
    console.error('Send campaign error:', err)
    return serverErrorJson()
  }
}

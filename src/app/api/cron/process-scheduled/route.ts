export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns, contacts, messages } from '@/lib/db'
import { eq, and, lte, sql } from 'drizzle-orm'
import { sendWhatsAppMessage, buildTemplateBody } from '@/lib/twilio'

const BATCH_SIZE     = 10
const BATCH_DELAY_MS = 1000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or our own internal calls)
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  try {
    // Find all campaigns that are scheduled and past their send time
    // Use atomic update to claim them (prevents double-execution if cron overlaps)
    const due = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'scheduled'),
          lte(campaigns.scheduledDate, now)
        )
      )

    if (due.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No scheduled campaigns due' })
    }

    // Mark all due campaigns as 'running' atomically before processing
    // This prevents any duplicate cron run from picking them up
    for (const campaign of due) {
      await db
        .update(campaigns)
        .set({ status: 'running', sentDate: now, updatedAt: now })
        .where(
          and(
            eq(campaigns.id, campaign.id),
            eq(campaigns.status, 'scheduled') // only update if still scheduled (race protection)
          )
        )
    }

    // Re-fetch to get only the ones we successfully claimed
    const claimed = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'running'),
          lte(campaigns.scheduledDate, now)
        )
      )

    const results: { id: string; name: string; sent: number; failed: number }[] = []

    for (const campaign of claimed) {
      if (!campaign.workspaceId) continue

      // Load active contacts for this workspace
      const activeContacts = await db
        .select({
          id:           contacts.id,
          phone:        contacts.phone,
          firstName:    contacts.firstName,
          lastName:     contacts.lastName,
          customFields: contacts.customFields,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, campaign.workspaceId),
            eq(contacts.status, 'active')
          )
        )

      if (activeContacts.length === 0) {
        await db
          .update(campaigns)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(campaigns.id, campaign.id))
        results.push({ id: campaign.id, name: campaign.name, sent: 0, failed: 0 })
        continue
      }

      // Bulk-insert pending message rows
      await db.insert(messages).values(
        activeContacts.map(c => ({
          workspaceId: campaign.workspaceId,
          campaignId:  campaign.id,
          contactId:   c.id,
          status:      'pending' as const,
        }))
      )

      const variables = (campaign.templateVariables as Record<string, string>) ?? {}
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
            .where(
              and(
                eq(messages.campaignId, campaign.id),
                eq(messages.contactId, contact.id)
              )
            )

          if (result.success) sent++
          else failed++
        }))

        if (i + BATCH_SIZE < activeContacts.length) await sleep(BATCH_DELAY_MS)
      }

      await db
        .update(campaigns)
        .set({
          status:           failed === activeContacts.length ? 'failed' : 'completed',
          recipientsCount:  activeContacts.length,
          updatedAt:        new Date(),
        })
        .where(eq(campaigns.id, campaign.id))

      results.push({ id: campaign.id, name: campaign.name, sent, failed })
      console.log(`[cron] Campaign ${campaign.id} "${campaign.name}": ${sent} sent, ${failed} failed`)
    }

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    console.error('[cron] process-scheduled error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db, whatsappConnections, contacts, messages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { MetaClient, MetaWebhookEvent } from '@/lib/meta'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!
const APP_SECRET   = process.env.META_APP_SECRET!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const signature = request.headers.get('x-hub-signature-256') ?? ''
    if (APP_SECRET && !MetaClient.verifyWebhookSignature(rawBody, signature, APP_SECRET)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event: MetaWebhookEvent = JSON.parse(rawBody)
    if (event.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    for (const entry of event.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value  = change.value
        const wabaId = entry.id

        const [conn] = await db
          .select({ workspaceId: whatsappConnections.workspaceId })
          .from(whatsappConnections)
          .where(eq(whatsappConnections.wabaId, wabaId))
          .limit(1)

        if (!conn) continue

        // Incoming messages → upsert contact + insert message
        for (const msg of value.messages ?? []) {
          const phone = `+${msg.from}`

          const [contact] = await db
            .insert(contacts)
            .values({
              workspaceId: conn.workspaceId,
              phone,
              status:     'active',
              lastActive: new Date(),
            })
            .onConflictDoUpdate({
              target:       [contacts.workspaceId, contacts.phone],
              set:          { status: 'active', lastActive: new Date() },
            })
            .returning({ id: contacts.id })

          if (!contact) continue

          await db.insert(messages).values({
            workspaceId: conn.workspaceId,
            contactId:   contact.id,
            status:      'replied',
            content:     msg.text?.body ?? `[${msg.type}]`,
            sentAt:      new Date(parseInt(msg.timestamp) * 1000),
          })
        }

        // Delivery / read status updates
        for (const status of value.statuses ?? []) {
          const statusMap: Record<string, string> = {
            sent:      'sent',
            delivered: 'delivered',
            read:      'read',
            failed:    'failed',
          }
          const newStatus = statusMap[status.status]
          if (!newStatus) continue

          const updates: Partial<typeof messages.$inferInsert> = { status: newStatus as typeof messages.$inferInsert['status'] }
          if (status.status === 'delivered') updates.deliveredAt = new Date(parseInt(status.timestamp) * 1000)
          if (status.status === 'read')      updates.readAt      = new Date(parseInt(status.timestamp) * 1000)
          if (status.errors?.length)         updates.errorReason = status.errors[0].title

          await db
            .update(messages)
            .set(updates)
            .where(eq(messages.twilioSid, status.id))
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Meta webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

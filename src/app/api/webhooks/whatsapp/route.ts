export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, messages } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateTwilioSignature } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const url  = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
    const text = await request.text()

    const params: Record<string, string> = {}
    new URLSearchParams(text).forEach((v, k) => { params[k] = v })

    const signature = request.headers.get('x-twilio-signature') ?? ''
    if (!validateTwilioSignature(url, params, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const messageSid    = params['MessageSid']
    const messageStatus = params['MessageStatus']
    const errorCode     = params['ErrorCode'] ?? null
    const errorMessage  = params['ErrorMessage'] ?? null

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const statusMap: Record<string, string> = {
      queued:      'sent',
      sending:     'sent',
      sent:        'sent',
      delivered:   'delivered',
      read:        'read',
      failed:      'failed',
      undelivered: 'failed',
    }

    const newStatus = statusMap[messageStatus]
    if (!newStatus) return NextResponse.json({ ok: true, skipped: true })

    const updates: Partial<typeof messages.$inferInsert> = {
      status: newStatus as typeof messages.$inferInsert['status'],
    }

    if (newStatus === 'delivered') updates.deliveredAt = new Date()
    if (newStatus === 'read')      updates.readAt      = new Date()
    if (newStatus === 'failed' && (errorCode || errorMessage)) {
      updates.errorReason = errorMessage ?? `Twilio error ${errorCode}`
    }

    await db
      .update(messages)
      .set(updates)
      .where(eq(messages.twilioSid, messageSid))

    return NextResponse.json({ ok: true, messageSid, status: newStatus })
  } catch (err) {
    console.error('Twilio webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


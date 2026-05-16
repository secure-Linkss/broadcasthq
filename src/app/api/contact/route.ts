export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, auditLogs } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json() as {
      name?: string; email?: string; subject?: string; message?: string
    }

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ??
                      request.headers.get('x-real-ip') ?? 'unknown'

    await db.insert(auditLogs).values({
      action:     'contact_form_submit',
      resource:   'contact_inquiry',
      resourceId: null,
      metadata:   { name: name.trim(), email: email.trim().toLowerCase(), subject, message: message.trim() },
      ipAddress,
      userAgent:  request.headers.get('user-agent') ?? '',
    })

    // In production: send notification email to hello@broadcasthq.app
    console.log(`[CONTACT FORM] From: ${name} <${email}> | Subject: ${subject}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


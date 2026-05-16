import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { db, messages, contacts } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workspaceId } = user

    const rows = await db
      .select({
        contactId:   contacts.id,
        phone:       contacts.phone,
        firstName:   contacts.firstName,
        lastName:    contacts.lastName,
        lastMessage: messages.content,
        lastStatus:  messages.status,
        sentAt:      messages.sentAt,
        readAt:      messages.readAt,
      })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(messages.workspaceId, workspaceId),
          sql`${messages.sentAt} = (
            SELECT MAX(m2.sent_at) FROM messages m2
            WHERE m2.contact_id = ${messages.contactId}
              AND m2.workspace_id = ${workspaceId}
          )`
        )
      )
      .orderBy(desc(messages.sentAt))
      .limit(100)

    return NextResponse.json({ conversations: rows })
  } catch (err) {
    console.error('Inbox GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

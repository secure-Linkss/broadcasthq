export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { db, messages } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workspaceId } = user

    const thread = await db
      .select({
        id:          messages.id,
        content:     messages.content,
        status:      messages.status,
        sentAt:      messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt:      messages.readAt,
        errorReason: messages.errorReason,
        direction:   messages.direction,
        replyContent: messages.replyContent,
      })
      .from(messages)
      .where(and(
        eq(messages.workspaceId, workspaceId),
        eq(messages.contactId, params.contactId),
      ))
      .orderBy(asc(messages.sentAt))
      .limit(100)

    return NextResponse.json({ messages: thread })
  } catch (err) {
    console.error('Inbox thread GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

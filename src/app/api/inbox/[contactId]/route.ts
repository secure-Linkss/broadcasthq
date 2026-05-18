export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { db, messages, contacts } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'

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

const postSchema = z.object({
  content: z.string().min(1).max(4096),
  type:    z.enum(['message', 'note']).default('message'),
})

export async function POST(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = postSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    // Verify contact belongs to workspace
    const [contact] = await db.select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, params.contactId), eq(contacts.workspaceId, user.workspaceId!)))
      .limit(1)
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const [msg] = await db.insert(messages).values({
      workspaceId: user.workspaceId!,
      contactId:   params.contactId,
      content:     parsed.data.content,
      direction:   'outbound',
      status:      'sent',
      sentAt:      new Date(),
    }).returning()

    return NextResponse.json({ message: msg }, { status: 201 })
  } catch (err) {
    console.error('Inbox thread POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

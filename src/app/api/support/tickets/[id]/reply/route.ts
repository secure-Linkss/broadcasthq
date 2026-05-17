export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, supportTickets, ticketMessages, notifications, users } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson, notFoundJson, badRequestJson } from '@/lib/session'
import { z } from 'zod'

const ReplySchema = z.object({
  content: z.string().min(1).max(5000),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [ticket] = await db.select().from(supportTickets)
      .where(and(eq(supportTickets.id, params.id), eq(supportTickets.userId, user.id)))
      .limit(1)
    if (!ticket) return notFoundJson('Ticket')

    if (ticket.status === 'closed') {
      return badRequestJson('Cannot reply to a closed ticket')
    }

    const body = await request.json()
    const parsed = ReplySchema.safeParse(body)
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const [message] = await db.insert(ticketMessages).values({
      ticketId:   ticket.id,
      authorId:   user.id,
      authorName: user.name || user.email,
      authorRole: user.role,
      content:    parsed.data.content,
    }).returning()

    // Update ticket lastActivity + status to waiting_response if it was in_progress
    const newStatus = ticket.status === 'in_progress' ? 'waiting_response' : ticket.status
    await db.update(supportTickets).set({
      lastActivityAt: new Date(),
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, ticket.id))

    // Notify admins about new reply
    const admins = await db.select({ id: users.id }).from(users)
      .where(sql`${users.role} IN ('super_admin', 'admin', 'owner')`)
      .limit(50)

    if (admins.length > 0) {
      await db.insert(notifications).values(
        admins.map(a => ({
          userId:     a.id,
          type:       'ticket_replied',
          title:      'Ticket Reply Received',
          body:       `${user.name || user.email} replied to ${ticket.ticketNumber}`,
          href:       `/admin/tickets/${ticket.id}`,
          isRead:     false,
        }))
      ).catch(console.error)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('POST /api/support/tickets/[id]/reply:', err)
    return serverErrorJson()
  }
}

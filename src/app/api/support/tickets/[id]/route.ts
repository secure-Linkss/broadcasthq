export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, supportTickets, ticketMessages, users } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson, notFoundJson, forbiddenJson } from '@/lib/session'
import { z } from 'zod'

const PatchSchema = z.object({
  satisfactionRating: z.number().min(1).max(5).optional(),
  status:             z.enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed']).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [ticket] = await db.select().from(supportTickets)
      .where(and(eq(supportTickets.id, params.id), eq(supportTickets.userId, user.id)))
      .limit(1)

    if (!ticket) return notFoundJson('Ticket')

    const messages = await db.select({
      id:         ticketMessages.id,
      ticketId:   ticketMessages.ticketId,
      authorId:   ticketMessages.authorId,
      authorName: ticketMessages.authorName,
      authorRole: ticketMessages.authorRole,
      content:    ticketMessages.content,
      isInternal: ticketMessages.isInternal,
      isSolution: ticketMessages.isSolution,
      createdAt:  ticketMessages.createdAt,
    }).from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticket.id))
      .orderBy(asc(ticketMessages.createdAt))

    // Filter out internal notes for non-admins
    const filtered = messages.filter(m => !m.isInternal)

    return NextResponse.json({ ticket, messages: filtered })
  } catch (err) {
    console.error('GET /api/support/tickets/[id]:', err)
    return serverErrorJson()
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [ticket] = await db.select().from(supportTickets)
      .where(and(eq(supportTickets.id, params.id), eq(supportTickets.userId, user.id)))
      .limit(1)
    if (!ticket) return notFoundJson('Ticket')

    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.satisfactionRating !== undefined) update.satisfactionRating = parsed.data.satisfactionRating
    if (parsed.data.status !== undefined) update.status = parsed.data.status

    const [updated] = await db.update(supportTickets)
      .set(update)
      .where(eq(supportTickets.id, params.id))
      .returning()

    return NextResponse.json({ ticket: updated })
  } catch (err) {
    console.error('PATCH /api/support/tickets/[id]:', err)
    return serverErrorJson()
  }
}

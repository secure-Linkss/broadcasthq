export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, supportTickets, ticketMessages, notifications } from '@/lib/db'
import { eq, asc } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, notFoundJson, badRequestJson } from '@/lib/session'
import { z } from 'zod'

const PatchSchema = z.object({
  status:     z.enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed']).optional(),
  priority:   z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  resolution: z.string().max(5000).optional(),
})

const ReplySchema = z.object({
  content:    z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
  isSolution: z.boolean().default(false),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['super_admin', 'admin', 'owner'].includes(user.role)) return forbiddenJson()

  try {
    const [ticket] = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, params.id))
      .limit(1)
    if (!ticket) return notFoundJson('Ticket')

    const messages = await db.select().from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticket.id))
      .orderBy(asc(ticketMessages.createdAt))

    return NextResponse.json({ ticket, messages })
  } catch (err) {
    console.error('GET /api/admin/tickets/[id]:', err)
    return serverErrorJson()
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['super_admin', 'admin', 'owner'].includes(user.role)) return forbiddenJson()

  try {
    const [ticket] = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, params.id))
      .limit(1)
    if (!ticket) return notFoundJson('Ticket')

    const body = await request.json()

    // Handle admin reply
    if (body.content !== undefined) {
      const replyParsed = ReplySchema.safeParse(body)
      if (!replyParsed.success) return badRequestJson(replyParsed.error.issues[0].message)

      const [message] = await db.insert(ticketMessages).values({
        ticketId:   ticket.id,
        authorId:   user.id,
        authorName: user.name || user.email,
        authorRole: user.role,
        content:    replyParsed.data.content,
        isInternal: replyParsed.data.isInternal,
        isSolution: replyParsed.data.isSolution,
      }).returning()

      // Update ticket: set firstResponseAt if not set, update lastActivity, status
      const ticketUpdate: Record<string, unknown> = {
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      }
      if (!ticket.firstResponseAt) ticketUpdate.firstResponseAt = new Date()
      if (!replyParsed.data.isInternal) {
        ticketUpdate.status = replyParsed.data.isSolution ? 'resolved' : 'in_progress'
        if (replyParsed.data.isSolution) ticketUpdate.resolvedAt = new Date()
      }

      await db.update(supportTickets).set(ticketUpdate).where(eq(supportTickets.id, params.id))

      // Notify ticket owner
      if (ticket.userId && !replyParsed.data.isInternal) {
        await db.insert(notifications).values({
          userId:     ticket.userId,
          type:       'ticket_replied',
          title:      'Support Reply',
          body:       `Admin replied to your ticket ${ticket.ticketNumber}`,
          href:       `/help/tickets/${ticket.id}`,
          isRead:     false,
        }).catch(console.error)
      }

      return NextResponse.json({ message })
    }

    // Handle status/priority update
    const patchParsed = PatchSchema.safeParse(body)
    if (!patchParsed.success) return badRequestJson(patchParsed.error.issues[0].message)

    const update: Record<string, unknown> = { updatedAt: new Date(), lastActivityAt: new Date() }
    if (patchParsed.data.status !== undefined)     update.status     = patchParsed.data.status
    if (patchParsed.data.priority !== undefined)   update.priority   = patchParsed.data.priority
    if (patchParsed.data.assignedTo !== undefined) update.assignedTo = patchParsed.data.assignedTo
    if (patchParsed.data.resolution !== undefined) update.resolution = patchParsed.data.resolution

    if (patchParsed.data.status === 'resolved') update.resolvedAt = new Date()
    if (patchParsed.data.status === 'closed')   update.closedAt   = new Date()

    const [updated] = await db.update(supportTickets)
      .set(update)
      .where(eq(supportTickets.id, params.id))
      .returning()

    // Notify ticket owner of status change
    if (ticket.userId && patchParsed.data.status) {
      const statusLabel: Record<string, string> = {
        resolved: 'resolved',
        closed:   'closed',
        in_progress: 'is now in progress',
        waiting_response: 'requires your response',
      }
      const label = statusLabel[patchParsed.data.status]
      if (label) {
        await db.insert(notifications).values({
          userId:     ticket.userId,
          type:       'ticket_resolved',
          title:      'Ticket Update',
          body:       `Your ticket ${ticket.ticketNumber} has been ${label}`,
          href:       `/help/tickets/${ticket.id}`,
          isRead:     false,
        }).catch(console.error)
      }
    }

    return NextResponse.json({ ticket: updated })
  } catch (err) {
    console.error('PATCH /api/admin/tickets/[id]:', err)
    return serverErrorJson()
  }
}

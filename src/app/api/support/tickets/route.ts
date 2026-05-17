export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, supportTickets, ticketMessages, notifications, users } from '@/lib/db'
import { eq, and, desc, sql, ilike } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson, badRequestJson } from '@/lib/session'
import { z } from 'zod'

function generateTicketNumber(): string {
  const date = new Date()
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TKT-${ymd}-${rand}`
}

async function notifyAdmins(db_: typeof db, ticketId: string, subject: string, ticketNumber: string) {
  const admins = await db_.select({ id: users.id }).from(users)
    .where(sql`${users.role} IN ('super_admin', 'admin', 'owner')`)
    .limit(50)

  if (admins.length === 0) return
  await db_.insert(notifications).values(
    admins.map(a => ({
      userId:     a.id,
      type:       'ticket_created',
      title:      'New Support Ticket',
      body:       `Ticket ${ticketNumber}: ${subject}`,
      href:       `/admin/tickets/${ticketId}`,
      isRead:     false,
    }))
  )
}

const CreateSchema = z.object({
  subject:     z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category:    z.enum(['technical', 'billing', 'general', 'bug_report', 'feature_request']).default('general'),
  priority:    z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
})

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset   = parseInt(searchParams.get('offset') ?? '0')

  try {
    const conditions = [eq(supportTickets.userId, user.id)]
    if (status)   conditions.push(eq(supportTickets.status, status))
    if (priority) conditions.push(eq(supportTickets.priority, priority))

    const rows = await db.select().from(supportTickets)
      .where(and(...conditions))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(and(...conditions))

    return NextResponse.json({ tickets: rows, total })
  } catch (err) {
    console.error('GET /api/support/tickets:', err)
    return serverErrorJson()
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const { subject, description, category, priority } = parsed.data
    const ticketNumber = generateTicketNumber()

    const [ticket] = await db.insert(supportTickets).values({
      workspaceId:  user.workspaceId,
      userId:       user.id,
      ticketNumber,
      subject,
      description,
      category,
      priority,
      status:       'open',
      lastActivityAt: new Date(),
    }).returning()

    // Insert initial message = description
    await db.insert(ticketMessages).values({
      ticketId:   ticket.id,
      authorId:   user.id,
      authorName: user.name || user.email,
      authorRole: user.role,
      content:    description,
    })

    // Notify admins asynchronously (don't await to keep response fast)
    notifyAdmins(db, ticket.id, subject, ticketNumber).catch(console.error)

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    console.error('POST /api/support/tickets:', err)
    return serverErrorJson()
  }
}

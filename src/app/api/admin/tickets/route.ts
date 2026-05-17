export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, supportTickets, users } from '@/lib/db'
import { eq, and, desc, sql, ilike, SQL } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['super_admin', 'admin', 'owner'].includes(user.role)) return forbiddenJson()

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')
  const category = searchParams.get('category')
  const q        = searchParams.get('q')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset   = parseInt(searchParams.get('offset') ?? '0')

  try {
    const conditions: SQL[] = []
    if (status)   conditions.push(eq(supportTickets.status, status))
    if (priority) conditions.push(eq(supportTickets.priority, priority))
    if (category) conditions.push(eq(supportTickets.category, category))
    if (q)        conditions.push(ilike(supportTickets.subject, `%${q}%`))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db.select({
      id:              supportTickets.id,
      ticketNumber:    supportTickets.ticketNumber,
      subject:         supportTickets.subject,
      status:          supportTickets.status,
      priority:        supportTickets.priority,
      category:        supportTickets.category,
      userId:          supportTickets.userId,
      assignedTo:      supportTickets.assignedTo,
      lastActivityAt:  supportTickets.lastActivityAt,
      resolvedAt:      supportTickets.resolvedAt,
      createdAt:       supportTickets.createdAt,
    }).from(supportTickets)
      .where(whereClause)
      .orderBy(desc(supportTickets.lastActivityAt))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(whereClause)

    // Enrich with user info
    const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))]
    let userMap: Record<string, { name: string | null; email: string }> = {}
    if (userIds.length > 0) {
      const userRows = await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(sql`${users.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}::uuid`), sql`, `)}])`)
      userRows.forEach(u => { userMap[u.id] = { name: u.name, email: u.email } })
    }

    const enriched = rows.map(r => ({
      ...r,
      user: r.userId ? userMap[r.userId] ?? null : null,
    }))

    return NextResponse.json({ tickets: enriched, total })
  } catch (err) {
    console.error('GET /api/admin/tickets:', err)
    return serverErrorJson()
  }
}

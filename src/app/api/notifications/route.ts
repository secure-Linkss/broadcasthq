export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, notifications } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)

  try {
    const conditions = [eq(notifications.userId, user.id)]
    if (unreadOnly) conditions.push(eq(notifications.isRead, false))

    const rows = await db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)

    const [{ unreadCount }] = await db.select({
      unreadCount: sql<number>`count(*) filter (where is_read = false)::int`,
    }).from(notifications).where(eq(notifications.userId, user.id))

    return NextResponse.json({ notifications: rows, unreadCount })
  } catch (err) {
    console.error('GET /api/notifications:', err)
    return serverErrorJson()
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const body = await request.json().catch(() => ({}))
    const { ids, all } = body as { ids?: string[]; all?: boolean }

    if (all) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, user.id))
    } else if (ids?.length) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, user.id),
          sql`${notifications.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}])`
        ))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notifications:', err)
    return serverErrorJson()
  }
}

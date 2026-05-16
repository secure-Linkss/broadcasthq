export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, contacts } from '@/lib/db'
import { eq, and, inArray, ilike, or, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const userWorkspaceId = (session.user as any).workspaceId
    if (userWorkspaceId !== workspaceId && (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const search = searchParams.get('search') ?? ''
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const baseWhere = and(
      eq(contacts.workspaceId, workspaceId),
      inArray(contacts.status, ['opted_out', 'blocked']),
      search ? or(
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
      ) : undefined
    )

    const [rows, countResult] = await Promise.all([
      db.select({
        id:        contacts.id,
        phone:     contacts.phone,
        firstName: contacts.firstName,
        lastName:  contacts.lastName,
        status:    contacts.status,
        createdAt: contacts.createdAt,
        lastActive: contacts.lastActive,
      })
        .from(contacts)
        .where(baseWhere)
        .limit(limit)
        .offset(offset)
        .orderBy(contacts.createdAt),
      db.select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(baseWhere),
    ])

    return NextResponse.json({ optouts: rows, total: countResult[0]?.count ?? 0 })
  } catch (err) {
    console.error('Contacts optouts GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


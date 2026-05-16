import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, contacts, workspaces } from '@/lib/db'
import { eq, and, or, inArray, ilike, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const statusFilter = searchParams.get('status') ?? 'all'
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const statusValues = statusFilter === 'all'
      ? ['opted_out', 'blocked']
      : [statusFilter]

    const baseWhere = and(
      inArray(contacts.status, statusValues),
      search ? or(
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
      ) : undefined
    )

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id:            contacts.id,
          phone:         contacts.phone,
          firstName:     contacts.firstName,
          lastName:      contacts.lastName,
          status:        contacts.status,
          workspaceId:   contacts.workspaceId,
          workspaceName: workspaces.name,
          createdAt:     contacts.createdAt,
          lastActive:    contacts.lastActive,
        })
        .from(contacts)
        .leftJoin(workspaces, eq(contacts.workspaceId, workspaces.id))
        .where(baseWhere)
        .limit(limit)
        .offset(offset)
        .orderBy(contacts.createdAt),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(baseWhere),
    ])

    return NextResponse.json({ optouts: rows, total: countResult[0]?.count ?? 0 })
  } catch (err) {
    console.error('Admin optouts GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

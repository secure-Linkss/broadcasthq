import { NextRequest, NextResponse } from 'next/server'
import { db, users, workspaces } from '@/lib/db'
import { eq, ilike, or, desc, and, sql, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { z } from 'zod'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

export async function GET(request: NextRequest) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const status = searchParams.get('status')
  const role   = searchParams.get('role')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const conditions = [ne(users.role, 'super_admin')]
    if (status) conditions.push(eq(users.status, status))
    if (role)   conditions.push(eq(users.role, role))
    if (search) {
      conditions.push(or(ilike(users.email, `%${search}%`), ilike(users.name, `%${search}%`))!)
    }

    const rows = await db
      .select({
        id: users.id, email: users.email, name: users.name, role: users.role,
        status: users.status, lastActive: users.lastActive, createdAt: users.createdAt,
        workspaceId: users.workspaceId,
        workspaceName: workspaces.name, workspacePlan: workspaces.planId,
      })
      .from(users)
      .leftJoin(workspaces, eq(users.workspaceId, workspaces.id))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit).offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users).where(and(...conditions))

    return NextResponse.json({ users: rows, total: count })
  } catch (err) {
    console.error('GET /api/admin/users:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

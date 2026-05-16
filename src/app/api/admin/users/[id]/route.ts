import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq, and, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { z } from 'zod'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const schema = z.object({
    role:   z.enum(['owner','admin','editor','viewer']).optional(),
    status: z.enum(['active','suspended']).optional(),
    name:   z.string().optional(),
  })

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [updated] = await db.update(users)
      .set({ ...parsed.data })
      .where(and(eq(users.id, id), ne(users.role, 'super_admin')))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status })

    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('PATCH /api/admin/users/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  try {
    await db.delete(users).where(and(eq(users.id, id), ne(users.role, 'super_admin')))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/users/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

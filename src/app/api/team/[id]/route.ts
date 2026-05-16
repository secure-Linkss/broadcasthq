import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq, and, ne } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['owner', 'admin', 'super_admin'].includes(user.role)) return forbiddenJson()

  const { id } = await params

  const schema = z.object({
    role:   z.enum(['admin', 'editor', 'viewer']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Prevent modifying the workspace owner if caller is just admin
    const [target] = await db.select({ role: users.role }).from(users)
      .where(and(eq(users.id, id), eq(users.workspaceId, user.workspaceId!))).limit(1)

    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (target.role === 'owner' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot modify workspace owner' }, { status: 403 })
    }

    const [updated] = await db.update(users)
      .set(parsed.data)
      .where(and(eq(users.id, id), eq(users.workspaceId, user.workspaceId!)))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status })

    return NextResponse.json({ member: updated })
  } catch (err) {
    console.error('PATCH /api/team/[id]:', err)
    return serverErrorJson()
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['owner', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only workspace owners can remove members' }, { status: 403 })
  }

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  try {
    await db.delete(users)
      .where(and(
        eq(users.id, id),
        eq(users.workspaceId, user.workspaceId!),
        ne(users.role, 'owner'),
      ))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/team/[id]:', err)
    return serverErrorJson()
  }
}

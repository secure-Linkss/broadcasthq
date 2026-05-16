import { NextRequest, NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { z } from 'zod'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const schema = z.object({
    name:               z.string().min(1).optional(),
    planId:             z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
    subscriptionStatus: z.enum(['active', 'inactive', 'past_due', 'canceled']).optional(),
    isActive:           z.boolean().optional(),
  })

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [updated] = await db.update(workspaces)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    return NextResponse.json({ workspace: updated })
  } catch (err) {
    console.error('PATCH /api/admin/workspaces/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  try {
    await db.delete(workspaces).where(eq(workspaces.id, id))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/workspaces/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

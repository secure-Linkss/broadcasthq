import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, webhooks } from '@/lib/db'
import { eq } from 'drizzle-orm'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSuperAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { isActive } = body as { isActive: boolean }

    const [updated] = await db
      .update(webhooks)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(webhooks.id, params.id))
      .returning({ id: webhooks.id })

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin webhooks PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSuperAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [deleted] = await db.delete(webhooks).where(eq(webhooks.id, params.id)).returning({ id: webhooks.id })
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin webhooks DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, botBlocks } from '@/lib/db'
import { eq } from 'drizzle-orm'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSuperAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [deleted] = await db.delete(botBlocks).where(eq(botBlocks.id, params.id)).returning({ id: botBlocks.id })
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin bot-blocks DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

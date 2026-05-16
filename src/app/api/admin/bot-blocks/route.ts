import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, botBlocks } from '@/lib/db'
import { eq, ilike, or, and, sql, desc } from 'drizzle-orm'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') return null
  return session
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search   = searchParams.get('search') ?? ''
    const type     = searchParams.get('type') ?? ''
    const limit    = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 100)
    const offset   = parseInt(searchParams.get('offset') ?? '0', 10)

    const searchCond = search ? or(
      ilike(botBlocks.pattern, `%${search}%`),
      ilike(botBlocks.reason,  `%${search}%`),
    ) : undefined
    const typeCond = type ? eq(botBlocks.type, type) : undefined
    const where = and(searchCond, typeCond)

    const [rows, countResult] = await Promise.all([
      db.select().from(botBlocks).where(where).limit(limit).offset(offset).orderBy(desc(botBlocks.createdAt)),
      db.select({ count: sql<number>`count(*)::int` }).from(botBlocks).where(where),
    ])

    return NextResponse.json({ blocks: rows, total: countResult[0]?.count ?? 0 })
  } catch (err) {
    console.error('Admin bot-blocks GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { pattern, type, reason, isGlobal } = body as {
      pattern: string; type: string; reason?: string; isGlobal?: boolean
    }

    if (!pattern?.trim()) return NextResponse.json({ error: 'Pattern required' }, { status: 400 })
    if (!['phone', 'keyword', 'regex', 'ip'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const [created] = await db.insert(botBlocks).values({
      pattern: pattern.trim(),
      type,
      reason: reason?.trim() || null,
      isGlobal: isGlobal ?? false,
      blockedBy: (session.user as any).id ?? null,
    }).returning()

    return NextResponse.json({ block: created }, { status: 201 })
  } catch (err) {
    console.error('Admin bot-blocks POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

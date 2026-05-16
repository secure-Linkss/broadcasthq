import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, canManage } from '@/lib/session'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const members = await db
      .select({
        id:         users.id,
        email:      users.email,
        name:       users.name,
        role:       users.role,
        status:     users.status,
        lastActive: users.lastActive,
        createdAt:  users.createdAt,
      })
      .from(users)
      .where(and(eq(users.workspaceId, user.workspaceId!)))
      .orderBy(asc(users.createdAt))

    return NextResponse.json({ members })
  } catch (err) {
    console.error('GET /api/team:', err)
    return serverErrorJson()
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'editor', 'viewer']),
  name:  z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const parsed = inviteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { email, role, name } = parsed.data

    // Check if already a member of this workspace
    const [existing] = await db
      .select({ id: users.id, workspaceId: users.workspaceId })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existing?.workspaceId === user.workspaceId) {
      return NextResponse.json({ error: 'User already in this workspace' }, { status: 409 })
    }

    // Create user with temp password — they'll reset via email in production
    const tempPassword = randomBytes(16).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const [invited] = await db.insert(users).values({
      workspaceId:  user.workspaceId,
      email:        email.toLowerCase(),
      passwordHash,
      name:         name ?? email.split('@')[0],
      role,
      status:       'invited',
    }).returning({ id: users.id, email: users.email, name: users.name, role: users.role })

    return NextResponse.json({ success: true, member: invited }, { status: 201 })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }
    console.error('POST /api/team:', err)
    return serverErrorJson()
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson, badRequestJson } from '@/lib/session'
import { z } from 'zod'

const PatchSchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  username:  z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [profile] = await db.select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      username:  users.username,
      avatarUrl: users.avatarUrl,
      role:      users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, user.id)).limit(1)

    return NextResponse.json({ user: profile })
  } catch (err) {
    console.error('GET /api/profile:', err)
    return serverErrorJson()
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    // Check username uniqueness if changing
    if (parsed.data.username) {
      const [existing] = await db.select({ id: users.id }).from(users)
        .where(eq(users.username, parsed.data.username)).limit(1)
      if (existing && existing.id !== user.id) {
        return badRequestJson('Username already taken')
      }
    }

    const update: Record<string, unknown> = {}
    if (parsed.data.name !== undefined)      update.name      = parsed.data.name
    if (parsed.data.username !== undefined)  update.username  = parsed.data.username
    if (parsed.data.avatarUrl !== undefined) update.avatarUrl = parsed.data.avatarUrl

    const [updated] = await db.update(users)
      .set(update)
      .where(eq(users.id, user.id))
      .returning({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        username:  users.username,
        avatarUrl: users.avatarUrl,
        role:      users.role,
      })

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('PATCH /api/profile:', err)
    return serverErrorJson()
  }
}

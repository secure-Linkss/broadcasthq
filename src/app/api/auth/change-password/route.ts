import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getSessionUser, unauthorizedJson, serverErrorJson, badRequestJson } from '@/lib/session'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const body   = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const { currentPassword, newPassword } = parsed.data

    const [dbUser] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!dbUser?.passwordHash) return serverErrorJson('No password set')

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const newHash = await bcrypt.hash(newPassword, 12)
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, user.id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/auth/change-password:', err)
    return serverErrorJson()
  }
}

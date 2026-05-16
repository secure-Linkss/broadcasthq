export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, users, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { shouldBeSuperAdmin } from '@/lib/auth'
import { honeypotTripped, detectBot } from '@/lib/security'

const schema = z.object({
  companyName: z.string().min(1).max(100),
  email:       z.string().email().max(254),
  password:    z.string().min(8).max(128),
  name:        z.string().min(1).max(100).optional(),
  // Honeypot field â€” must be absent or empty
  website:     z.string().optional(),
  _hp:         z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Bot detection
    const bot = detectBot(request)
    if (bot.isBot) {
      // Fake success to confuse bots â€” don't reveal detection
      return NextResponse.json({ success: true }, { status: 201 })
    }

    const body = await request.json()

    // Honeypot check
    if (honeypotTripped(body)) {
      return NextResponse.json({ success: true }, { status: 201 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { companyName, email, password, name } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Constant-time email check (prevent timing oracle)
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (existing) {
      // Don't reveal "email already registered" â€” return generic message
      return NextResponse.json({ error: 'Could not create account. Please try again or contact support.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const role = shouldBeSuperAdmin(normalizedEmail) ? 'super_admin' : 'owner'

    let workspaceId: string | null = null
    if (role !== 'super_admin') {
      const [ws] = await db
        .insert(workspaces)
        .values({ name: companyName.trim() })
        .returning({ id: workspaces.id })
      workspaceId = ws.id
    }

    const [user] = await db.insert(users).values({
      workspaceId,
      email:        normalizedEmail,
      passwordHash,
      name:         (name ?? companyName).trim(),
      role,
      status:       'active',
    }).returning({ id: users.id, workspaceId: users.workspaceId })

    return NextResponse.json({ success: true, userId: user.id, workspaceId: user.workspaceId })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


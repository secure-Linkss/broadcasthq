export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET env var is required')
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json() as { token?: string; password?: string }

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    let payload: { userId: string; type: string }
    try {
      const result = await jwtVerify(token, SECRET)
      payload = result.payload as { userId: string; type: string }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    if (payload.type !== 'password_reset') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 12)

    const [updated] = await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, payload.userId))
      .returning({ id: users.id })

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


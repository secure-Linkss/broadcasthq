export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET env var is required')
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email?: string }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))

    if (user && user.status !== 'suspended') {
      const token = await new SignJWT({ userId: user.id, email: user.email, type: 'password_reset' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(SECRET)

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`

      // TODO: send via email (Resend/SendGrid/SES) — do NOT log the URL in production
      // The reset URL contains a bearer credential valid for 1 hour.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV ONLY] Password reset link for ${user.email}: ${resetUrl}`)
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


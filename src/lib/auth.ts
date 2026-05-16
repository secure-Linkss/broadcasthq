import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db, users } from '@/lib/db'
import { eq, or } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { recordLoginAttempt, isLoginLocked } from '@/lib/security'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

declare module 'next-auth' {
  interface User {
    role: string
    workspaceId: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      workspaceId: string | null
    }
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 }, // 24h session
  secret:  process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email or Username', type: 'text' },
        password: { label: 'Password',          type: 'password' },
        ip:       { label: 'IP',                type: 'text' },
      },
      authorize: async (credentials) => {
        const parsed = z.object({
          email:    z.string().min(1).max(254),  // accepts email OR username
          password: z.string().min(1),
          ip:       z.string().optional(),
        }).safeParse(credentials)

        if (!parsed.success) return null

        const { email: emailOrUsername, password, ip } = parsed.data
        const normalized = emailOrUsername.toLowerCase().trim()

        // Per-identifier lockout check
        const emailKey = `email:${normalized}`
        const ipKey    = `ip:${ip ?? 'unknown'}`

        const emailLock = isLoginLocked(emailKey)
        const ipLock    = isLoginLocked(ipKey)

        if (emailLock.locked || ipLock.locked) {
          const remainingMin = Math.ceil(Math.max(emailLock.remainingMs, ipLock.remainingMs) / 60000)
          throw new Error(`Account temporarily locked. Try again in ${remainingMin} minute(s).`)
        }

        // Look up by email OR username
        const isEmail = normalized.includes('@')
        const [user] = await db
          .select()
          .from(users)
          .where(isEmail
            ? eq(users.email, normalized)
            : or(eq(users.username, normalized), eq(users.email, normalized))
          )
          .limit(1)

        // Always hash-compare to prevent timing oracle
        const dummyHash = '$2b$12$dummy.hash.for.timing.safety.padding.1234567890'
        const hashToCheck = user?.passwordHash ?? dummyHash

        const valid = user
          ? await bcrypt.compare(password, hashToCheck)
          : (await bcrypt.compare(password, dummyHash), false)

        if (!user || !valid) {
          // Record failed attempt for both email + IP
          recordLoginAttempt(emailKey, false)
          recordLoginAttempt(ipKey, false)
          return null
        }

        if (user.status === 'suspended') {
          throw new Error('Your account has been suspended. Contact support.')
        }

        if (user.status === 'invited') {
          // First login activates invited account
          await db.update(users).set({ status: 'active', lastActive: new Date() }).where(eq(users.id, user.id))
        } else {
          // Clear lockout on success
          recordLoginAttempt(emailKey, true)
          recordLoginAttempt(ipKey, true)
          await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id))
        }

        return {
          id:          user.id,
          email:       user.email,
          name:        user.name ?? user.email.split('@')[0],
          role:        user.role,
          workspaceId: user.workspaceId,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id          = user.id as string
        token.role        = user.role
        token.workspaceId = user.workspaceId
      }
      return token
    },
    session({ session, token }) {
      session.user.id          = token.id          as string
      session.user.role        = token.role        as string
      session.user.workspaceId = token.workspaceId as string | null
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },
})

export { auth as getServerAuth }

export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin'
}

export function shouldBeSuperAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

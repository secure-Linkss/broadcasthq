import { auth } from '@/lib/auth'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'
import { detectBot, CSP_HEADER, fingerprintRequest, isLoginLocked } from '@/lib/security-edge'

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control':      'off',
  'X-Frame-Options':             'SAMEORIGIN',
  'X-Content-Type-Options':      'nosniff',
  'X-XSS-Protection':            '1; mode=block',
  'Referrer-Policy':             'strict-origin-when-cross-origin',
  'Permissions-Policy':          'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  'Strict-Transport-Security':   'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy':     CSP_HEADER,
  'Cross-Origin-Opener-Policy':  'same-origin',
  'Cross-Origin-Embedder-Policy':'require-corp',
  'Cross-Origin-Resource-Policy':'same-origin',
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v)
  }
  return response
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  )
}

function json429(message: string, rl?: ReturnType<typeof rateLimit>): NextResponse {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (rl) Object.assign(headers, getRateLimitHeaders(rl))
  return new NextResponse(JSON.stringify({ error: message }), { status: 429, headers })
}

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl
  const session = (req as any).auth
  const ip      = getClientIp(req)

  // ── CORS preflight for /api/v1/* ──────────────────────────────────────────
  if (pathname.startsWith('/api/v1') && req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-ID',
        'Access-Control-Max-Age':       '86400',
        'Vary':                         'Origin',
      },
    })
  }

  // ── Bot detection on auth & signup routes ────────────────────────────────
  if (
    req.method === 'POST' &&
    (pathname.startsWith('/api/auth') || pathname === '/api/auth/register')
  ) {
    const bot = detectBot(req)
    if (bot.isBot) {
      return applySecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    }
  }

  // ── Login lockout check ───────────────────────────────────────────────────
  if (req.method === 'POST' && pathname.includes('/api/auth/callback/credentials')) {
    const lockCheck = isLoginLocked(`lockout:${ip}`)
    if (lockCheck.locked) {
      return applySecurityHeaders(
        new NextResponse(JSON.stringify({
          error: `Too many failed logins. Try again in ${Math.ceil(lockCheck.remainingMs / 60000)} minute(s).`,
        }), { status: 429, headers: { 'Content-Type': 'application/json' } })
      )
    }
  }

  // ── Rate limiting — v1 API ────────────────────────────────────────────────
  if (pathname.startsWith('/api/v1')) {
    const rl = rateLimit(`v1:${req.headers.get('authorization') ?? ip}`, RATE_LIMITS.v1)
    if (!rl.success) {
      return applySecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'Content-Type':             'application/json',
            'Access-Control-Allow-Origin': '*',
            ...getRateLimitHeaders(rl),
          },
        })
      )
    }
  }

  // ── Rate limiting — auth endpoints ────────────────────────────────────────
  if (pathname.startsWith('/api/auth') || pathname === '/api/auth/register') {
    const rl = rateLimit(`auth:${ip}`, RATE_LIMITS.auth)
    if (!rl.success) {
      return applySecurityHeaders(json429('Too many requests. Slow down.', rl))
    }
  }

  // ── Rate limiting — signup ────────────────────────────────────────────────
  if (pathname === '/signup' || pathname === '/api/auth/register') {
    const rl = rateLimit(`signup:${ip}`, RATE_LIMITS.signup)
    if (!rl.success) {
      return applySecurityHeaders(json429('Too many signup attempts. Try again in an hour.', rl))
    }
  }

  // ── Rate limiting — general API ───────────────────────────────────────────
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth') &&
    !pathname.startsWith('/api/v1') &&
    !pathname.startsWith('/api/webhooks')
  ) {
    const key = session?.user?.id ? `api:${session.user.id}` : `api:${ip}`
    const rl  = rateLimit(key, RATE_LIMITS.api)
    if (!rl.success) {
      return applySecurityHeaders(json429('Rate limit exceeded', rl))
    }
  }

  // ── Admin routes — super_admin only ──────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!session) {
      // API routes: return 401 JSON (not redirect)
      if (pathname.startsWith('/api/admin')) {
        return applySecurityHeaders(
          new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('callbackUrl', pathname)
      return applySecurityHeaders(NextResponse.redirect(url))
    }
    if (session.user?.role !== 'super_admin') {
      // API routes: return 403 JSON
      if (pathname.startsWith('/api/admin')) {
        return applySecurityHeaders(
          new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  // ── Dashboard routes — authenticated ─────────────────────────────────────
  const dashboardPaths = [
    '/dashboard', '/campaigns', '/contacts', '/templates',
    '/analytics', '/inbox', '/team', '/billing', '/settings', '/help',
  ]
  const isDashboard = dashboardPaths.some(p => pathname.startsWith(p))

  if (isDashboard && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', pathname)
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // ── Role enforcement — viewer cannot access billing/team/settings write ops
  if (isDashboard && session?.user?.role === 'viewer') {
    const restricted = ['/billing', '/team', '/settings']
    if (restricted.some(p => pathname.startsWith(p))) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  // ── Already authenticated — redirect away from auth pages ────────────────
  if ((pathname === '/login' || pathname === '/signup') && session) {
    const url = req.nextUrl.clone()
    url.pathname = session.user?.role === 'super_admin' ? '/admin/dashboard' : '/dashboard'
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // ── CORS response headers for v1 API ─────────────────────────────────────
  const response = NextResponse.next()
  if (pathname.startsWith('/api/v1')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.headers.set('Vary', 'Origin')
  }

  // Add fingerprint header for internal tracing (not exposed to client)
  response.headers.set('X-Request-Fingerprint', fingerprintRequest(req))

  return applySecurityHeaders(response)
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}

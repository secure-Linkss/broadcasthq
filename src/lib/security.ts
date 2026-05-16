import { createHash, timingSafeEqual, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'

// ── Login attempt lockout ─────────────────────────────────────────────────────
// Per-IP and per-email tracking with exponential backoff

interface LockoutEntry {
  attempts:   number
  lockedUntil: number | null
  lastAttempt: number
}

const loginAttempts = new Map<string, LockoutEntry>()

const MAX_ATTEMPTS    = 5     // lock after 5 failures
const LOCKOUT_BASE_MS = 60_000  // 1 min base
const LOCKOUT_MAX_MS  = 3_600_000 // 1 hour max

export function recordLoginAttempt(key: string, success: boolean): {
  allowed: boolean
  remainingMs: number
  attemptsLeft: number
} {
  const now = Date.now()
  const entry = loginAttempts.get(key) ?? { attempts: 0, lockedUntil: null, lastAttempt: 0 }

  // Check lockout
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remainingMs: entry.lockedUntil - now, attemptsLeft: 0 }
  }

  if (success) {
    loginAttempts.delete(key)
    return { allowed: true, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS }
  }

  // Reset if last attempt was >1h ago
  if (now - entry.lastAttempt > 3_600_000) {
    entry.attempts = 0
    entry.lockedUntil = null
  }

  entry.attempts++
  entry.lastAttempt = now

  if (entry.attempts >= MAX_ATTEMPTS) {
    const multiplier = Math.min(Math.pow(2, entry.attempts - MAX_ATTEMPTS), 64)
    const lockMs = Math.min(LOCKOUT_BASE_MS * multiplier, LOCKOUT_MAX_MS)
    entry.lockedUntil = now + lockMs
    loginAttempts.set(key, entry)
    return { allowed: false, remainingMs: lockMs, attemptsLeft: 0 }
  }

  loginAttempts.set(key, entry)
  return {
    allowed:      true,
    remainingMs:  0,
    attemptsLeft: MAX_ATTEMPTS - entry.attempts,
  }
}

export function isLoginLocked(key: string): { locked: boolean; remainingMs: number } {
  const now   = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry?.lockedUntil || now >= entry.lockedUntil) {
    return { locked: false, remainingMs: 0 }
  }
  return { locked: true, remainingMs: entry.lockedUntil - now }
}

// Cleanup old entries periodically (runs on first call per server lifecycle)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of loginAttempts.entries()) {
    if (now - entry.lastAttempt > 7_200_000) loginAttempts.delete(key)
  }
}, 300_000)


// ── CSRF token system ─────────────────────────────────────────────────────────
// Double-submit cookie pattern (stateless, no server storage)

const CSRF_SECRET = process.env.NEXTAUTH_SECRET ?? 'default-csrf-secret'

export function generateCsrfToken(): string {
  const random = randomBytes(32).toString('hex')
  const hash   = createHash('sha256').update(`${random}:${CSRF_SECRET}`).digest('hex')
  return `${random}.${hash}`
}

export function validateCsrfToken(token: string): boolean {
  if (!token || !token.includes('.')) return false
  const [random, hash] = token.split('.')
  if (!random || !hash) return false
  const expected = createHash('sha256').update(`${random}:${CSRF_SECRET}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}


// ── Bot/automation detection ──────────────────────────────────────────────────
// Checks request headers and patterns for automated clients

export interface BotCheckResult {
  isBot:    boolean
  reason:   string | null
  score:    number  // 0 = human, 10 = definitely bot
}

export function detectBot(req: NextRequest): BotCheckResult {
  let score = 0
  const reasons: string[] = []

  const ua = req.headers.get('user-agent') ?? ''

  // Known bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i,
    /wget/i, /python-requests/i, /java\//i, /go-http-client/i,
    /axios/i, /node-fetch/i, /puppeteer/i, /playwright/i,
    /selenium/i, /phantomjs/i, /headless/i,
  ]

  if (botPatterns.some(p => p.test(ua))) {
    score += 8
    reasons.push('bot_ua')
  }

  // Missing common browser headers
  if (!req.headers.get('accept-language')) {
    score += 2
    reasons.push('no_accept_language')
  }

  if (!req.headers.get('accept-encoding')) {
    score += 1
    reasons.push('no_accept_encoding')
  }

  // No DNT or Sec-Fetch headers (browsers send these)
  const secFetch = req.headers.get('sec-fetch-site')
  const referer  = req.headers.get('referer')

  // Empty UA is almost always a bot
  if (!ua) {
    score += 9
    reasons.push('empty_ua')
  }

  // Suspicious: no referer on form submissions
  const isFormPost = req.method === 'POST' && (
    req.nextUrl.pathname.includes('/auth') ||
    req.nextUrl.pathname.includes('/register')
  )
  if (isFormPost && !referer && !secFetch) {
    score += 3
    reasons.push('no_referer_on_post')
  }

  return {
    isBot:  score >= 7,
    reason: reasons.length > 0 ? reasons.join(',') : null,
    score,
  }
}


// ── Request fingerprinting ────────────────────────────────────────────────────
// Creates a lightweight fingerprint of the request for anomaly detection

export function fingerprintRequest(req: NextRequest): string {
  const components = [
    req.headers.get('user-agent') ?? '',
    req.headers.get('accept-language') ?? '',
    req.headers.get('accept-encoding') ?? '',
    req.headers.get('accept') ?? '',
    req.headers.get('sec-ch-ua') ?? '',
    req.headers.get('sec-ch-ua-platform') ?? '',
  ].join('|')

  return createHash('sha256').update(components).digest('hex').slice(0, 16)
}


// ── Content Security Policy ───────────────────────────────────────────────────
export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://api.stripe.com https://graph.facebook.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')


// ── Honeypot field validation ─────────────────────────────────────────────────
// Forms include a hidden field; bots fill it, humans don't

export function honeypotTripped(body: Record<string, unknown>): boolean {
  // The hidden field is named 'website' (common honeypot name)
  const val = body.website ?? body._hp ?? body.url ?? body.phone2
  return val !== undefined && val !== '' && val !== null
}


// ── IP reputation check (basic) ───────────────────────────────────────────────
// Checks against known bad IP ranges / Tor exit patterns

const SUSPICIOUS_IP_RANGES = [
  /^0\./, /^127\./, /^169\.254\./,
]

export function isSuspiciousIp(ip: string): boolean {
  return SUSPICIOUS_IP_RANGES.some(r => r.test(ip))
}

import { NextRequest } from 'next/server'

// ── Login attempt lockout ─────────────────────────────────────────────────────
interface LockoutEntry {
  attempts:    number
  lockedUntil: number | null
  lastAttempt: number
}

const loginAttempts = new Map<string, LockoutEntry>()

const MAX_ATTEMPTS    = 5
const LOCKOUT_BASE_MS = 60_000
const LOCKOUT_MAX_MS  = 3_600_000

export function recordLoginAttempt(key: string, success: boolean): {
  allowed: boolean; remainingMs: number; attemptsLeft: number
} {
  const now   = Date.now()
  const entry = loginAttempts.get(key) ?? { attempts: 0, lockedUntil: null, lastAttempt: 0 }

  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remainingMs: entry.lockedUntil - now, attemptsLeft: 0 }
  }
  if (success) {
    loginAttempts.delete(key)
    return { allowed: true, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS }
  }
  if (now - entry.lastAttempt > 3_600_000) { entry.attempts = 0; entry.lockedUntil = null }

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
  return { allowed: true, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS - entry.attempts }
}

export function isLoginLocked(key: string): { locked: boolean; remainingMs: number } {
  const now   = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry?.lockedUntil || now >= entry.lockedUntil) return { locked: false, remainingMs: 0 }
  return { locked: true, remainingMs: entry.lockedUntil - now }
}

// ── Bot/automation detection ──────────────────────────────────────────────────
export interface BotCheckResult {
  isBot:  boolean
  reason: string | null
  score:  number
}

export function detectBot(req: NextRequest): BotCheckResult {
  let score = 0
  const reasons: string[] = []
  const ua = req.headers.get('user-agent') ?? ''

  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i,
    /wget/i, /python-requests/i, /java\//i, /go-http-client/i,
    /axios/i, /node-fetch/i, /puppeteer/i, /playwright/i,
    /selenium/i, /phantomjs/i, /headless/i,
  ]
  if (botPatterns.some(p => p.test(ua))) { score += 8; reasons.push('bot_ua') }
  if (!req.headers.get('accept-language'))  { score += 2; reasons.push('no_accept_language') }
  if (!req.headers.get('accept-encoding'))  { score += 1; reasons.push('no_accept_encoding') }
  if (!ua) { score += 9; reasons.push('empty_ua') }

  const secFetch = req.headers.get('sec-fetch-site')
  const referer  = req.headers.get('referer')
  const isFormPost = req.method === 'POST' && (
    req.nextUrl.pathname.includes('/auth') || req.nextUrl.pathname.includes('/register')
  )
  if (isFormPost && !referer && !secFetch) { score += 3; reasons.push('no_referer_on_post') }

  return { isBot: score >= 7, reason: reasons.length > 0 ? reasons.join(',') : null, score }
}

// ── Request fingerprinting (FNV-1a — Edge-compatible, no Node.js crypto) ─────
export function fingerprintRequest(req: NextRequest): string {
  const components = [
    req.headers.get('user-agent') ?? '',
    req.headers.get('accept-language') ?? '',
    req.headers.get('accept-encoding') ?? '',
    req.headers.get('accept') ?? '',
    req.headers.get('sec-ch-ua') ?? '',
    req.headers.get('sec-ch-ua-platform') ?? '',
  ].join('|')

  let hash = 2166136261
  for (let i = 0; i < components.length; i++) {
    hash ^= components.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
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
export function honeypotTripped(body: Record<string, unknown>): boolean {
  const val = body.website ?? body._hp ?? body.url ?? body.phone2
  return val !== undefined && val !== ''
}

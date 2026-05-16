// Sliding-window rate limiter (in-memory, single-instance safe)
// For multi-instance deployments, replace with Upstash Redis

interface Window {
  timestamps: number[]
  resetAt: number
}

const store = new Map<string, Window>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, w] of store.entries()) {
    if (w.resetAt < now) store.delete(key)
  }
}

export interface RateLimitResult {
  success:   boolean
  limit:     number
  remaining: number
  reset:     number    // Unix timestamp seconds
}

export function rateLimit(
  key: string,
  { windowMs, max }: { windowMs: number; max: number }
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const windowStart = now - windowMs

  const current = store.get(key) ?? { timestamps: [], resetAt: now + windowMs }
  const recent  = current.timestamps.filter(t => t > windowStart)
  recent.push(now)

  store.set(key, { timestamps: recent, resetAt: now + windowMs })

  const remaining = Math.max(0, max - recent.length)
  const oldestInWindow = recent[0] ?? now
  const reset = Math.ceil((oldestInWindow + windowMs) / 1000)

  return { success: recent.length <= max, limit: max, remaining, reset }
}

// Pre-configured limiters
export const RATE_LIMITS = {
  auth:     { windowMs: 60_000,  max: 10  },   // 10/min per IP on auth routes
  api:      { windowMs: 60_000,  max: 100 },   // 100/min per user on API routes
  v1:       { windowMs: 60_000,  max: 60  },   // 60/min per API key on v1 routes
  signup:   { windowMs: 3_600_000, max: 5 },   // 5/hour per IP on signup
  password: { windowMs: 3_600_000, max: 5 },   // 5/hour per IP on password reset
} as const

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.reset),
    ...(result.success ? {} : { 'Retry-After': String(result.reset - Math.floor(Date.now() / 1000)) }),
  }
}

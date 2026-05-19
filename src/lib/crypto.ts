import { createHmac, randomBytes, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto'

const KEY_PREFIX = 'bhq_live_'

export interface GeneratedKey {
  key: string
  prefix: string
  hash: string
}

function getHmacSecret(): string {
  // Use dedicated HMAC secret if set, otherwise fall back to NEXTAUTH_SECRET
  return process.env.API_KEY_HMAC_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'change-this-key'
}

export function generateApiKey(): GeneratedKey {
  const random = randomBytes(32).toString('hex') // 256 bits
  const key    = `${KEY_PREFIX}${random}`
  const prefix = `${KEY_PREFIX}${random.slice(0, 8)}...`
  const hash   = hashApiKey(key)
  return { key, prefix, hash }
}

export function hashApiKey(key: string): string {
  // HMAC-SHA256 prevents offline cracking even after a DB breach
  return createHmac('sha256', getHmacSecret()).update(key).digest('hex')
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return cryptoTimingSafeEqual(bufA, bufB)
}

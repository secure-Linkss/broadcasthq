import { createHash, randomBytes } from 'crypto'

const KEY_PREFIX = 'bhq_live_'

export interface GeneratedKey {
  key: string
  prefix: string
  hash: string
}

export function generateApiKey(): GeneratedKey {
  const random = randomBytes(32).toString('hex') // 64 hex chars
  const key = `${KEY_PREFIX}${random}`
  const prefix = `${KEY_PREFIX}${random.slice(0, 8)}...`
  const hash = hashApiKey(key)
  return { key, prefix, hash }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return require('crypto').timingSafeEqual(bufA, bufB)
}

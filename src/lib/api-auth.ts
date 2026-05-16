import { NextRequest } from 'next/server'
import { db, apiKeys } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { hashApiKey } from '@/lib/crypto'

export interface ApiAuthResult {
  workspaceId: string
  keyId:       string
  permissions: Record<string, string[]>
}

export async function authenticateApiKey(request: NextRequest): Promise<ApiAuthResult | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const key = authHeader.slice(7).trim()
  if (!key.startsWith('bhq_live_')) return null

  const hash = hashApiKey(key)

  const [row] = await db.select({
    id:          apiKeys.id,
    workspaceId: apiKeys.workspaceId,
    permissions: apiKeys.permissions,
    isActive:    apiKeys.isActive,
    expiresAt:   apiKeys.expiresAt,
  }).from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1)

  if (!row || !row.isActive) return null
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null

  // Touch lastUsedAt asynchronously
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id)).then(() => {})

  return {
    workspaceId: row.workspaceId!,
    keyId:       row.id,
    permissions: row.permissions as Record<string, string[]>,
  }
}

export function hasPermission(auth: ApiAuthResult, resource: string, action: string): boolean {
  const allowed = auth.permissions[resource]
  return Array.isArray(allowed) && allowed.includes(action)
}

export function unauthorizedResponse(message = 'Invalid or missing API key') {
  return Response.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Insufficient permissions') {
  return Response.json({ error: message }, { status: 403 })
}

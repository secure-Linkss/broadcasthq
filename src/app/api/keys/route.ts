export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, apiKeys } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { generateApiKey } from '@/lib/crypto'
import { getSessionUser, unauthorizedJson, forbiddenJson, badRequestJson, serverErrorJson, canManage } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const keys = await db.select({
      id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix,
      permissions: apiKeys.permissions, isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt,
    }).from(apiKeys)
      .where(eq(apiKeys.workspaceId, user.workspaceId))
      .orderBy(desc(apiKeys.createdAt))

    return NextResponse.json({ keys })
  } catch (err) {
    console.error('GET /api/keys:', err)
    return serverErrorJson()
  }
}

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  expiresAt:   z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const { name, permissions, expiresAt } = parsed.data
    const { key, prefix, hash } = generateApiKey()

    const [created] = await db.insert(apiKeys).values({
      workspaceId: user.workspaceId,
      name,
      keyPrefix:   prefix,
      keyHash:     hash,
      permissions: permissions ?? { campaigns: ['read','run'], contacts: ['read','write'], messages: ['read'], analytics: ['read'] },
      isActive:    true,
      expiresAt:   expiresAt ? new Date(expiresAt) : null,
      createdBy:   user.id,
    }).returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, permissions: apiKeys.permissions, isActive: apiKeys.isActive, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt })

    return NextResponse.json({
      key:     created,
      secret:  key,
      warning: 'Store this key securely. It will not be shown again.',
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/keys:', err)
    return serverErrorJson()
  }
}


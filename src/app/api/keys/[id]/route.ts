export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, apiKeys } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, canManage } from '@/lib/session'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name:        z.string().min(1).optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  isActive:    z.boolean().optional(),
  expiresAt:   z.string().datetime().nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  const { id } = await params

  try {
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.name        !== undefined) updates.name        = parsed.data.name
    if (parsed.data.permissions !== undefined) updates.permissions = parsed.data.permissions
    if (parsed.data.isActive    !== undefined) updates.isActive    = parsed.data.isActive
    if (parsed.data.expiresAt   !== undefined) updates.expiresAt   = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null

    const [updated] = await db.update(apiKeys)
      .set(updates)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, user.workspaceId!)))
      .returning({
        id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions, isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt,
      })

    if (!updated) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    return NextResponse.json({ key: updated })
  } catch (err) {
    console.error('PATCH /api/keys/[id]:', err)
    return serverErrorJson()
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  const { id } = await params

  try {
    await db.delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, user.workspaceId!)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/keys/[id]:', err)
    return serverErrorJson()
  }
}

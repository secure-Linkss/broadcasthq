export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, notFoundJson, serverErrorJson, badRequestJson, canManage } from '@/lib/session'
import { z } from 'zod'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [ws] = await db
      .select({ id: workspaces.id, name: workspaces.name, planId: workspaces.planId, createdAt: workspaces.createdAt })
      .from(workspaces)
      .where(eq(workspaces.id, user.workspaceId))
      .limit(1)

    if (!ws) return notFoundJson('Workspace')
    return NextResponse.json(ws)
  } catch (err) {
    console.error('GET /api/settings/workspace:', err)
    return serverErrorJson()
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const [updated] = await db
      .update(workspaces)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(workspaces.id, user.workspaceId))
      .returning({ id: workspaces.id, name: workspaces.name })

    if (!updated) return notFoundJson('Workspace')
    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/settings/workspace:', err)
    return serverErrorJson()
  }
}


export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return NextResponse.json({ workspace: null })

  try {
    const [ws] = await db
      .select({ id: workspaces.id, name: workspaces.name, avatarUrl: workspaces.avatarUrl, planId: workspaces.planId })
      .from(workspaces)
      .where(eq(workspaces.id, user.workspaceId))
      .limit(1)

    return NextResponse.json({ workspace: ws ?? null })
  } catch (err) {
    console.error('GET /api/workspace:', err)
    return serverErrorJson()
  }
}

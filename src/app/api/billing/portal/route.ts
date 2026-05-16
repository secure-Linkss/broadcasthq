export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { createPortalSession } from '@/lib/stripe'
import { getSessionUser, unauthorizedJson, badRequestJson, serverErrorJson } from '@/lib/session'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [workspace] = await db.select({
      stripeCustomerId: workspaces.stripeCustomerId,
    }).from(workspaces).where(eq(workspaces.id, user.workspaceId)).limit(1)

    if (!workspace?.stripeCustomerId) {
      return badRequestJson('No billing account found. Please subscribe to a plan first.')
    }

    const session = await createPortalSession(workspace.stripeCustomerId)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('POST /api/billing/portal:', err)
    return serverErrorJson()
  }
}


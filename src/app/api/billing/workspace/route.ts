export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [ws] = await db
      .select({
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        stripeCustomerId:   workspaces.stripeCustomerId,
        billingPeriodEnd:   workspaces.billingPeriodEnd,
      })
      .from(workspaces)
      .where(eq(workspaces.id, user.workspaceId!))
      .limit(1)

    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    return NextResponse.json(ws)
  } catch (err) {
    console.error('GET /api/billing/workspace:', err)
    return serverErrorJson()
  }
}


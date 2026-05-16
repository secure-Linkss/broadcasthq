import { NextRequest, NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { createCheckoutSession, STRIPE_PLANS } from '@/lib/stripe'
import { getSessionUser, unauthorizedJson, badRequestJson, forbiddenJson, serverErrorJson } from '@/lib/session'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const { planId } = await request.json()
    if (!planId) return badRequestJson('planId is required')

    const plan = STRIPE_PLANS.find(p => p.id === planId)
    if (!plan || !plan.priceId) {
      return badRequestJson('Invalid plan or plan has no price configured. Set STRIPE_*_PRICE_ID env vars.')
    }

    const [workspace] = await db
      .select({ stripeCustomerId: workspaces.stripeCustomerId })
      .from(workspaces)
      .where(eq(workspaces.id, user.workspaceId))
      .limit(1)

    const session = await createCheckoutSession(
      user.workspaceId,
      user.id,
      user.email,
      plan.priceId,
      workspace?.stripeCustomerId ?? undefined
    )

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('POST /api/billing/checkout:', err)
    return serverErrorJson()
  }
}

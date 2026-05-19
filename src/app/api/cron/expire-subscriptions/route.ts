export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { sql, and, lte, ne, eq } from 'drizzle-orm'

// Runs daily — finds past_due/expired subscriptions and downgrades to free
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  try {
    // Downgrade workspaces where billingPeriodEnd has passed AND status is past_due/canceled
    const expired = await db.select({
      id:     workspaces.id,
      name:   workspaces.name,
      planId: workspaces.planId,
    }).from(workspaces)
      .where(
        and(
          sql`subscription_status in ('past_due', 'canceled')`,
          ne(workspaces.planId, 'free'),
          // billingPeriodEnd is in the past, or null (no billing end set = already expired)
          sql`(billing_period_end IS NULL OR billing_period_end < ${now})`
        )
      )

    if (expired.length > 0) {
      const ids = expired.map(w => w.id)
      await db.update(workspaces)
        .set({
          planId:    'free',
          updatedAt: new Date(),
        })
        .where(sql`id = ANY(${ids})`)

      console.log(`[expire-subscriptions] Downgraded ${expired.length} workspaces to free:`, ids)
    }

    // Also warn workspaces expiring within 7 days (log for now — can email later)
    const expiringSoon = await db.select({
      id:   workspaces.id,
      name: workspaces.name,
    }).from(workspaces)
      .where(
        and(
          eq(workspaces.subscriptionStatus, 'active'),
          ne(workspaces.planId, 'free'),
          sql`billing_period_end BETWEEN ${now} AND ${new Date(now.getTime() + 7 * 86_400_000)}`
        )
      )

    if (expiringSoon.length > 0) {
      console.log(`[expire-subscriptions] ${expiringSoon.length} workspaces expiring within 7 days:`, expiringSoon.map(w => w.name))
    }

    return NextResponse.json({
      downgraded:    expired.length,
      expiringSoon:  expiringSoon.length,
      processedAt:   now.toISOString(),
    })
  } catch (err) {
    console.error('[expire-subscriptions] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

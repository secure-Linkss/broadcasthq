export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { sql, gte, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const PLAN_PRICES: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 }

// Monthly MRR snapshots derived from current workspace data
// In production this would be a time-series table populated by Stripe webhooks
function buildMonthlyTrend(allWorkspaces: { planId: string; subscriptionStatus: string | null; createdAt: Date }[]) {
  const months: { month: string; mrr: number; newPaid: number; churn: number }[] = []
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })

    // Count workspaces that existed and were on paid plans by this month
    const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0) // end of month
    const active = allWorkspaces.filter(w =>
      new Date(w.createdAt) <= cutoff &&
      w.planId !== 'free' &&
      w.subscriptionStatus === 'active'
    )
    const mrr = active.reduce((s, w) => s + (PLAN_PRICES[w.planId] ?? 0), 0)

    // New paid this month
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const newPaid = allWorkspaces.filter(w => {
      const c = new Date(w.createdAt)
      return c >= monthStart && c <= cutoff && w.planId !== 'free'
    }).length

    months.push({ month: label, mrr, newPaid, churn: 0 })
  }

  return months
}

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const since30d  = new Date(Date.now() - 30  * 86_400_000)
    const since90d  = new Date(Date.now() - 90  * 86_400_000)
    const sinceYear = new Date(Date.now() - 365 * 86_400_000)

    const [allWorkspaces, planBreakdown, recentPaidSubs, canceledSubs, trialSubs, topRevenue] = await Promise.all([
      // All workspaces for trend calculation
      db.select({
        id:                 workspaces.id,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        stripeCustomerId:   workspaces.stripeCustomerId,
        createdAt:          workspaces.createdAt,
      }).from(workspaces).orderBy(workspaces.createdAt),

      // Plan distribution
      db.select({
        planId:  workspaces.planId,
        total:   sql<number>`count(*)::int`,
        active:  sql<number>`sum(case when subscription_status = 'active' then 1 else 0 end)::int`,
        trialing: sql<number>`sum(case when subscription_status = 'trialing' then 1 else 0 end)::int`,
      }).from(workspaces).groupBy(workspaces.planId).orderBy(workspaces.planId),

      // Recently created paid subscriptions (last 30d)
      db.select({
        id:                 workspaces.id,
        name:               workspaces.name,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        stripeCustomerId:   workspaces.stripeCustomerId,
        createdAt:          workspaces.createdAt,
      }).from(workspaces)
        .where(sql`plan_id != 'free' and created_at >= ${since30d}`)
        .orderBy(desc(workspaces.createdAt))
        .limit(20),

      // Canceled subs
      db.select({
        id:                 workspaces.id,
        name:               workspaces.name,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        createdAt:          workspaces.createdAt,
      }).from(workspaces)
        .where(sql`subscription_status in ('canceled', 'past_due')`)
        .orderBy(desc(workspaces.createdAt))
        .limit(20),

      // Trialing
      db.select({
        id:                 workspaces.id,
        name:               workspaces.name,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        createdAt:          workspaces.createdAt,
      }).from(workspaces)
        .where(sql`subscription_status = 'trialing'`)
        .orderBy(desc(workspaces.createdAt))
        .limit(10),

      // Top revenue workspaces (enterprise + pro, active)
      db.select({
        id:                 workspaces.id,
        name:               workspaces.name,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        stripeCustomerId:   workspaces.stripeCustomerId,
        createdAt:          workspaces.createdAt,
      }).from(workspaces)
        .where(sql`plan_id in ('enterprise', 'pro') and subscription_status = 'active'`)
        .orderBy(desc(workspaces.createdAt))
        .limit(20),
    ])

    // Compute aggregate stats
    const activePaid = planBreakdown
      .filter(p => p.planId !== 'free')
      .reduce((s, p) => s + (p.active ?? 0), 0)

    const mrr = planBreakdown.reduce((s, p) => s + (PLAN_PRICES[p.planId] ?? 0) * (p.active ?? 0), 0)
    const arr = mrr * 12

    const totalActive = planBreakdown.reduce((s, p) => s + (p.active ?? 0), 0)
    const conversionRate = totalActive > 0 ? Math.round((activePaid / totalActive) * 100) : 0

    const avgRevPerWorkspace = activePaid > 0 ? Math.round(mrr / activePaid) : 0

    // Monthly trend
    const monthlyTrend = buildMonthlyTrend(allWorkspaces.map(w => ({
      planId:             w.planId,
      subscriptionStatus: w.subscriptionStatus,
      createdAt:          w.createdAt,
    })))

    // Revenue by plan
    const revenueByPlan = planBreakdown.map(p => ({
      planId:   p.planId,
      total:    p.total,
      active:   p.active ?? 0,
      trialing: p.trialing ?? 0,
      mrr:      (PLAN_PRICES[p.planId] ?? 0) * (p.active ?? 0),
      price:    PLAN_PRICES[p.planId] ?? 0,
    }))

    // Subscription health
    const totalWorkspaces = allWorkspaces.length
    const freeCount = planBreakdown.find(p => p.planId === 'free')?.total ?? 0
    const churnCount = canceledSubs.length
    const churnRate = totalWorkspaces > 0 ? Math.round((churnCount / totalWorkspaces) * 100) : 0

    // Payment events (simulated from workspace status changes since we don't have a payments table)
    // In production: pull from Stripe invoices API
    const paymentEvents = recentPaidSubs.map(ws => ({
      id:          ws.id,
      workspaceId: ws.id,
      name:        ws.name,
      planId:      ws.planId,
      amount:      PLAN_PRICES[ws.planId] ?? 0,
      status:      ws.subscriptionStatus === 'active' ? 'paid' : ws.subscriptionStatus ?? 'unknown',
      date:        ws.createdAt,
      stripeCustomerId: ws.stripeCustomerId,
    }))

    return NextResponse.json({
      summary: {
        mrr,
        arr,
        activePaid,
        conversionRate,
        avgRevPerWorkspace,
        churnRate,
        churnCount,
        totalWorkspaces,
        freeCount,
        trialCount: trialSubs.length,
      },
      monthlyTrend,
      revenueByPlan,
      paymentEvents,
      canceledSubs,
      trialSubs,
      topRevenue,
    })
  } catch (err) {
    console.error('GET /api/admin/revenue:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

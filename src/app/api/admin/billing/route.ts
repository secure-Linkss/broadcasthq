import { NextResponse } from 'next/server'
import { db, workspaces, campaigns } from '@/lib/db'
import { sql, gte, eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const PLAN_PRICES: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 }

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const since30d  = new Date(Date.now() - 30  * 86_400_000)
    const since60d  = new Date(Date.now() - 60  * 86_400_000)
    const since90d  = new Date(Date.now() - 90  * 86_400_000)
    const since180d = new Date(Date.now() - 180 * 86_400_000)

    const [
      planBreakdown,
      subscriptionStatusBreakdown,
      workspaceGrowthByDay,
      workspaceGrowthPrev30d,
      recentWorkspaces,
      canceledOrPastDue,
      highValueWorkspaces,
      campaignActivity,
    ] = await Promise.all([
      // Current plan distribution
      db.select({
        planId: workspaces.planId,
        count:  sql<number>`count(*)::int`,
        active: sql<number>`sum(case when subscription_status = 'active' then 1 else 0 end)::int`,
      }).from(workspaces).groupBy(workspaces.planId).orderBy(workspaces.planId),

      // Subscription status breakdown
      db.select({
        status: workspaces.subscriptionStatus,
        count:  sql<number>`count(*)::int`,
      }).from(workspaces).groupBy(workspaces.subscriptionStatus),

      // Workspace growth per day (last 30d)
      db.select({
        day:   sql<string>`date_trunc('day', created_at)::text`,
        count: sql<number>`count(*)::int`,
      }).from(workspaces)
        .where(gte(workspaces.createdAt, since30d))
        .groupBy(sql`date_trunc('day', created_at)`)
        .orderBy(sql`date_trunc('day', created_at)`),

      // Previous 30d (for growth trend)
      db.select({ count: sql<number>`count(*)::int` })
        .from(workspaces)
        .where(sql`created_at >= ${since60d} and created_at < ${since30d}`),

      // Most recent workspaces (last 30d)
      db.select({
        id:                 workspaces.id,
        name:               workspaces.name,
        planId:             workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        createdAt:          workspaces.createdAt,
      }).from(workspaces)
        .where(gte(workspaces.createdAt, since30d))
        .orderBy(desc(workspaces.createdAt))
        .limit(10),

      // At-risk: canceled or past_due in last 90d
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

      // High-value workspaces (enterprise + pro with active subs)
      db.select({
        id:     workspaces.id,
        name:   workspaces.name,
        planId: workspaces.planId,
        subscriptionStatus: workspaces.subscriptionStatus,
        createdAt: workspaces.createdAt,
      }).from(workspaces)
        .where(sql`plan_id in ('enterprise', 'pro') and subscription_status = 'active'`)
        .orderBy(desc(workspaces.createdAt))
        .limit(20),

      // Campaign activity by workspace (revenue proxies)
      db.select({
        workspaceId: campaigns.workspaceId,
        campaignCount: sql<number>`count(*)::int`,
        totalRecipients: sql<number>`coalesce(sum(recipients_count), 0)::int`,
      }).from(campaigns)
        .where(gte(campaigns.createdAt, since90d))
        .groupBy(campaigns.workspaceId)
        .orderBy(desc(sql`sum(recipients_count)`))
        .limit(20),
    ])

    // Compute MRR from plan breakdown
    const mrr = planBreakdown.reduce((sum, p) => sum + (PLAN_PRICES[p.planId] ?? 0) * (p.active ?? 0), 0)
    const arr = mrr * 12

    // Previous 30d growth count
    const prev30dCount = workspaceGrowthPrev30d[0]?.count ?? 0
    const curr30dCount = workspaceGrowthByDay.reduce((s, d) => s + d.count, 0)
    const growthChange = prev30dCount > 0
      ? Math.round(((curr30dCount - prev30dCount) / prev30dCount) * 100)
      : 0

    // Total paid (active non-free)
    const totalPaid = planBreakdown
      .filter(p => p.planId !== 'free')
      .reduce((s, p) => s + (p.active ?? 0), 0)

    const totalActive = planBreakdown.reduce((s, p) => s + (p.active ?? 0), 0)
    const conversionRate = totalActive > 0 ? Math.round((totalPaid / totalActive) * 100) : 0

    return NextResponse.json({
      summary: {
        mrr,
        arr,
        totalPaid,
        conversionRate,
        newWorkspaces30d: curr30dCount,
        growthChange,
        atRiskCount: canceledOrPastDue.length,
      },
      planBreakdown: planBreakdown.map(p => ({
        planId: p.planId,
        total:  p.count,
        active: p.active ?? 0,
        mrr:    (PLAN_PRICES[p.planId] ?? 0) * (p.active ?? 0),
      })),
      subscriptionStatusBreakdown,
      workspaceGrowthByDay,
      recentWorkspaces,
      atRisk: canceledOrPastDue,
      highValue: highValueWorkspaces,
      campaignActivity,
    })
  } catch (err) {
    console.error('GET /api/admin/billing:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

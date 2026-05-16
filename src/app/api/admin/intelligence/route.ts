export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces, messages, campaigns, contacts, templates } from '@/lib/db'
import { sql, gte, eq, desc, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const since30d = new Date(Date.now() - 30 * 86_400_000)
    const since90d = new Date(Date.now() - 90 * 86_400_000)

    const [
      // Global engagement tier distribution
      globalEngagementDist,

      // Template performance across platform
      templatePerformance,
      templateCategoryStats,

      // Campaign performance benchmarks
      campaignPerformanceBenchmarks,
      campaignStatusGlobal,

      // Contact health across platform
      contactStatusDist,
      contactGrowthByDay,

      // Workspace growth and activity
      workspaceGrowthByDay,
      workspaceEngagementLeaderboard,

      // Message delivery performance by plan
      deliveryByPlan,

      // Top performing campaigns across platform
      topCampaigns,
    ] = await Promise.all([
      // Global engagement tier distribution
      db.select({
        tier: contacts.engagementTier,
        count: sql<number>`count(*)::int`,
      }).from(contacts).groupBy(contacts.engagementTier),

      // Template performance (avg rates across all workspaces)
      db.select({
        id: templates.id, name: templates.name, category: templates.category,
        language: templates.language, status: templates.status,
        usageCount: templates.usageCount,
        avgDeliveryRate: templates.avgDeliveryRate, avgReadRate: templates.avgReadRate,
        workspaceId: templates.workspaceId, wsName: workspaces.name,
      }).from(templates)
        .innerJoin(workspaces, eq(templates.workspaceId, workspaces.id))
        .where(sql`${templates.usageCount} > 0`)
        .orderBy(desc(templates.avgReadRate))
        .limit(20),

      // Template category breakdown
      db.select({
        category: templates.category,
        count: sql<number>`count(*)::int`,
        avgReadRate: sql<number>`round(avg(avg_read_rate)::numeric, 1)`,
        avgDeliveryRate: sql<number>`round(avg(avg_delivery_rate)::numeric, 1)`,
        totalUsage: sql<number>`sum(usage_count)::int`,
      }).from(templates)
        .groupBy(templates.category)
        .orderBy(desc(sql`sum(usage_count)`)),

      // Campaign performance benchmarks (platform-wide averages)
      db.select({
        avgDeliveryRate: sql<number>`round(avg(delivery_rate)::numeric, 1)`,
        avgReadRate: sql<number>`round(avg(read_rate)::numeric, 1)`,
        avgRecipientsCount: sql<number>`round(avg(recipients_count)::numeric, 0)`,
        p90DeliveryRate: sql<number>`round(percentile_cont(0.9) within group (order by delivery_rate)::numeric, 1)`,
        p90ReadRate: sql<number>`round(percentile_cont(0.9) within group (order by read_rate)::numeric, 1)`,
        totalCampaigns: sql<number>`count(*)::int`,
      }).from(campaigns)
        .where(and(sql`${campaigns.deliveryRate} > 0`, gte(campaigns.createdAt, since90d))),

      // Campaign status distribution
      db.select({
        status: campaigns.status,
        count: sql<number>`count(*)::int`,
        avgDeliveryRate: sql<number>`round(avg(delivery_rate)::numeric, 1)`,
        totalRecipients: sql<number>`sum(recipients_count)::int`,
      }).from(campaigns)
        .groupBy(campaigns.status),

      // Contact status distribution (global)
      db.select({
        status: contacts.status,
        count: sql<number>`count(*)::int`,
      }).from(contacts).groupBy(contacts.status),

      // Contact growth by day (30d)
      db.select({
        day: sql<string>`date_trunc('day', created_at)::text`,
        newContacts: sql<number>`count(*)::int`,
      }).from(contacts)
        .where(gte(contacts.createdAt, since30d))
        .groupBy(sql`date_trunc('day', created_at)`)
        .orderBy(sql`date_trunc('day', created_at)`),

      // Workspace growth by day (30d)
      db.select({
        day: sql<string>`date_trunc('day', created_at)::text`,
        newWorkspaces: sql<number>`count(*)::int`,
      }).from(workspaces)
        .where(gte(workspaces.createdAt, since30d))
        .groupBy(sql`date_trunc('day', created_at)`)
        .orderBy(sql`date_trunc('day', created_at)`),

      // Workspace engagement leaderboard (by read rate)
      db.select({
        workspaceId: campaigns.workspaceId,
        name: workspaces.name, planId: workspaces.planId,
        avgReadRate: sql<number>`round(avg(${campaigns.readRate})::numeric, 1)`,
        avgDeliveryRate: sql<number>`round(avg(${campaigns.deliveryRate})::numeric, 1)`,
        totalCampaigns: sql<number>`count(*)::int`,
        totalRecipients: sql<number>`sum(${campaigns.recipientsCount})::int`,
      }).from(campaigns)
        .innerJoin(workspaces, eq(campaigns.workspaceId, workspaces.id))
        .where(and(sql`delivery_rate > 0`, gte(campaigns.createdAt, since90d)))
        .groupBy(campaigns.workspaceId, workspaces.name, workspaces.planId)
        .having(sql`count(*) >= 2`)
        .orderBy(desc(sql`round(avg(${campaigns.readRate})::numeric, 1)`))
        .limit(10),

      // Delivery performance by plan tier
      db.select({
        planId: workspaces.planId,
        avgDeliveryRate: sql<number>`round(avg(${campaigns.deliveryRate})::numeric, 1)`,
        avgReadRate: sql<number>`round(avg(${campaigns.readRate})::numeric, 1)`,
        totalMessages: sql<number>`count(${messages.id})::int`,
      }).from(workspaces)
        .leftJoin(campaigns, eq(campaigns.workspaceId, workspaces.id))
        .leftJoin(messages, eq(messages.workspaceId, workspaces.id))
        .groupBy(workspaces.planId),

      // Top performing campaigns (by read rate, platform-wide)
      db.select({
        id: campaigns.id, name: campaigns.name, status: campaigns.status,
        workspaceId: campaigns.workspaceId, wsName: workspaces.name,
        deliveryRate: campaigns.deliveryRate, readRate: campaigns.readRate,
        recipientsCount: campaigns.recipientsCount, replyCount: campaigns.replyCount,
        sentDate: campaigns.sentDate,
      }).from(campaigns)
        .innerJoin(workspaces, eq(campaigns.workspaceId, workspaces.id))
        .where(and(sql`read_rate > 0`, gte(campaigns.createdAt, since90d)))
        .orderBy(desc(campaigns.readRate))
        .limit(10),
    ])

    return NextResponse.json({
      engagement: {
        globalDist: globalEngagementDist,
      },
      templates: {
        topPerforming: templatePerformance,
        categoryBreakdown: templateCategoryStats,
      },
      campaigns: {
        benchmarks: campaignPerformanceBenchmarks[0] ?? {},
        statusDist: campaignStatusGlobal,
        top: topCampaigns,
      },
      contacts: {
        statusDist: contactStatusDist,
        growthByDay: contactGrowthByDay,
      },
      workspaces: {
        growthByDay: workspaceGrowthByDay,
        engagementLeaderboard: workspaceEngagementLeaderboard,
        deliveryByPlan,
      },
    })
  } catch (err) {
    console.error('GET /api/admin/intelligence:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


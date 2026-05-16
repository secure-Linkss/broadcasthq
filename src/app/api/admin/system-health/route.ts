export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, messages, campaigns, webhooks, workspaces, importJobs, auditLogs } from '@/lib/db'
import { sql, gte, eq, desc, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const since1h   = new Date(Date.now() - 3_600_000)
    const since24h  = new Date(Date.now() - 86_400_000)
    const since7d   = new Date(Date.now() - 7 * 86_400_000)

    const [
      // Message pipeline health
      msgLast1h,
      msgLast24h,
      failedLast1h,
      failedLast24h,
      pendingMsgs,

      // Campaign health
      runningCampaigns,
      failedCampaigns7d,
      campaignStatusBreakdown,

      // Webhook health
      webhookStats,
      failingWebhooks,

      // Import job health
      importJobStats,
      recentImportJobs,

      // Audit log volume
      auditLast24h,
      recentAuditLogs,

      // Daily message pipeline (7 days)
      dailyPipeline,

      // Hourly error rate (24h)
      hourlyErrors,
    ] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(gte(messages.sentAt, since1h)),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(gte(messages.sentAt, since24h)),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(gte(messages.sentAt, since1h), eq(messages.status, 'failed'))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(gte(messages.sentAt, since24h), eq(messages.status, 'failed'))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.status, 'pending')),

      db.select({ c: sql<number>`count(*)::int` }).from(campaigns).where(eq(campaigns.status, 'running')),
      db.select({ c: sql<number>`count(*)::int` }).from(campaigns).where(and(eq(campaigns.status, 'failed'), gte(campaigns.createdAt, since7d))),
      db.select({
        status: campaigns.status,
        count: sql<number>`count(*)::int`,
      }).from(campaigns).groupBy(campaigns.status),

      db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`sum(case when is_active then 1 else 0 end)::int`,
        failing: sql<number>`sum(case when fail_count > 0 then 1 else 0 end)::int`,
        totalFails: sql<number>`sum(fail_count)::int`,
      }).from(webhooks),

      db.select({
        id: webhooks.id, name: webhooks.name, url: webhooks.url,
        failCount: webhooks.failCount, lastStatus: webhooks.lastStatus,
        lastTriggeredAt: webhooks.lastTriggeredAt, isActive: webhooks.isActive,
        workspaceId: webhooks.workspaceId, wsName: workspaces.name,
      }).from(webhooks)
        .innerJoin(workspaces, eq(webhooks.workspaceId, workspaces.id))
        .where(sql`${webhooks.failCount} > 0`)
        .orderBy(desc(webhooks.failCount))
        .limit(10),

      db.select({
        status: importJobs.status,
        count: sql<number>`count(*)::int`,
        totalRows: sql<number>`sum(total_rows)::int`,
        newContacts: sql<number>`sum(new_contacts)::int`,
      }).from(importJobs).groupBy(importJobs.status),

      db.select({
        id: importJobs.id, filename: importJobs.filename,
        status: importJobs.status, totalRows: importJobs.totalRows,
        processedRows: importJobs.processedRows, newContacts: importJobs.newContacts,
        skippedContacts: importJobs.skippedContacts,
        createdAt: importJobs.createdAt, updatedAt: importJobs.updatedAt,
        workspaceId: importJobs.workspaceId, wsName: workspaces.name,
      }).from(importJobs)
        .innerJoin(workspaces, eq(importJobs.workspaceId, workspaces.id))
        .orderBy(desc(importJobs.createdAt))
        .limit(10),

      db.select({ c: sql<number>`count(*)::int` }).from(auditLogs).where(gte(auditLogs.createdAt, since24h)),

      db.select({
        id: auditLogs.id, action: auditLogs.action, resource: auditLogs.resource,
        resourceId: auditLogs.resourceId, ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt, workspaceId: auditLogs.workspaceId,
        metadata: auditLogs.metadata,
      }).from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(100),

      db.select({
        day: sql<string>`date_trunc('day', sent_at)::text`,
        sent: sql<number>`count(*)::int`,
        failed: sql<number>`sum(case when ${messages.status} = 'failed' then 1 else 0 end)::int`,
        delivered: sql<number>`sum(case when ${messages.status} in ('delivered','read') then 1 else 0 end)::int`,
        read: sql<number>`sum(case when ${messages.status} = 'read' then 1 else 0 end)::int`,
      }).from(messages)
        .where(gte(messages.sentAt, since7d))
        .groupBy(sql`date_trunc('day', sent_at)`)
        .orderBy(sql`date_trunc('day', sent_at)`),

      db.select({
        hour: sql<number>`extract(hour from sent_at)::int`,
        failed: sql<number>`sum(case when ${messages.status} = 'failed' then 1 else 0 end)::int`,
        total: sql<number>`count(*)::int`,
      }).from(messages)
        .where(gte(messages.sentAt, since24h))
        .groupBy(sql`extract(hour from sent_at)`)
        .orderBy(sql`extract(hour from sent_at)`),
    ])

    const m1h = msgLast1h[0].c
    const f1h = failedLast1h[0].c
    const m24h = msgLast24h[0].c
    const f24h = failedLast24h[0].c

    return NextResponse.json({
      pipeline: {
        messagesLast1h:      m1h,
        messagesLast24h:     m24h,
        failedLast1h:        f1h,
        failedLast24h:       f24h,
        failRateLast1h:      m1h > 0 ? Math.round((f1h / m1h) * 1000) / 10 : 0,
        failRateLast24h:     m24h > 0 ? Math.round((f24h / m24h) * 1000) / 10 : 0,
        pendingMessages:     pendingMsgs[0].c,
        queueHealth:         pendingMsgs[0].c > 10000 ? 'degraded' : pendingMsgs[0].c > 1000 ? 'warning' : 'healthy',
      },
      campaigns: {
        running: runningCampaigns[0].c,
        failedLast7d: failedCampaigns7d[0].c,
        statusBreakdown: campaignStatusBreakdown,
      },
      webhooks: {
        summary: webhookStats[0] ?? { total: 0, active: 0, failing: 0, totalFails: 0 },
        failing: failingWebhooks,
      },
      imports: {
        statusBreakdown: importJobStats,
        recent: recentImportJobs,
      },
      auditLogs: {
        eventsLast24h: auditLast24h[0].c,
        recent: recentAuditLogs,
      },
      dailyPipeline,
      hourlyErrors,
    })
  } catch (err) {
    console.error('GET /api/admin/system-health:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


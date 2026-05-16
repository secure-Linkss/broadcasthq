import { NextResponse } from 'next/server'
import { db, workspaces, users, messages, campaigns, botBlocks, auditLogs } from '@/lib/db'
import { sql, eq, gte, desc, and, lt } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const since24h  = new Date(Date.now() - 86_400_000)
    const since7d   = new Date(Date.now() - 7 * 86_400_000)
    const since30d  = new Date(Date.now() - 30 * 86_400_000)

    const [
      // Bot block stats
      totalBotBlocks,
      globalBotBlocks,
      recentBotHits,
      topHitBlocks,

      // Workspace risk signals
      suspiciousWorkspaces,   // high fail rate or very high volume in short time
      inactiveWorkspaces,     // created but no messages
      flaggedWorkspaces,      // isActive=false

      // Message anomalies — workspaces with >20% failure rate this month
      failureRateByWorkspace,

      // Audit log events — recent security-relevant actions
      recentAuditEvents,

      // Campaign spam signals — campaigns with very high recipients sent quickly
      highVolumeCampaigns,

      // Users with suspicious activity — multiple workspaces or invited but never active
      suspiciousUsers,

      // Opt-out spike — workspaces with high opt-out rates
      optOutByWorkspace,
    ] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(botBlocks),
      db.select({ c: sql<number>`count(*)::int` }).from(botBlocks).where(eq(botBlocks.isGlobal, true)),
      db.select({ c: sql<number>`count(*)::int` }).from(botBlocks).where(gte(botBlocks.lastHitAt, since24h)),
      db.select({
        id: botBlocks.id, pattern: botBlocks.pattern, type: botBlocks.type,
        hitCount: botBlocks.hitCount, isGlobal: botBlocks.isGlobal,
        lastHitAt: botBlocks.lastHitAt, reason: botBlocks.reason,
      }).from(botBlocks).orderBy(desc(botBlocks.hitCount)).limit(10),

      // Workspaces sending a very high proportion of failed messages this month
      db.select({
        workspaceId: messages.workspaceId,
        name: workspaces.name,
        planId: workspaces.planId,
        total: sql<number>`count(*)::int`,
        failed: sql<number>`sum(case when ${messages.status} = 'failed' then 1 else 0 end)::int`,
        failRate: sql<number>`round(sum(case when ${messages.status} = 'failed' then 1 else 0 end)::numeric / nullif(count(*),0) * 100, 1)`,
      }).from(messages)
        .innerJoin(workspaces, eq(messages.workspaceId, workspaces.id))
        .where(gte(messages.sentAt, since30d))
        .groupBy(messages.workspaceId, workspaces.name, workspaces.planId)
        .having(sql`round(sum(case when ${messages.status} = 'failed' then 1 else 0 end)::numeric / nullif(count(*),0) * 100, 1) > 15`)
        .orderBy(desc(sql`round(sum(case when ${messages.status} = 'failed' then 1 else 0 end)::numeric / nullif(count(*),0) * 100, 1)`))
        .limit(10),

      // Workspaces created >7 days ago but no messages
      db.select({
        id: workspaces.id, name: workspaces.name, planId: workspaces.planId,
        createdAt: workspaces.createdAt,
        msgCount: sql<number>`count(${messages.id})::int`,
      }).from(workspaces)
        .leftJoin(messages, eq(messages.workspaceId, workspaces.id))
        .where(lt(workspaces.createdAt, since7d))
        .groupBy(workspaces.id)
        .having(sql`count(${messages.id}) = 0`)
        .limit(10),

      db.select({
        id: workspaces.id, name: workspaces.name, planId: workspaces.planId,
        createdAt: workspaces.createdAt,
      }).from(workspaces)
        .where(eq(workspaces.isActive, false))
        .limit(20),

      // Failure rate breakdown for all workspaces with messages in 30d
      db.select({
        workspaceId: messages.workspaceId,
        name: workspaces.name,
        planId: workspaces.planId,
        total: sql<number>`count(*)::int`,
        failed: sql<number>`sum(case when ${messages.status} = 'failed' then 1 else 0 end)::int`,
        delivered: sql<number>`sum(case when ${messages.status} in ('delivered','read') then 1 else 0 end)::int`,
      }).from(messages)
        .innerJoin(workspaces, eq(messages.workspaceId, workspaces.id))
        .where(gte(messages.sentAt, since30d))
        .groupBy(messages.workspaceId, workspaces.name, workspaces.planId)
        .orderBy(desc(sql`count(*)`))
        .limit(20),

      // Recent audit events
      db.select({
        id: auditLogs.id, action: auditLogs.action, resource: auditLogs.resource,
        resourceId: auditLogs.resourceId, ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt, workspaceId: auditLogs.workspaceId,
        metadata: auditLogs.metadata,
      }).from(auditLogs)
        .where(gte(auditLogs.createdAt, since24h))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50),

      // Campaigns with very high recipient counts (potential spam)
      db.select({
        id: campaigns.id, name: campaigns.name,
        workspaceId: campaigns.workspaceId, wsName: workspaces.name,
        recipientsCount: campaigns.recipientsCount,
        status: campaigns.status, createdAt: campaigns.createdAt,
        deliveryRate: campaigns.deliveryRate,
      }).from(campaigns)
        .innerJoin(workspaces, eq(campaigns.workspaceId, workspaces.id))
        .where(sql`${campaigns.recipientsCount} > 10000`)
        .orderBy(desc(campaigns.createdAt))
        .limit(10),

      // Suspicious users: invited status older than 30 days (ghost invites)
      db.select({
        id: users.id, email: users.email, name: users.name,
        role: users.role, status: users.status,
        createdAt: users.createdAt, workspaceId: users.workspaceId,
        wsName: workspaces.name,
      }).from(users)
        .innerJoin(workspaces, eq(users.workspaceId, workspaces.id))
        .where(and(eq(users.status, 'invited'), lt(users.createdAt, since30d)))
        .orderBy(desc(users.createdAt))
        .limit(20),

      // Opt-out concentration by workspace
      db.select({
        workspaceId: messages.workspaceId,
        name: workspaces.name,
        optOuts: sql<number>`sum(case when ${messages.status} = 'failed' then 1 else 0 end)::int`,
        total: sql<number>`count(*)::int`,
      }).from(messages)
        .innerJoin(workspaces, eq(messages.workspaceId, workspaces.id))
        .where(gte(messages.sentAt, since30d))
        .groupBy(messages.workspaceId, workspaces.name)
        .orderBy(desc(sql`sum(case when ${messages.status} = 'failed' then 1 else 0 end)`))
        .limit(10),
    ])

    // Compute a simple risk score per workspace (0–100)
    const riskMap: Record<string, number> = {}
    for (const row of failureRateByWorkspace) {
      const failRate = row.total > 0 ? (row.failed / row.total) * 100 : 0
      riskMap[row.workspaceId] = Math.min(100, Math.round(failRate * 2))
    }
    for (const ws of flaggedWorkspaces) {
      riskMap[ws.id] = 100
    }

    return NextResponse.json({
      botBlocks: {
        total: totalBotBlocks[0].c,
        global: globalBotBlocks[0].c,
        hitsLast24h: recentBotHits[0].c,
        topHits: topHitBlocks,
      },
      workspaceRisk: {
        highFailRate: suspiciousWorkspaces,
        inactive: inactiveWorkspaces,
        flagged: flaggedWorkspaces,
        riskMap,
      },
      deliveryHealth: failureRateByWorkspace,
      recentAuditEvents,
      highVolumeCampaigns,
      suspiciousUsers,
      optOutSpikes: optOutByWorkspace,
    })
  } catch (err) {
    console.error('GET /api/admin/security:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, workspaces, users, campaigns, messages, contacts } from '@/lib/db'
import { sql, gte, and, eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()

  if (!session || session.user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const since30d   = new Date(Date.now() - 30 * 86_400_000)
    const since7d    = new Date(Date.now() - 7  * 86_400_000)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const [
      totalWorkspaces, totalUsers, totalMessages,
      msgThisMonth, newWorkspaces7d, newUsers7d,
      activeSubs, planBreakdown, dailyMsgs, topWorkspaces,
      totalContacts, totalCampaigns,
      deliveredMsgs, readMsgs, failedMsgs,
    ] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(workspaces),
      db.select({ c: sql<number>`count(*)::int` }).from(users).where(sql`role != 'super_admin'`),
      db.select({ c: sql<number>`count(*)::int` }).from(messages),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(gte(messages.sentAt, monthStart)),
      db.select({ c: sql<number>`count(*)::int` }).from(workspaces).where(gte(workspaces.createdAt, since7d)),
      db.select({ c: sql<number>`count(*)::int` }).from(users).where(and(gte(users.createdAt, since7d), sql`role != 'super_admin'`)),
      db.select({ c: sql<number>`count(*)::int` }).from(workspaces).where(eq(workspaces.subscriptionStatus, 'active')),
      db.select({ planId: workspaces.planId, count: sql<number>`count(*)::int` })
        .from(workspaces).groupBy(workspaces.planId),
      db.select({
        day:   sql<string>`date_trunc('day', sent_at)::text`,
        count: sql<number>`count(*)::int`,
      }).from(messages).where(gte(messages.sentAt, since30d))
        .groupBy(sql`date_trunc('day', sent_at)`)
        .orderBy(sql`date_trunc('day', sent_at)`),
      db.select({
        id:        workspaces.id,
        name:      workspaces.name,
        planId:    workspaces.planId,
        msgCount:  sql<number>`count(${messages.id})::int`,
        createdAt: workspaces.createdAt,
      })
        .from(workspaces)
        .leftJoin(messages, eq(messages.workspaceId, workspaces.id))
        .groupBy(workspaces.id)
        .orderBy(desc(sql`count(${messages.id})`))
        .limit(10),
      db.select({ c: sql<number>`count(*)::int` }).from(contacts),
      db.select({ c: sql<number>`count(*)::int` }).from(campaigns),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.status, 'delivered')),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.status, 'read')),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.status, 'failed')),
    ])

    const planPrices: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 }
    const mrr = planBreakdown.reduce((sum, p) => sum + (planPrices[p.planId] ?? 0) * p.count, 0)
    const total = totalMessages[0].c
    const delivered = deliveredMsgs[0].c + readMsgs[0].c
    const failed = failedMsgs[0].c

    return NextResponse.json({
      kpis: {
        totalWorkspaces:  totalWorkspaces[0].c,
        totalUsers:       totalUsers[0].c,
        totalMessages:    total,
        totalContacts:    totalContacts[0].c,
        totalCampaigns:   totalCampaigns[0].c,
        msgThisMonth:     msgThisMonth[0].c,
        newWorkspaces7d:  newWorkspaces7d[0].c,
        newUsers7d:       newUsers7d[0].c,
        activeSubsCount:  activeSubs[0].c,
        mrr,
        arr:              mrr * 12,
        globalDeliveryRate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0,
        globalFailRate:     total > 0 ? Math.round((failed / total) * 1000) / 10 : 0,
      },
      planBreakdown,
      dailyMessages: dailyMsgs,
      topWorkspaces,
    })
  } catch (err) {
    console.error('GET /api/admin/stats:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


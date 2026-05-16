export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, campaigns, contacts, messages, templates } from '@/lib/db'
import { eq, and, gte, sql, desc, lt } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') ?? '30d'
    const days  = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const since     = new Date(Date.now() - days * 86_400_000)
    const prevSince = new Date(Date.now() - days * 2 * 86_400_000)

    const wid = user.workspaceId

    const [
      totalContactsRes,
      activeContactsRes,
      totalCampaignsRes,
      activeCampaignsRes,
      totalMsgRes,
      deliveredMsgRes,
      readMsgRes,
      prevTotalMsgRes,
      prevDeliveredMsgRes,
      prevReadMsgRes,
      recentMessages,
      replyCountRes,
      topCampaigns,
      engagementDist,
      templateStats,
      hourlyActivity,
      failedMsgRes,
    ] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(contacts).where(eq(contacts.workspaceId, wid)),
      db.select({ c: sql<number>`count(*)::int` }).from(contacts).where(and(eq(contacts.workspaceId, wid), eq(contacts.status, 'active'))),
      db.select({ c: sql<number>`count(*)::int` }).from(campaigns).where(eq(campaigns.workspaceId, wid)),
      db.select({ c: sql<number>`count(*)::int` }).from(campaigns).where(and(eq(campaigns.workspaceId, wid), eq(campaigns.status, 'running'))),
      // Current period
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), gte(messages.sentAt, since))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'delivered'), gte(messages.sentAt, since))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'read'), gte(messages.sentAt, since))),
      // Previous period for trend comparison
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), gte(messages.sentAt, prevSince), lt(messages.sentAt, since))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'delivered'), gte(messages.sentAt, prevSince), lt(messages.sentAt, since))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'read'), gte(messages.sentAt, prevSince), lt(messages.sentAt, since))),
      db.select({ status: messages.status, sentAt: messages.sentAt })
        .from(messages)
        .where(and(eq(messages.workspaceId, wid), gte(messages.sentAt, since))),
      // Total replies from campaigns in period
      db.select({ total: sql<number>`coalesce(sum(reply_count), 0)::int` })
        .from(campaigns)
        .where(and(eq(campaigns.workspaceId, wid), gte(campaigns.createdAt, since))),
      db.select({
        id: campaigns.id, name: campaigns.name, status: campaigns.status,
        deliveryRate: campaigns.deliveryRate, readRate: campaigns.readRate,
        recipientsCount: campaigns.recipientsCount, replyCount: campaigns.replyCount,
        engagementScore: campaigns.engagementScore,
      }).from(campaigns)
        .where(and(eq(campaigns.workspaceId, wid), gte(campaigns.createdAt, since)))
        .orderBy(desc(campaigns.readRate)).limit(10),
      db.select({
        tier:  contacts.engagementTier,
        count: sql<number>`count(*)::int`,
      }).from(contacts)
        .where(eq(contacts.workspaceId, wid))
        .groupBy(contacts.engagementTier),
      db.select({
        id: templates.id, name: templates.name, category: templates.category,
        usageCount: templates.usageCount, avgDeliveryRate: templates.avgDeliveryRate,
        avgReadRate: templates.avgReadRate, status: templates.status,
      }).from(templates)
        .where(eq(templates.workspaceId, wid))
        .orderBy(desc(templates.usageCount)).limit(10),
      db.select({
        hour:  sql<number>`extract(hour from sent_at)::int`,
        count: sql<number>`count(*)::int`,
      }).from(messages)
        .where(and(eq(messages.workspaceId, wid), gte(messages.sentAt, since)))
        .groupBy(sql`extract(hour from sent_at)`)
        .orderBy(sql`extract(hour from sent_at)`),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'failed'), gte(messages.sentAt, since))),
    ])

    const totalSent = totalMsgRes[0].c
    const delivered = deliveredMsgRes[0].c
    const read      = readMsgRes[0].c
    const failed    = failedMsgRes[0].c
    const replyCount = replyCountRes[0]?.total ?? 0

    const prevTotal     = prevTotalMsgRes[0].c
    const prevDelivered = prevDeliveredMsgRes[0].c
    const prevRead      = prevReadMsgRes[0].c

    const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 1000) / 10 : 0
    const readRate     = totalSent > 0 ? Math.round((read / totalSent) * 1000) / 10 : 0
    const prevDeliveryRate = prevTotal > 0 ? Math.round((prevDelivered / prevTotal) * 1000) / 10 : 0
    const prevReadRate     = prevTotal > 0 ? Math.round((prevRead / prevTotal) * 1000) / 10 : 0

    const trends = {
      sentChange:     prevTotal > 0 ? Math.round(((totalSent - prevTotal) / prevTotal) * 100) : 0,
      deliveryChange: Math.round((deliveryRate - prevDeliveryRate) * 10) / 10,
      readChange:     Math.round((readRate - prevReadRate) * 10) / 10,
      replyRate:      totalSent > 0 ? Math.round((replyCount / totalSent) * 1000) / 10 : 0,
    }

    const dailyMap: Record<string, { sent: number; delivered: number; read: number; failed: number; replied: number }> = {}
    for (const m of recentMessages) {
      if (!m.sentAt) continue
      const day = m.sentAt.toISOString().slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 }
      const s = m.status
      if (s === 'sent' || s === 'pending') dailyMap[day].sent++
      else if (s === 'delivered') { dailyMap[day].sent++; dailyMap[day].delivered++ }
      else if (s === 'read') { dailyMap[day].sent++; dailyMap[day].delivered++; dailyMap[day].read++ }
      else if (s === 'failed') { dailyMap[day].sent++; dailyMap[day].failed++ }
    }

    const bestHour = hourlyActivity.reduce((best, h) => h.count > (best?.count ?? 0) ? h : best, hourlyActivity[0])

    return NextResponse.json({
      summary: {
        totalMessagesSent: totalSent,
        deliveryRate,
        readRate,
        failRate: totalSent > 0 ? Math.round((failed / totalSent) * 1000) / 10 : 0,
        activeCampaigns:   activeCampaignsRes[0].c,
        totalContacts:     totalContactsRes[0].c,
        activeContacts:    activeContactsRes[0].c,
        totalCampaigns:    totalCampaignsRes[0].c,
        replyCount,
      },
      trends,
      bestSendHour: bestHour ? `${bestHour.hour}:00` : null,
      dailyBreakdown: Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts })),
      topCampaigns,
      engagementDist,
      templateStats,
      hourlyActivity: hourlyActivity.map(h => ({
        hour: h.hour,
        count: h.count,
        label: `${h.hour % 12 === 0 ? 12 : h.hour % 12}${h.hour < 12 ? 'am' : 'pm'}`,
      })),
    })
  } catch (err) {
    console.error('GET /api/analytics:', err)
    return serverErrorJson()
  }
}


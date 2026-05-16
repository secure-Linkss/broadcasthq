export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { db, contacts, campaigns, messages } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { authenticateApiKey, hasPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'analytics', 'read')) return forbiddenResponse()

  try {
    const wid = auth.workspaceId

    const [
      totalContactsRes, activeContactsRes,
      totalCampaignsRes, activeCampaignsRes,
      totalMsgRes, deliveredRes, readRes,
    ] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(contacts).where(eq(contacts.workspaceId, wid)),
      db.select({ c: sql<number>`count(*)::int` }).from(contacts).where(and(eq(contacts.workspaceId, wid), eq(contacts.status, 'active'))),
      db.select({ c: sql<number>`count(*)::int` }).from(campaigns).where(eq(campaigns.workspaceId, wid)),
      db.select({ c: sql<number>`count(*)::int` }).from(campaigns).where(and(eq(campaigns.workspaceId, wid), eq(campaigns.status, 'running'))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.workspaceId, wid)),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'delivered'))),
      db.select({ c: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.workspaceId, wid), eq(messages.status, 'read'))),
    ])

    const total     = totalMsgRes[0].c
    const delivered = deliveredRes[0].c
    const read      = readRes[0].c

    return Response.json({
      data: {
        totalContacts:     totalContactsRes[0].c,
        activeContacts:    activeContactsRes[0].c,
        totalCampaigns:    totalCampaignsRes[0].c,
        activeCampaigns:   activeCampaignsRes[0].c,
        totalMessagesSent: total,
        avgDeliveryRate:   total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0,
        avgReadRate:       total > 0 ? Math.round((read / total) * 1000) / 10 : 0,
      },
    })
  } catch (err) {
    console.error('GET /api/v1/analytics:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}


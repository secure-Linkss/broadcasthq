export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, campaigns, contacts, templates } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { eq, and, gte, sql } from 'drizzle-orm'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = user
  const since30d = new Date(Date.now() - 30 * 86_400_000)
  const since60d = new Date(Date.now() - 60 * 86_400_000)
  const since7d  = new Date(Date.now() - 7  * 86_400_000)

  try {
    const [lowDelivery, inactiveCount, newVips, pendingTemplates] = await Promise.all([
      db.select({
        id:           campaigns.id,
        name:         campaigns.name,
        deliveryRate: campaigns.deliveryRate,
        readRate:     campaigns.readRate,
      })
      .from(campaigns)
      .where(and(
        eq(campaigns.workspaceId, workspaceId),
        gte(campaigns.createdAt, since30d),
        sql`delivery_rate > 0 and delivery_rate < 60`,
      ))
      .orderBy(campaigns.deliveryRate)
      .limit(3),

      db.select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(and(
          eq(contacts.workspaceId, workspaceId),
          eq(contacts.status, 'active'),
          sql`(last_engaged_at IS NULL OR last_engaged_at < ${since60d})`,
        )),

      db.select({
        id:        contacts.id,
        firstName: contacts.firstName,
        lastName:  contacts.lastName,
      })
      .from(contacts)
      .where(and(
        eq(contacts.workspaceId, workspaceId),
        eq(contacts.engagementTier, 'vip'),
        gte(contacts.createdAt, since7d),
      ))
      .limit(5),

      db.select({ count: sql<number>`count(*)::int` })
        .from(templates)
        .where(and(
          eq(templates.workspaceId, workspaceId),
          eq(templates.status, 'pending'),
        )),
    ])

    const alerts: {
      id: string
      type: 'critical' | 'warning' | 'info'
      title: string
      detail: string
      action?: { label: string; href: string }
    }[] = []

    if (lowDelivery.length > 0) {
      const worst = lowDelivery[0]
      alerts.push({
        id:     `low-delivery-${worst.id}`,
        type:   'critical',
        title:  'Low delivery rate detected',
        detail: `"${worst.name}" â€” ${worst.deliveryRate.toFixed(0)}% delivery Â· ${worst.readRate.toFixed(0)}% read`,
        action: { label: 'View', href: `/campaigns/${worst.id}` },
      })
    }

    const inactive = inactiveCount[0]?.count ?? 0
    if (inactive > 0) {
      alerts.push({
        id:     'inactive-contacts',
        type:   'warning',
        title:  `${inactive.toLocaleString()} inactive contacts`,
        detail: 'No engagement in 60+ days â€” consider a win-back campaign',
        action: { label: 'Filter', href: '/contacts' },
      })
    }

    if (newVips.length > 0) {
      const names = newVips
        .slice(0, 2)
        .map(c => [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contact')
        .join(' and ')
      const extra = newVips.length > 2 ? ` +${newVips.length - 2} more` : ''
      alerts.push({
        id:     'new-vips',
        type:   'info',
        title:  `${newVips.length} new VIP contact${newVips.length > 1 ? 's' : ''}`,
        detail: `${names}${extra} reached VIP tier this week`,
        action: { label: 'View', href: '/contacts' },
      })
    }

    const pendingCount = pendingTemplates[0]?.count ?? 0
    if (pendingCount > 0) {
      alerts.push({
        id:     'pending-templates',
        type:   'warning',
        title:  `${pendingCount} template${pendingCount > 1 ? 's' : ''} awaiting Meta approval`,
        detail: 'Templates must be approved before use in campaigns',
        action: { label: 'View', href: '/templates' },
      })
    }

    return NextResponse.json({ alerts })
  } catch (err) {
    console.error('GET /api/dashboard/alerts:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


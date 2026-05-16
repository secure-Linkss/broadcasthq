export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, campaigns, contacts, messages, importJobs } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { eq, and, gte, lt, sql } from 'drizzle-orm'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = user
  const now      = new Date()
  const since1h  = new Date(now.getTime() - 1    * 3_600_000)
  const since7d  = new Date(now.getTime() - 7    * 86_400_000)
  const since30d = new Date(now.getTime() - 30   * 86_400_000)
  const since60d = new Date(now.getTime() - 60   * 86_400_000)

  try {
    const [
      lowDelivery,
      recentFailed,
      inactiveCount,
      newVips,
      recentCompleted,
      recentImports,
    ] = await Promise.all([
      // Campaigns with low delivery rate in last 30d
      db.select({
        id:           campaigns.id,
        name:         campaigns.name,
        deliveryRate: campaigns.deliveryRate,
        readRate:     campaigns.readRate,
        updatedAt:    campaigns.updatedAt,
      })
      .from(campaigns)
      .where(and(
        eq(campaigns.workspaceId, workspaceId),
        gte(campaigns.createdAt, since30d),
        sql`delivery_rate > 0 and delivery_rate < 60`,
      ))
      .orderBy(campaigns.deliveryRate)
      .limit(2),

      // Failed messages in last hour
      db.select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(and(
          eq(messages.workspaceId, workspaceId),
          eq(messages.status, 'failed'),
          gte(messages.sentAt, since1h),
        )),

      // Inactive contacts
      db.select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(and(
          eq(contacts.workspaceId, workspaceId),
          eq(contacts.status, 'active'),
          sql`(last_engaged_at IS NULL OR last_engaged_at < ${since60d})`,
        )),

      // New VIP contacts this week
      db.select({
        id:        contacts.id,
        firstName: contacts.firstName,
        lastName:  contacts.lastName,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(and(
        eq(contacts.workspaceId, workspaceId),
        eq(contacts.engagementTier, 'vip'),
        gte(contacts.createdAt, since7d),
      ))
      .limit(3),

      // Recently completed campaigns
      db.select({
        id:              campaigns.id,
        name:            campaigns.name,
        recipientsCount: campaigns.recipientsCount,
        updatedAt:       campaigns.updatedAt,
      })
      .from(campaigns)
      .where(and(
        eq(campaigns.workspaceId, workspaceId),
        eq(campaigns.status, 'completed'),
        gte(campaigns.updatedAt, since7d),
      ))
      .orderBy(sql`updated_at desc`)
      .limit(2),

      // Completed imports
      db.select({
        id:          importJobs.id,
        filename:    importJobs.filename,
        newContacts: importJobs.newContacts,
        updatedAt:   importJobs.updatedAt,
      })
      .from(importJobs)
      .where(and(
        eq(importJobs.workspaceId, workspaceId),
        eq(importJobs.status, 'done'),
        gte(importJobs.updatedAt, since7d),
      ))
      .orderBy(sql`updated_at desc`)
      .limit(2),
    ])

    const notifications: {
      id: string
      type: 'warning' | 'info' | 'error' | 'success'
      title: string
      message: string
      createdAt: string
      action?: { label: string; href: string }
    }[] = []

    for (const c of lowDelivery) {
      notifications.push({
        id:        `low-delivery-${c.id}`,
        type:      'warning',
        title:     'Low delivery rate detected',
        message:   `"${c.name}" â€” ${c.deliveryRate.toFixed(0)}% delivery Â· ${c.readRate.toFixed(0)}% read rate`,
        createdAt: c.updatedAt.toISOString(),
        action:    { label: 'View Campaign', href: `/campaigns/${c.id}` },
      })
    }

    const failedCount = recentFailed[0]?.count ?? 0
    if (failedCount > 0) {
      notifications.push({
        id:        'delivery-failures',
        type:      'error',
        title:     'Delivery failures detected',
        message:   `${failedCount} message${failedCount > 1 ? 's' : ''} failed in the last hour. Check your WhatsApp connection.`,
        createdAt: now.toISOString(),
        action:    { label: 'Check Settings', href: '/settings' },
      })
    }

    const inactive = inactiveCount[0]?.count ?? 0
    if (inactive > 0) {
      const pct = 0 // compute if total contacts known â€” omit pct for now
      notifications.push({
        id:        'inactive-contacts',
        type:      'info',
        title:     `${inactive.toLocaleString()} inactive contacts`,
        message:   `${inactive.toLocaleString()} contacts haven't engaged in 60+ days. Consider a win-back campaign.`,
        createdAt: now.toISOString(),
        action:    { label: 'View Contacts', href: '/contacts' },
      })
    }

    for (const c of recentCompleted) {
      notifications.push({
        id:        `completed-${c.id}`,
        type:      'success',
        title:     `"${c.name}" completed`,
        message:   `Campaign successfully sent to ${c.recipientsCount.toLocaleString()} contacts.`,
        createdAt: c.updatedAt.toISOString(),
        action:    { label: 'View Report', href: `/campaigns/${c.id}` },
      })
    }

    for (const imp of recentImports) {
      notifications.push({
        id:        `import-${imp.id}`,
        type:      'info',
        title:     'Contact import complete',
        message:   `${imp.newContacts} new contacts imported from "${imp.filename}".`,
        createdAt: imp.updatedAt.toISOString(),
      })
    }

    if (newVips.length > 0) {
      const names = newVips
        .slice(0, 2)
        .map(c => [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contact')
        .join(', ')
      notifications.push({
        id:        'new-vips',
        type:      'success',
        title:     `${newVips.length} new VIP contact${newVips.length > 1 ? 's' : ''}`,
        message:   `${names}${newVips.length > 2 ? ` +${newVips.length - 2} more` : ''} reached VIP tier this week.`,
        createdAt: (newVips[0]?.createdAt ?? now).toISOString(),
        action:    { label: 'View', href: '/contacts' },
      })
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ notifications: notifications.slice(0, 10) })
  } catch (err) {
    console.error('GET /api/dashboard/notifications:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db, campaigns, messages, contacts, importJobs } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { eq, and, desc, gte } from 'drizzle-orm'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = user
  const since7d = new Date(Date.now() - 7 * 86_400_000)

  try {
    const [recentCampaigns, recentReplies, recentImports, recentContacts] = await Promise.all([
      db.select({
        id:              campaigns.id,
        name:            campaigns.name,
        status:          campaigns.status,
        recipientsCount: campaigns.recipientsCount,
        readRate:        campaigns.readRate,
        updatedAt:       campaigns.updatedAt,
      })
      .from(campaigns)
      .where(and(eq(campaigns.workspaceId, workspaceId), gte(campaigns.updatedAt, since7d)))
      .orderBy(desc(campaigns.updatedAt))
      .limit(5),

      db.select({
        id:           messages.id,
        repliedAt:    messages.repliedAt,
        replyContent: messages.replyContent,
        sentAt:       messages.sentAt,
      })
      .from(messages)
      .where(and(
        eq(messages.workspaceId, workspaceId),
        eq(messages.direction, 'inbound'),
        gte(messages.sentAt, since7d),
      ))
      .orderBy(desc(messages.sentAt))
      .limit(3),

      db.select({
        id:              importJobs.id,
        filename:        importJobs.filename,
        status:          importJobs.status,
        newContacts:     importJobs.newContacts,
        skippedContacts: importJobs.skippedContacts,
        updatedAt:       importJobs.updatedAt,
      })
      .from(importJobs)
      .where(and(eq(importJobs.workspaceId, workspaceId), gte(importJobs.updatedAt, since7d)))
      .orderBy(desc(importJobs.updatedAt))
      .limit(3),

      db.select({
        id:        contacts.id,
        firstName: contacts.firstName,
        lastName:  contacts.lastName,
        city:      contacts.city,
        country:   contacts.country,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), gte(contacts.createdAt, since7d)))
      .orderBy(desc(contacts.createdAt))
      .limit(3),
    ])

    const events: { id: string; type: string; title: string; meta: string; timestamp: string }[] = []

    for (const c of recentCampaigns) {
      if (c.status === 'running' || c.status === 'scheduled') {
        events.push({
          id:        `campaign-launch-${c.id}`,
          type:      'campaign_launched',
          title:     `${c.name} ${c.status === 'running' ? 'launched' : 'scheduled'}`,
          meta:      `${c.recipientsCount.toLocaleString()} recipients`,
          timestamp: c.updatedAt.toISOString(),
        })
      } else if (c.status === 'completed') {
        events.push({
          id:        `campaign-done-${c.id}`,
          type:      'campaign_completed',
          title:     `${c.name} completed`,
          meta:      `${c.recipientsCount.toLocaleString()} sent Â· ${c.readRate.toFixed(1)}% read rate`,
          timestamp: c.updatedAt.toISOString(),
        })
      }
    }

    for (const r of recentReplies) {
      events.push({
        id:        `reply-${r.id}`,
        type:      'reply_received',
        title:     'Contact replied',
        meta:      r.replyContent ? r.replyContent.slice(0, 60) : 'Inbound message received',
        timestamp: (r.repliedAt ?? r.sentAt).toISOString(),
      })
    }

    for (const imp of recentImports) {
      if (imp.status === 'done') {
        events.push({
          id:        `import-${imp.id}`,
          type:      'import_done',
          title:     'Contact import completed',
          meta:      `${imp.newContacts} new Â· ${imp.skippedContacts} skipped`,
          timestamp: imp.updatedAt.toISOString(),
        })
      }
    }

    for (const c of recentContacts) {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'New contact'
      const location = [c.city, c.country].filter(Boolean).join(', ')
      events.push({
        id:        `contact-${c.id}`,
        type:      'contact_added',
        title:     `${name} added`,
        meta:      location || '+1 contact',
        timestamp: c.createdAt.toISOString(),
      })
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ events: events.slice(0, 8) })
  } catch (err) {
    console.error('GET /api/dashboard/activity:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


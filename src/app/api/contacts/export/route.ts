export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, contacts } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const { searchParams } = new URL(request.url)
    const idsParam  = searchParams.get('ids')    // comma-separated IDs for bulk export
    const status    = searchParams.get('status') // filter by status
    const tier      = searchParams.get('tier')   // filter by engagement tier

    const conditions = [eq(contacts.workspaceId, user.workspaceId)]
    if (status && status !== 'all') conditions.push(eq(contacts.status, status as 'active' | 'opted_out' | 'blocked'))
    if (tier)   conditions.push(eq(contacts.engagementTier, tier))

    let rows
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean)
      rows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.workspaceId, user.workspaceId), inArray(contacts.id, ids)))
        .orderBy(contacts.createdAt)
    } else {
      rows = await db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(contacts.createdAt)
        .limit(50_000)
    }

    // Build CSV
    const headers = [
      'id', 'phone', 'firstName', 'lastName', 'email',
      'country', 'city', 'status', 'engagementTier', 'engagementScore',
      'tags', 'notes', 'customFields', 'createdAt', 'lastActive',
    ]

    const csvRows = [
      headers.join(','),
      ...rows.map(row => [
        escapeCsv(row.id),
        escapeCsv(row.phone),
        escapeCsv(row.firstName),
        escapeCsv(row.lastName),
        escapeCsv(row.email),
        escapeCsv(row.country),
        escapeCsv(row.city),
        escapeCsv(row.status),
        escapeCsv(row.engagementTier),
        escapeCsv(row.engagementScore),
        escapeCsv(Array.isArray(row.tags) ? row.tags.join(';') : ''),
        escapeCsv(row.notes),
        escapeCsv(row.customFields ? JSON.stringify(row.customFields) : ''),
        escapeCsv(row.createdAt.toISOString()),
        escapeCsv(row.lastActive?.toISOString() ?? ''),
      ].join(',')),
    ]

    const csv      = csvRows.join('\r\n')
    const filename = `contacts-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('GET /api/contacts/export:', err)
    return serverErrorJson()
  }
}

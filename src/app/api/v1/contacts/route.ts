import { NextRequest } from 'next/server'
import { db, contacts } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { authenticateApiKey, hasPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'contacts', 'read')) return forbiddenResponse()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.workspaceId, auth.workspaceId))
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset)

    const filtered = status ? rows.filter(c => c.status === status) : rows

    return Response.json({
      data: filtered.map(mapContact),
      meta: { limit, offset },
    })
  } catch (err) {
    console.error('GET /api/v1/contacts:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) return unauthorizedResponse()
  if (!hasPermission(auth, 'contacts', 'write')) return forbiddenResponse()

  try {
    const body = await request.json()
    const items: unknown[] = Array.isArray(body) ? body : [body]

    if (items.length > 1000) {
      return Response.json({ error: 'Max 1000 contacts per request' }, { status: 400 })
    }

    const rows: (typeof contacts.$inferInsert)[] = []
    const errors: string[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>
      const rawPhone = ((item.phone as string) ?? '').trim()

      if (!rawPhone) { errors.push(`Item ${i}: phone is required`); continue }

      let e164: string | null = null
      try {
        if (isValidPhoneNumber(rawPhone)) {
          e164 = parsePhoneNumber(rawPhone).format('E.164')
        } else if (isValidPhoneNumber(rawPhone, 'NG')) {
          e164 = parsePhoneNumber(rawPhone, 'NG').format('E.164')
        }
      } catch { /* invalid */ }

      if (!e164) { errors.push(`Item ${i}: invalid phone "${rawPhone}"`); continue }

      rows.push({
        workspaceId:  auth.workspaceId,
        phone:        e164,
        firstName:    (item.firstName ?? item.first_name ?? null) as string | null,
        lastName:     (item.lastName  ?? item.last_name  ?? null) as string | null,
        status:       (item.status ?? 'active') as string,
        tags:         (item.tags ?? []) as string[],
        customFields: (item.customFields ?? item.custom_fields ?? {}) as Record<string, string>,
      })
    }

    let upserted = 0
    const CHUNK = 500
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      await db.insert(contacts).values(chunk)
        .onConflictDoUpdate({
          target: [contacts.workspaceId, contacts.phone],
          set: {
            firstName:    contacts.firstName,
            lastName:     contacts.lastName,
            status:       contacts.status,
            tags:         contacts.tags,
            customFields: contacts.customFields,
          },
        })
      upserted += chunk.length
    }

    return Response.json(
      { success: true, upserted, errors: errors.slice(0, 20) },
      { status: errors.length > 0 && upserted === 0 ? 400 : 201 }
    )
  } catch (err) {
    console.error('POST /api/v1/contacts:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function mapContact(row: typeof contacts.$inferSelect) {
  return {
    id:           row.id,
    phone:        row.phone,
    firstName:    row.firstName,
    lastName:     row.lastName,
    status:       row.status,
    tags:         row.tags ?? [],
    customFields: row.customFields ?? {},
    createdAt:    row.createdAt,
    lastActive:   row.lastActive,
  }
}

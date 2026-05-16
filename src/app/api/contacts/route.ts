export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, contacts } from '@/lib/db'
import { eq, and, desc, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getSessionUser, unauthorizedJson, badRequestJson, serverErrorJson } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const conditions = [eq(contacts.workspaceId, user.workspaceId)]
    if (status) conditions.push(eq(contacts.status, status))
    if (search) {
      conditions.push(
        or(
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
          ilike(contacts.phone, `%${search}%`),
        )!
      )
    }

    const rows = await db.select().from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.createdAt))
      .limit(limit).offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts).where(and(...conditions))

    return NextResponse.json({ contacts: rows.map(mapContact), total: count })
  } catch (err) {
    console.error('GET /api/contacts:', err)
    return serverErrorJson()
  }
}

const createSchema = z.object({
  phone:        z.string().min(7),
  firstName:    z.string().optional(),
  lastName:     z.string().optional(),
  status:       z.enum(['active', 'opted_out', 'bounced', 'unverified']).optional(),
  tags:         z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return badRequestJson(parsed.error.issues[0].message)

    const { phone, firstName, lastName, status, tags, customFields } = parsed.data

    const [contact] = await db
      .insert(contacts)
      .values({
        workspaceId: user.workspaceId,
        phone,
        firstName: firstName ?? null,
        lastName:  lastName  ?? null,
        status:    status ?? 'active',
        tags:      tags ?? [],
        customFields: customFields ?? {},
      })
      .onConflictDoUpdate({
        target: [contacts.workspaceId, contacts.phone],
        set: { firstName, lastName, status, tags, customFields, lastActive: new Date() },
      })
      .returning()

    return NextResponse.json({ contact: mapContact(contact) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/contacts:', err)
    return serverErrorJson()
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
    createdAt:    row.createdAt.toISOString(),
    lastActive:   row.lastActive?.toISOString() ?? null,
  }
}


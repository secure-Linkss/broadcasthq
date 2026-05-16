import { NextRequest, NextResponse } from 'next/server'
import { db, templates } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson } from '@/lib/session'
import { mapTemplate } from '@/lib/mappers'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const category = searchParams.get('category')

  try {
    const conditions: any[] = [eq(templates.workspaceId, user.workspaceId!)]
    if (status)   conditions.push(eq(templates.status, status))
    if (category) conditions.push(eq(templates.category, category))

    const rows = await db
      .select()
      .from(templates)
      .where(and(...conditions))
      .orderBy(desc(templates.createdAt))

    return NextResponse.json({ templates: rows.map(mapTemplate) })
  } catch (err) {
    console.error('GET /api/templates:', err)
    return serverErrorJson()
  }
}

const createSchema = z.object({
  name:      z.string().min(1).max(512),
  category:  z.string().default('MARKETING'),
  language:  z.string().default('en_US'),
  content:   z.string().min(1),
  variables: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (['viewer'].includes(user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const [row] = await db.insert(templates).values({
      workspaceId: user.workspaceId!,
      ...parsed.data,
      variables: parsed.data.variables ?? [],
      status:    'pending',
    }).returning()

    return NextResponse.json({ template: mapTemplate(row) }, { status: 201 })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 })
    }
    console.error('POST /api/templates:', err)
    return serverErrorJson()
  }
}


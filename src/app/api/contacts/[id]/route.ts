export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, contacts } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['owner', 'admin', 'super_admin', 'editor'].includes(user.role)) return forbiddenJson()

  const { id } = await params

  try {
    await db.delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, user.workspaceId!)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/contacts/[id]:', err)
    return serverErrorJson()
  }
}

const patchSchema = z.object({
  firstName:    z.string().optional(),
  lastName:     z.string().optional(),
  email:        z.string().email().optional().nullable(),
  status:       z.enum(['active', 'opted_out', 'bounced', 'unverified']).optional(),
  tags:         z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!['owner', 'admin', 'super_admin', 'editor'].includes(user.role)) return forbiddenJson()

  const { id } = await params

  try {
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const [updated] = await db.update(contacts)
      .set({ ...parsed.data, lastActive: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, user.workspaceId!)))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    return NextResponse.json({ contact: updated })
  } catch (err) {
    console.error('PATCH /api/contacts/[id]:', err)
    return serverErrorJson()
  }
}

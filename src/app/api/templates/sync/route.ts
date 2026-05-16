import { NextResponse } from 'next/server'
import { db, whatsappConnections, templates } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { buildMetaClient } from '@/lib/meta'
import { mapTemplate } from '@/lib/mappers'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const [conn] = await db
      .select({
        wabaId:        whatsappConnections.wabaId,
        phoneNumberId: whatsappConnections.phoneNumberId,
        accessToken:   whatsappConnections.accessToken,
        isActive:      whatsappConnections.isActive,
      })
      .from(whatsappConnections)
      .where(eq(whatsappConnections.workspaceId, user.workspaceId))
      .limit(1)

    if (!conn?.isActive) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 })
    }

    const meta = buildMetaClient({
      access_token:    conn.accessToken!,
      waba_id:         conn.wabaId!,
      phone_number_id: conn.phoneNumberId!,
    })

    const metaTemplates = await meta.listTemplates()

    let synced = 0
    let failed = 0

    for (const t of metaTemplates) {
      const bodyComponent = t.components?.find((c: { type: string }) => c.type === 'BODY')
      const content       = bodyComponent?.text ?? ''
      const variables     = [...(content.matchAll(/\{\{(\d+)\}\}/g))].map((_m, i) => `var${i + 1}`)

      try {
        await db
          .insert(templates)
          .values({
            workspaceId:    user.workspaceId,
            name:           t.name,
            category:       t.category,
            language:       t.language,
            status:         t.status.toLowerCase(),
            content,
            variables,
            metaTemplateId: t.id,
          })
          .onConflictDoUpdate({
            target: [templates.workspaceId, templates.name],
            set: {
              category:       t.category,
              language:       t.language,
              status:         t.status.toLowerCase(),
              content,
              variables,
              metaTemplateId: t.id,
              updatedAt:      new Date(),
            },
          })
        synced++
      } catch (err) {
        console.error('Template upsert error:', err)
        failed++
      }
    }

    const allTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.workspaceId, user.workspaceId))
      .orderBy(templates.createdAt)

    return NextResponse.json({
      success:   true,
      synced,
      failed,
      total:     metaTemplates.length,
      templates: allTemplates.map(mapTemplate),
    })
  } catch (err) {
    console.error('POST /api/templates/sync error:', err)
    return serverErrorJson()
  }
}

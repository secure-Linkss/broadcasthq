export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, whatsappConnections } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, canManage } from '@/lib/session'
import { z } from 'zod'

const schema = z.object({
  wabaId:        z.string().min(1),
  phoneNumberId: z.string().min(1),
  accessToken:   z.string().min(1),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { wabaId, phoneNumberId, accessToken } = parsed.data

    // Verify credentials with Meta Graph API
    let phoneNumber: string | null = null
    let qualityRating: string | null = null
    let messagingLimit: string | null = null

    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,quality_rating,messaging_limit_tier`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const metaData = await metaRes.json()
      if (!metaRes.ok) throw new Error(metaData?.error?.message ?? 'Meta API error')
      phoneNumber    = metaData.display_phone_number ?? null
      qualityRating  = metaData.quality_rating?.toLowerCase() ?? null
      messagingLimit = metaData.messaging_limit_tier ?? null
    } catch (err) {
      return NextResponse.json(
        { error: `Meta verification failed: ${(err as Error).message}` },
        { status: 400 }
      )
    }

    // Upsert connection
    await db.insert(whatsappConnections).values({
      workspaceId:        user.workspaceId!,
      wabaId,
      phoneNumberId,
      phoneNumber,
      accessToken,
      verificationStatus: 'verified',
      qualityRating,
      messagingLimit,
      isActive:           true,
    }).onConflictDoUpdate({
      target:  whatsappConnections.workspaceId,
      set: {
        wabaId, phoneNumberId, phoneNumber, accessToken,
        verificationStatus: 'verified',
        qualityRating, messagingLimit, isActive: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, phoneNumber, qualityRating, messagingLimit })
  } catch (err) {
    console.error('POST /api/settings/whatsapp/connect:', err)
    return serverErrorJson()
  }
}


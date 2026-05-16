import { NextRequest, NextResponse } from 'next/server'
import { db, whatsappConnections } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, canManage } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const [conn] = await db
      .select()
      .from(whatsappConnections)
      .where(eq(whatsappConnections.workspaceId, user.workspaceId!))
      .limit(1)

    if (!conn) {
      return NextResponse.json({
        status: { isConnected: false, verificationStatus: 'unverified' },
      })
    }

    return NextResponse.json({
      status: {
        isConnected:        conn.isActive,
        phoneNumber:        conn.phoneNumber,
        wabaId:             conn.wabaId,
        phoneNumberId:      conn.phoneNumberId,
        verificationStatus: conn.verificationStatus,
        qualityRating:      conn.qualityRating,
        messagingLimit:     conn.messagingLimit,
      },
    })
  } catch (err) {
    console.error('GET /api/settings/whatsapp:', err)
    return serverErrorJson()
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const body = await request.json()
    const allowed: Record<string, unknown> = {}
    if ('isActive' in body) allowed.isActive = Boolean(body.isActive)
    if ('qualityRating' in body) allowed.qualityRating = body.qualityRating
    if ('messagingLimit' in body) allowed.messagingLimit = body.messagingLimit

    await db.update(whatsappConnections)
      .set({ ...allowed, updatedAt: new Date() })
      .where(eq(whatsappConnections.workspaceId, user.workspaceId!))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/settings/whatsapp:', err)
    return serverErrorJson()
  }
}

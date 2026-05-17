export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, serverErrorJson, badRequestJson } from '@/lib/session'

// Avatar upload: accepts base64 data URL, stores directly in DB (no external storage needed)
// For production at scale, swap with S3/Cloudflare R2 signed upload
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    const body = await request.json()
    const { dataUrl } = body as { dataUrl?: string }

    if (!dataUrl) return badRequestJson('dataUrl is required')

    // Validate it's a base64 image
    if (!dataUrl.startsWith('data:image/')) {
      return badRequestJson('Invalid image format')
    }

    // Enforce max size ~2MB (base64 overhead ~33%)
    if (dataUrl.length > 2_800_000) {
      return badRequestJson('Image too large. Max 2MB.')
    }

    const allowed = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/gif']
    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/)
    if (!mimeMatch || !allowed.some(a => dataUrl.startsWith(a))) {
      return badRequestJson('Only JPEG, PNG, WebP, or GIF allowed')
    }

    const [updated] = await db.update(users)
      .set({ avatarUrl: dataUrl })
      .where(eq(users.id, user.id))
      .returning({ avatarUrl: users.avatarUrl })

    return NextResponse.json({ avatarUrl: updated.avatarUrl })
  } catch (err) {
    console.error('POST /api/profile/avatar:', err)
    return serverErrorJson()
  }
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()

  try {
    await db.update(users).set({ avatarUrl: null }).where(eq(users.id, user.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/profile/avatar:', err)
    return serverErrorJson()
  }
}

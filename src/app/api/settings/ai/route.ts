export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson, canManage } from '@/lib/session'
import { encryptApiKey, decryptApiKey, aiComplete, AI_PROVIDER_OPTIONS } from '@/lib/ai-provider'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const [ws] = await db
      .select({ aiProvider: workspaces.aiProvider, aiApiKey: workspaces.aiApiKey, aiModel: workspaces.aiModel })
      .from(workspaces)
      .where(eq(workspaces.id, user.workspaceId))
      .limit(1)

    return NextResponse.json({
      provider:      ws?.aiProvider ?? 'none',
      hasApiKey:     !!(ws?.aiApiKey),
      // Return masked key: show last 4 chars only
      maskedKey:     ws?.aiApiKey ? `...${decryptApiKey(ws.aiApiKey).slice(-4)}` : null,
      model:         ws?.aiModel ?? null,
      providerOptions: AI_PROVIDER_OPTIONS.map(p => ({ value: p.value, label: p.label, modelPlaceholder: p.modelPlaceholder, keyPlaceholder: p.keyPlaceholder, docsUrl: p.docsUrl })),
    })
  } catch (err) {
    console.error('GET /api/settings/ai:', err)
    return serverErrorJson()
  }
}

const patchSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google', 'nvidia', 'none']),
  apiKey:   z.string().max(500).optional(),
  model:    z.string().max(100).optional().nullable(),
})

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()
  if (!canManage(user.role)) return forbiddenJson()

  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { provider, apiKey, model } = parsed.data

    const [current] = await db
      .select({ aiApiKey: workspaces.aiApiKey })
      .from(workspaces)
      .where(eq(workspaces.id, user.workspaceId))
      .limit(1)

    // If no new key provided, keep existing
    const encryptedKey = apiKey
      ? encryptApiKey(apiKey)
      : (provider === 'none' ? null : current?.aiApiKey ?? null)

    await db
      .update(workspaces)
      .set({
        aiProvider: provider,
        aiApiKey:   encryptedKey,
        aiModel:    model ?? null,
        updatedAt:  new Date(),
      })
      .where(eq(workspaces.id, user.workspaceId))

    return NextResponse.json({ success: true, provider })
  } catch (err) {
    console.error('PATCH /api/settings/ai:', err)
    return serverErrorJson()
  }
}

// Test the configured AI provider
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const body = await request.json() as { provider?: string; apiKey?: string; model?: string }
    const { provider, apiKey, model } = body

    if (!provider || !apiKey || provider === 'none') {
      return NextResponse.json({ error: 'provider and apiKey required' }, { status: 400 })
    }

    const result = await aiComplete(
      { provider: provider as 'anthropic' | 'openai' | 'google' | 'nvidia', apiKey, model: model ?? null },
      [{ role: 'user', content: 'Reply with exactly: {"status":"ok","provider":"' + provider + '"}' }],
    )

    const jsonMatch = result.match(/\{[^}]*\}/)
    return NextResponse.json({ success: true, response: jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.slice(0, 100) } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

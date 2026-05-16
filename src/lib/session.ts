// Server-side session helpers (replaces Supabase createClient)
import { auth } from '@/lib/auth'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'

export interface SessionUser {
  id:          string
  email:       string
  name:        string
  role:        string
  workspaceId: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id || !session.user.workspaceId) return null
  return {
    id:          session.user.id,
    email:       session.user.email!,
    name:        session.user.name ?? '',
    role:        session.user.role,
    workspaceId: session.user.workspaceId,
  }
}

export function unauthorizedJson() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenJson(msg = 'Insufficient permissions') {
  return Response.json({ error: msg }, { status: 403 })
}

export function notFoundJson(resource = 'Resource') {
  return Response.json({ error: `${resource} not found` }, { status: 404 })
}

export function serverErrorJson(msg = 'Internal server error') {
  return Response.json({ error: msg }, { status: 500 })
}

export function badRequestJson(msg: string) {
  return Response.json({ error: msg }, { status: 400 })
}

export function canManage(role: string): boolean {
  return ['owner', 'admin', 'super_admin'].includes(role)
}

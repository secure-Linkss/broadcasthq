import {
  Campaign,
  Contact,
  Template,
  TeamMember,
  Invoice,
  BillingPlan,
  Workspace,
  WhatsAppConnectionStatus,
  AnalyticsSummary,
  ApiKey,
} from '@/types'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? `API error ${res.status}`)
  return data as T
}

// ─── Public API client ────────────────────────────────────────────────────────

export const api = {
  campaigns: {
    list: async (): Promise<Campaign[]> => {
      const data = await apiFetch<{ campaigns: Campaign[] }>('/api/campaigns')
      return data.campaigns
    },

    getById: async (id: string): Promise<Campaign | undefined> => {
      const data = await apiFetch<{ campaign: Campaign }>(`/api/campaigns/${id}`)
      return data.campaign
    },

    create: async (payload: {
      name: string
      templateName: string
      templateVariables?: Record<string, string>
      scheduledDate?: string
      tags?: string[]
    }): Promise<Campaign> => {
      const data = await apiFetch<{ campaign: Campaign }>('/api/campaigns/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return data.campaign
    },

    update: async (id: string, payload: Partial<Campaign>): Promise<Campaign> => {
      const data = await apiFetch<{ campaign: Campaign }>(`/api/campaigns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      return data.campaign
    },

    send: async (campaignId: string): Promise<{ totalContacts: number }> => {
      return apiFetch('/api/campaigns/send', {
        method: 'POST',
        body: JSON.stringify({ campaignId }),
      })
    },

    delete: async (id: string): Promise<void> => {
      await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    },
  },

  contacts: {
    list: async (params?: { status?: string; tag?: string; search?: string; limit?: number; offset?: number }): Promise<Contact[]> => {
      const qs = new URLSearchParams(params as Record<string, string> ?? {}).toString()
      const data = await apiFetch<{ contacts: Contact[]; total: number }>(`/api/contacts${qs ? `?${qs}` : ''}`)
      return data.contacts
    },

    create: async (payload: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> => {
      const data = await apiFetch<{ contact: Contact }>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return data.contact
    },

    importCsv: async (file: File): Promise<{ imported: number; skipped: number; errors: string[] }> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/api/contacts/upload`, { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed')
      return data
    },

    suggestMapping: async (file: File): Promise<{
      headers: string[]
      suggestion: Record<string, unknown>
      preview: Record<string, string>[]
    }> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/api/contacts/import-ai`, { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Mapping failed')
      return data
    },

    importWithMapping: async (file: File, mapping: Record<string, unknown>): Promise<{ imported: number; skipped: number; jobId: string }> => {
      const form = new FormData()
      form.append('file', file)
      form.append('mapping', JSON.stringify(mapping))
      const res = await fetch(`${BASE}/api/contacts/import-ai`, { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Import failed')
      return data
    },
  },

  templates: {
    list: async (): Promise<Template[]> => {
      const data = await apiFetch<{ templates: Template[] }>('/api/templates')
      return data.templates
    },

    sync: async (): Promise<{ synced: number; templates: Template[] }> => {
      return apiFetch('/api/templates/sync', { method: 'POST' })
    },
  },

  team: {
    list: async (): Promise<TeamMember[]> => {
      const data = await apiFetch<{ members: TeamMember[] }>('/api/team')
      return data.members
    },

    invite: async (email: string, role: string, name?: string): Promise<{ success: boolean }> => {
      return apiFetch('/api/team', {
        method: 'POST',
        body: JSON.stringify({ email, role, name }),
      })
    },

    updateRole: async (memberId: string, role: string): Promise<{ success: boolean }> => {
      return apiFetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
    },

    remove: async (memberId: string): Promise<{ success: boolean }> => {
      return apiFetch(`/api/team/${memberId}`, { method: 'DELETE' })
    },
  },

  analytics: {
    getSummary: async (range?: '7d' | '30d' | '90d'): Promise<AnalyticsSummary> => {
      const data = await apiFetch<{ summary: AnalyticsSummary }>(`/api/analytics${range ? `?range=${range}` : ''}`)
      return data.summary
    },

    getDetailed: async (range?: '7d' | '30d' | '90d') => {
      return apiFetch(`/api/analytics${range ? `?range=${range}` : ''}`)
    },
  },

  settings: {
    getWhatsAppStatus: async (): Promise<WhatsAppConnectionStatus> => {
      const data = await apiFetch<{ status: WhatsAppConnectionStatus }>('/api/settings/whatsapp')
      return data.status
    },

    connectWhatsApp: async (payload: {
      wabaId: string
      phoneNumberId: string
      accessToken: string
    }): Promise<{ success: boolean; phoneNumber: string }> => {
      return apiFetch('/api/settings/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  },

  keys: {
    list: async (): Promise<ApiKey[]> => {
      const data = await apiFetch<{ keys: ApiKey[] }>('/api/keys')
      return data.keys
    },

    create: async (payload: {
      name: string
      permissions?: Record<string, string[]>
      expiresAt?: string
    }): Promise<{ key: ApiKey; secret: string }> => {
      return apiFetch('/api/keys', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },

    revoke: async (id: string): Promise<{ success: boolean }> => {
      return apiFetch(`/api/keys/${id}`, { method: 'DELETE' })
    },

    update: async (id: string, payload: { name?: string; isActive?: boolean; permissions?: Record<string, string[]> }): Promise<ApiKey> => {
      const data = await apiFetch<{ key: ApiKey }>(`/api/keys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      return data.key
    },
  },
}

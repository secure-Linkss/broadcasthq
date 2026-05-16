export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed'

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  recipientsCount: number
  deliveryRate: number
  readRate: number
  failCount: number
  sentDate?: string
  scheduledDate?: string
  createdAt: string
  tags: string[]
  templateName?: string
  templateVariables?: Record<string, string>
}

export interface Message {
  id: string
  campaignId: string
  contactId: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied'
  content: string
  sentAt: string
  deliveredAt?: string
  readAt?: string
  errorReason?: string
}

export type ContactStatus = 'active' | 'opted_out' | 'bounced' | 'unverified'
export type EngagementTier = 'vip' | 'active' | 'warm' | 'cold' | 'inactive'

export interface Contact {
  id: string
  phone: string
  firstName?: string
  lastName?: string
  email?: string | null
  city?: string | null
  country?: string | null
  status: ContactStatus
  tags: string[]
  customFields: Record<string, string>
  createdAt: string
  lastActive?: string | null
  engagementScore?: number
  engagementTier?: EngagementTier
  totalMessagesReceived?: number
  totalMessagesRead?: number
  totalReplies?: number
  lastEngagedAt?: string | null
  notes?: string | null
}

export interface ContactList {
  id: string
  name: string
  contactCount: number
  createdAt: string
}

export interface ImportJob {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  processedRows: number
  newContacts: number
  updatedContacts: number
  skippedContacts: number
  createdAt: string
}

export type TemplateStatus = 'approved' | 'pending' | 'rejected'

export interface Template {
  id: string
  name: string
  category: string
  language: string
  status: TemplateStatus
  content: string
  variables: string[]
}

export interface BillingPlan {
  id: string
  name: string
  price: number
  currency: string
  features: string[]
  limits: {
    contacts: number
    messages: number
    campaigns: number
  }
}

export interface Invoice {
  id: string
  date: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  pdfUrl?: string
}

export type Role = 'owner' | 'admin' | 'editor' | 'viewer'

export interface TeamMember {
  id: string
  email: string
  name: string
  role: Role
  status: 'active' | 'invited'
  lastActive?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export interface Workspace {
  id: string
  name: string
  avatarUrl?: string
  planId: string
}

export interface WhatsAppConnectionStatus {
  isConnected: boolean
  phoneNumber?: string
  wabaId?: string
  phoneNumberId?: string
  verificationStatus: 'verified' | 'unverified' | 'pending'
  qualityRating?: 'high' | 'medium' | 'low'
  messagingLimit?: string
}

export interface AnalyticsSummary {
  totalMessagesSent: number
  deliveryRate: number
  readRate: number
  activeCampaigns: number
  monthlySpend: number
  totalContacts?: number
  totalCampaigns?: number
}

export interface DailyAnalytics {
  date: string
  sent: number
  delivered: number
  read: number
  failed: number
}

// ─── API Key types ────────────────────────────────────────────────────────────

export interface ApiKeyPermissions {
  campaigns?: ('read' | 'write' | 'run')[]
  contacts?:  ('read' | 'write')[]
  messages?:  ('read')[]
  analytics?: ('read')[]
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: ApiKeyPermissions
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
}

export interface CreateApiKeyResponse {
  key: ApiKey
  secret: string
  warning: string
}

// ─── WhatsApp Connection ──────────────────────────────────────────────────────

export interface WhatsAppConnection {
  id: string
  workspaceId: string
  wabaId: string
  phoneNumberId: string
  phoneNumber: string
  verificationStatus: 'verified' | 'unverified' | 'pending'
  qualityRating?: 'high' | 'medium' | 'low'
  messagingLimit?: string
  isActive: boolean
}

// ─── v1 External API response wrappers ───────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export interface ApiErrorResponse {
  error: string
  code?: string
}

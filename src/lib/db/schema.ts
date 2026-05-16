import {
  pgTable, uuid, text, timestamp, boolean,
  integer, real, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── WORKSPACES ───────────────────────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  name:                 text('name').notNull(),
  avatarUrl:            text('avatar_url'),
  planId:               text('plan_id').notNull().default('free'),
  stripeCustomerId:     text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId:        text('stripe_price_id'),
  subscriptionStatus:   text('subscription_status').default('inactive'),
  billingPeriodEnd:     timestamp('billing_period_end'),
  isActive:             boolean('is_active').notNull().default(true),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
})

// ─── USERS ────────────────────────────────────────────────────────────────────
// role: 'super_admin' | 'owner' | 'admin' | 'editor' | 'viewer'
// status: 'active' | 'suspended' | 'invited'
export const users = pgTable('users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  workspaceId:   uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  email:         text('email').notNull().unique(),
  passwordHash:  text('password_hash'),
  name:          text('name'),
  role:          text('role').notNull().default('owner'),
  status:        text('status').notNull().default('active'),
  lastActive:    timestamp('last_active'),
  emailVerified: timestamp('email_verified'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('users_workspace_idx').on(t.workspaceId),
  emailIdx:     uniqueIndex('users_email_idx').on(t.email),
}))

// ─── WHATSAPP CONNECTIONS ─────────────────────────────────────────────────────
export const whatsappConnections = pgTable('whatsapp_connections', {
  id:                 uuid('id').defaultRandom().primaryKey(),
  workspaceId:        uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  wabaId:             text('waba_id'),
  phoneNumberId:      text('phone_number_id'),
  phoneNumber:        text('phone_number'),
  accessToken:        text('access_token'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  qualityRating:      text('quality_rating'),
  messagingLimit:     text('messaging_limit'),
  isActive:           boolean('is_active').notNull().default(false),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: uniqueIndex('wa_connections_workspace_idx').on(t.workspaceId),
}))

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
export const templates = pgTable('templates', {
  id:             uuid('id').defaultRandom().primaryKey(),
  workspaceId:    uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  category:       text('category').notNull().default('MARKETING'),
  language:       text('language').notNull().default('en_US'),
  status:         text('status').notNull().default('pending'),
  content:        text('content').notNull(),
  variables:      jsonb('variables').$type<string[]>().default([]),
  metaTemplateId: text('meta_template_id'),
  // ── New engagement intelligence columns ───────────────────────────────────
  folder:         text('folder').default('General'),
  isFavorite:     boolean('is_favorite').notNull().default(false),
  usageCount:     integer('usage_count').notNull().default(0),
  description:    text('description'),
  previewData:    jsonb('preview_data').$type<Record<string, string>>().default({}),
  avgDeliveryRate: real('avg_delivery_rate').default(0),
  avgReadRate:    real('avg_read_rate').default(0),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('templates_workspace_idx').on(t.workspaceId),
  nameIdx:      uniqueIndex('templates_name_idx').on(t.workspaceId, t.name),
}))

// ─── CAMPAIGNS ────────────────────────────────────────────────────────────────
export const campaigns = pgTable('campaigns', {
  id:                uuid('id').defaultRandom().primaryKey(),
  workspaceId:       uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:              text('name').notNull(),
  status:            text('status').notNull().default('draft'),
  templateId:        uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
  templateName:      text('template_name'),
  templateVariables: jsonb('template_variables').$type<Record<string, string>>().default({}),
  recipientsCount:   integer('recipients_count').notNull().default(0),
  deliveryRate:      real('delivery_rate').notNull().default(0),
  readRate:          real('read_rate').notNull().default(0),
  failCount:         integer('fail_count').notNull().default(0),
  sentDate:          timestamp('sent_date'),
  scheduledDate:     timestamp('scheduled_date'),
  tags:              jsonb('tags').$type<string[]>().default([]),
  // ── New engagement intelligence columns ───────────────────────────────────
  replyCount:        integer('reply_count').notNull().default(0),
  clickCount:        integer('click_count').notNull().default(0),
  engagementScore:   real('engagement_score').default(0),
  audienceFilter:    jsonb('audience_filter').$type<Record<string, unknown>>().default({}),
  estimatedReach:    integer('estimated_reach').default(0),
  description:       text('description'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('campaigns_workspace_idx').on(t.workspaceId),
  statusIdx:    index('campaigns_status_idx').on(t.workspaceId, t.status),
}))

// ─── CONTACTS ─────────────────────────────────────────────────────────────────
export const contacts = pgTable('contacts', {
  id:           uuid('id').defaultRandom().primaryKey(),
  workspaceId:  uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  phone:        text('phone').notNull(),
  firstName:    text('first_name'),
  lastName:     text('last_name'),
  status:       text('status').notNull().default('active'),
  tags:         jsonb('tags').$type<string[]>().default([]),
  customFields: jsonb('custom_fields').$type<Record<string, string>>().default({}),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  lastActive:   timestamp('last_active'),
  // ── New engagement intelligence columns ───────────────────────────────────
  engagementScore:          integer('engagement_score').notNull().default(0),
  // tier: 'vip' | 'active' | 'warm' | 'cold' | 'inactive'
  engagementTier:           text('engagement_tier').notNull().default('cold'),
  totalMessagesReceived:    integer('total_messages_received').notNull().default(0),
  totalMessagesRead:        integer('total_messages_read').notNull().default(0),
  totalReplies:             integer('total_replies').notNull().default(0),
  lastEngagedAt:            timestamp('last_engaged_at'),
  city:                     text('city'),
  country:                  text('country'),
  email:                    text('email'),
  notes:                    text('notes'),
}, (t) => ({
  workspaceIdx: index('contacts_workspace_idx').on(t.workspaceId),
  phoneIdx:     uniqueIndex('contacts_phone_idx').on(t.workspaceId, t.phone),
  statusIdx:    index('contacts_status_idx').on(t.workspaceId, t.status),
  tierIdx:      index('contacts_tier_idx').on(t.workspaceId, t.engagementTier),
}))

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const messages = pgTable('messages', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  campaignId:  uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  contactId:   uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  status:      text('status').notNull().default('pending'),
  content:     text('content'),
  twilioSid:   text('twilio_sid'),
  sentAt:      timestamp('sent_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
  readAt:      timestamp('read_at'),
  errorReason: text('error_reason'),
  // ── New engagement tracking columns ───────────────────────────────────────
  repliedAt:   timestamp('replied_at'),
  replyContent: text('reply_content'),
  direction:   text('direction').notNull().default('outbound'), // 'outbound' | 'inbound'
}, (t) => ({
  workspaceIdx:  index('messages_workspace_idx').on(t.workspaceId),
  campaignIdx:   index('messages_campaign_idx').on(t.campaignId),
  contactIdx:    index('messages_contact_idx').on(t.contactId),
  twilioSidIdx:  index('messages_twilio_sid_idx').on(t.twilioSid),
  sentAtIdx:     index('messages_sent_at_idx').on(t.workspaceId, t.sentAt),
}))

// ─── API KEYS ─────────────────────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  keyPrefix:   text('key_prefix').notNull(),
  keyHash:     text('key_hash').notNull().unique(),
  permissions: jsonb('permissions').$type<Record<string, string[]>>().notNull().default({
    campaigns: ['read', 'run'],
    contacts:  ['read', 'write'],
    messages:  ['read'],
    analytics: ['read'],
  }),
  isActive:   boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt:  timestamp('expires_at'),
  createdBy:  uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('api_keys_workspace_idx').on(t.workspaceId),
  hashIdx:      uniqueIndex('api_keys_hash_idx').on(t.keyHash),
}))

// ─── IMPORT JOBS ─────────────────────────────────────────────────────────────
export const importJobs = pgTable('import_jobs', {
  id:              uuid('id').defaultRandom().primaryKey(),
  workspaceId:     uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  filename:        text('filename').notNull(),
  status:          text('status').notNull().default('pending'),
  totalRows:       integer('total_rows').notNull().default(0),
  processedRows:   integer('processed_rows').notNull().default(0),
  newContacts:     integer('new_contacts').notNull().default(0),
  updatedContacts: integer('updated_contacts').notNull().default(0),
  skippedContacts: integer('skipped_contacts').notNull().default(0),
  errors:          jsonb('errors').$type<string[]>().default([]),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
})

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  userId:      uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action:      text('action').notNull(),
  resource:    text('resource').notNull(),
  resourceId:  text('resource_id'),
  metadata:    jsonb('metadata').$type<Record<string, unknown>>().default({}),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('audit_logs_workspace_idx').on(t.workspaceId),
  createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
}))

// ─── RELATIONS ────────────────────────────────────────────────────────────────
export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  users:               many(users),
  campaigns:           many(campaigns),
  contacts:            many(contacts),
  messages:            many(messages),
  templates:           many(templates),
  apiKeys:             many(apiKeys),
  importJobs:          many(importJobs),
  whatsappConnections: many(whatsappConnections),
}))

export const usersRelations = relations(users, ({ one }) => ({
  workspace: one(workspaces, { fields: [users.workspaceId], references: [workspaces.id] }),
}))

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [campaigns.workspaceId], references: [workspaces.id] }),
  template:  one(templates,  { fields: [campaigns.templateId],  references: [templates.id] }),
  messages:  many(messages),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [contacts.workspaceId], references: [workspaces.id] }),
  messages:  many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  workspace: one(workspaces, { fields: [messages.workspaceId], references: [workspaces.id] }),
  campaign:  one(campaigns,  { fields: [messages.campaignId],  references: [campaigns.id] }),
  contact:   one(contacts,   { fields: [messages.contactId],   references: [contacts.id] }),
}))

// ─── BOT BLOCKS ──────────────────────────────────────────────────────────────
export const botBlocks = pgTable('bot_blocks', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  pattern:     text('pattern').notNull(),
  type:        text('type').notNull().default('phone'),
  reason:      text('reason'),
  blockedBy:   uuid('blocked_by').references(() => users.id, { onDelete: 'set null' }),
  isGlobal:    boolean('is_global').notNull().default(false),
  hitCount:    integer('hit_count').notNull().default(0),
  lastHitAt:   timestamp('last_hit_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('bot_blocks_workspace_idx').on(t.workspaceId),
  patternIdx:   index('bot_blocks_pattern_idx').on(t.pattern),
}))

// ─── WEBHOOKS ─────────────────────────────────────────────────────────────────
export const webhooks = pgTable('webhooks', {
  id:          uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  url:         text('url').notNull(),
  secret:      text('secret'),
  events:      jsonb('events').$type<string[]>().default([]),
  isActive:    boolean('is_active').notNull().default(true),
  failCount:   integer('fail_count').notNull().default(0),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastStatus:  integer('last_status'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('webhooks_workspace_idx').on(t.workspaceId),
}))

// ─── PLAN LIMITS ─────────────────────────────────────────────────────────────
export const PLAN_LIMITS: Record<string, { contacts: number; messages: number; campaigns: number; users: number; apiAccess: boolean }> = {
  free:       { contacts: 500,    messages: 1_000,   campaigns: 5,   users: 1,  apiAccess: false },
  starter:    { contacts: 5_000,  messages: 10_000,  campaigns: 20,  users: 3,  apiAccess: true  },
  pro:        { contacts: 25_000, messages: 50_000,  campaigns: -1,  users: 10, apiAccess: true  },
  enterprise: { contacts: -1,     messages: -1,      campaigns: -1,  users: -1, apiAccess: true  },
}

export const STRIPE_PLANS = [
  { id: 'free',       name: 'Free',       price: 0,   priceId: null,                            features: ['1,000 messages/mo', '500 contacts', '5 campaigns', '1 user'] },
  { id: 'starter',    name: 'Starter',    price: 29,  priceId: process.env.STRIPE_STARTER_PRICE_ID,    features: ['10,000 messages/mo', '5,000 contacts', '20 campaigns', '3 users', 'API access'] },
  { id: 'pro',        name: 'Pro',        price: 79,  priceId: process.env.STRIPE_PRO_PRICE_ID,        features: ['50,000 messages/mo', '25,000 contacts', 'Unlimited campaigns', '10 users', 'AI import', 'Priority support'] },
  { id: 'enterprise', name: 'Enterprise', price: 199, priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, features: ['Unlimited messages', 'Unlimited contacts', 'Unlimited campaigns', 'Unlimited users', 'Custom domain', 'Dedicated support'] },
]

# 🚀 BroadcastHQ Backend Handover Document

> **To: Claude Code (or Backend Engineer)**  
> **From: Frontend Development Agent**  
> **Subject: Backend Integration & Database Implementation Guide**

The frontend of **BroadcastHQ** (a WhatsApp Broadcast SaaS) is completely built, styled, and production-ready. It currently runs entirely on mock data injected through a centralized API layer (`src/lib/api/index.ts`). 

Your job is to build the backend (presumably using **Supabase** + Next.js Server Actions or Route Handlers), create the database schema, and replace the mocked functions in `src/lib/api/index.ts` with real database calls.

---

## 🏗️ 1. Database Schema Requirements

Based on the frontend data models defined in `src/types/index.ts`, you need to construct the following tables in the relational database. Please ensure you enforce Row Level Security (RLS) linked to the user's `workspace_id`.

### Tables to Create:

**1. `campaigns`**
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, Foreign Key)
- `name` (String)
- `status` (Enum: `draft`, `scheduled`, `running`, `completed`, `failed`)
- `recipients_count` (Integer)
- `delivery_rate` (Float)
- `read_rate` (Float)
- `fail_count` (Integer)
- `sent_date` (Timestampz, nullable)
- `scheduled_date` (Timestampz, nullable)
- `tags` (Array of Strings)
- `created_at` (Timestampz)

**2. `contacts`**
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, Foreign Key)
- `phone` (String, Unique per workspace)
- `first_name` (String, nullable)
- `last_name` (String, nullable)
- `status` (Enum: `active`, `opted_out`, `bounced`, `unverified`)
- `tags` (Array of Strings)
- `custom_fields` (JSONB - e.g., `{ "company": "Acme" }`)
- `created_at` (Timestampz)
- `last_active` (Timestampz, nullable)

**3. `messages`** (For the Inbox and Campaign tracking)
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, nullable)
- `contact_id` (UUID, Foreign Key)
- `workspace_id` (UUID, Foreign Key)
- `status` (Enum: `sent`, `delivered`, `read`, `failed`, `replied`)
- `content` (Text)
- `sent_at` (Timestampz)
- `delivered_at` (Timestampz, nullable)
- `read_at` (Timestampz, nullable)
- `error_reason` (Text, nullable)

**4. `templates`** (Synced with Meta WhatsApp Manager)
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, Foreign Key)
- `name` (String)
- `category` (String - `MARKETING`, `UTILITY`, `AUTHENTICATION`)
- `language` (String - e.g., `en_US`)
- `status` (Enum: `approved`, `pending`, `rejected`)
- `content` (Text)
- `variables` (Array of Strings)

**5. `team_members`**
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, Foreign Key)
- `user_id` (UUID, Foreign Key to Auth table)
- `email` (String)
- `name` (String)
- `role` (Enum: `owner`, `admin`, `editor`, `viewer`)
- `status` (Enum: `active`, `invited`)
- `last_active` (Timestampz, nullable)

**6. `workspaces` & `whatsapp_connections`**
- Create tables to hold the Workspace profile, Stripe `plan_id`, and the `waba_id`, `phone_number_id`, and `access_token` for the Meta WhatsApp Cloud API.

---

## 🔌 2. API Integration Mapping

All frontend components currently consume data from `src/lib/api/index.ts`. You must replace the Promise-based mocks in this file with your actual database queries.

### A. Campaigns API
- `api.campaigns.list()`: Needs to return `Campaign[]`. Make sure to map snake_case DB columns to camelCase TS interfaces.
- `api.campaigns.getById(id)`: Needs to return a single `Campaign` joined with its delivery analytics.
- *(To Build)* `api.campaigns.create(payload)`: Endpoint to save a new campaign draft from `src/app/(dashboard)/campaigns/new/page.tsx`.

### B. Contacts API
- `api.contacts.list()`: Needs to return `Contact[]`.
- *(To Build)* `api.contacts.importCSV(file)`: Needs a backend handler to parse CSV, identify columns, merge `custom_fields` into a JSONB object, and bulk-upsert into Supabase.

### C. Templates API
- `api.templates.list()`: Needs to return `Template[]`.
- *(To Build)* `api.templates.sync()`: Needs a backend worker to hit the `graph.facebook.com/v19.0/{waba_id}/message_templates` endpoint and update the database statuses (pending -> approved).

### D. Team API
- `api.team.list()`: Needs to return `TeamMember[]` for the workspace.

### E. Settings & Config
- `api.settings.getWhatsAppStatus()`: Returns `WhatsAppConnectionStatus` (verified, wabaId, etc.).

---

## 🤖 3. Critical Backend Engines to Build

Beyond just CRUD, the frontend expects the following background engines to be operational:

1. **WhatsApp Webhook Listener:**
   - Create a route (e.g., `app/api/webhooks/whatsapp/route.ts`).
   - Must verify the hub signature from Meta.
   - Must listen for `messages` (incoming replies for the Inbox UI) and `statuses` (delivered/read receipts to update `Campaign` and `Message` tables).

2. **Broadcast Dispatch Engine:**
   - When a campaign is marked as `running`, you need a queue worker (e.g., Inngest, Trigger.dev, or Supabase Edge Functions) to batch process the `recipients_count`.
   - Iterate through `contacts`, replace `{{1}}` template variables with `contact.custom_fields`, and post to the WhatsApp Cloud API `/messages` endpoint.

3. **AI Contact Import:**
   - The UI at `/contacts/import` has a simulated AI mapping step. Connect this to an OpenAI/Claude endpoint on the backend that reads the CSV headers and suggests mappings to `firstName`, `lastName`, `phone`, and `custom_fields`.

---

## 🛠️ 4. Immediate Next Steps for Claude

1. **Setup Auth:** Integrate Supabase SSR Auth into `src/app/(auth)/login/page.tsx` and `signup/page.tsx`.
2. **Database:** Run the SQL to generate the schema defined above.
3. **Rewrite API Layer:** Open `src/lib/api/index.ts` and replace every `setTimeout` with a Supabase client fetch (e.g., `supabase.from('campaigns').select('*')`).
4. **Test Data Flow:** Ensure the Dashboard Overview, Campaigns List, and Contacts List populate with real database rows.

# WhatsApp Broadcast SaaS

A multi-tenant SaaS platform for sending WhatsApp broadcast messages at scale. Built with Next.js 14, Supabase, and Twilio.

## Features

- 🔐 Multi-tenant auth (Supabase Auth, each company isolated by `tenant_id`)
- 📁 CSV contact import with E.164 phone number validation
- 📢 Campaign creation with dynamic template variables
- 🚀 Bulk message sending (10 msg/batch, 1s delay between batches)
- 📊 Analytics dashboard (sent, delivered, read, failed rates)
- 🔔 Twilio webhook handler for live status updates
- 🧪 Demo mode (full UI flow without real Twilio credentials)

---

## Quick Start

### 1. Install dependencies

```bash
cd whatsapp-saas
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials. Set `DEMO_MODE=true` to run without Twilio.

### 3. Set up Supabase database

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the full contents of:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Copy your **Project URL** and **anon key** into `.env.local`
4. Copy your **service role key** into `.env.local` (used by the register API)

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Twilio Setup (Production)

1. Create a [Twilio account](https://twilio.com)
2. Enable the **WhatsApp Sandbox** (Messaging → Senders → WhatsApp) for testing
3. Set your status callback URL to: `https://your-domain/api/webhooks/whatsapp`
4. Add your credentials to `.env.local`

### Local webhook testing with ngrok

```bash
ngrok http 3000
# Set NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok-free.app in .env.local
```

---

## CSV Import Format

```csv
name,phone_number,opt_in
John Doe,+2348012345678,true
Jane Smith,08098765432,true
Anonymous,,false
```

- `phone_number`: E.164 format (`+234...`) or Nigerian local numbers (auto-converted)
- `opt_in`: optional — defaults to `true`
- Duplicate phone numbers are silently skipped (upsert)

---

## Message Templates

Use `{{variable_name}}` placeholders in your template body:

```
Hello {{name}}, your exclusive offer {{promo}} expires in 24 hours! Reply STOP to opt out.
```

- `{{name}}` is automatically filled from the contact's name field
- Other variables are set at campaign creation time (same value for all recipients)

---

## Architecture

```
src/
├── app/
│   ├── login/                    ← Auth pages
│   ├── register/
│   ├── dashboard/
│   │   ├── page.tsx              ← Analytics overview
│   │   ├── contacts/page.tsx     ← Contact list + CSV upload
│   │   └── campaigns/
│   │       ├── page.tsx          ← Campaign list
│   │       ├── new/page.tsx      ← Create campaign form
│   │       └── [id]/page.tsx     ← Campaign detail + send
│   └── api/
│       ├── auth/register/        ← Tenant + user creation
│       ├── contacts/upload/      ← CSV parsing + bulk insert
│       ├── campaigns/create/     ← Campaign creation
│       ├── campaigns/send/       ← Batch send loop
│       └── webhooks/whatsapp/    ← Twilio status callbacks
├── components/dashboard/
│   ├── Sidebar.tsx
│   ├── ContactsUpload.tsx
│   ├── ContactsPageClient.tsx
│   └── CampaignDetailClient.tsx
└── lib/
    ├── supabase/client.ts        ← Browser client
    ├── supabase/server.ts        ← Server client + admin client
    └── twilio.ts                 ← Send helper + demo mode

supabase/migrations/001_initial_schema.sql   ← Full schema + RLS
```

---

## Scaling Beyond MVP

| Feature | Current | Production Path |
|---|---|---|
| Queue | In-process batch loop | BullMQ + Redis |
| Auth | Supabase email/password | Add OAuth (Google) |
| Rate limits | 1s delay between batches | Redis rate limiter per tenant |
| Contacts | 100k via CSV | Streaming import, pagination |
| Analytics | Aggregate counts | Time-series charts |
| Billing | — | Stripe per-message pricing |

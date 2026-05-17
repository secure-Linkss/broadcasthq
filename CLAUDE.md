@AGENTS.md

# BroadcastHQ — Claude Code Session Defaults

## Communication Style
CAVEMAN MODE ACTIVE (full). Terse fragments OK. Drop filler words and pleasantries.
Use Agent subagents for broad codebase research or multi-file exploration to protect main context.
Spawn Explore agent for searches that need 3+ queries. Use Grep/Glob directly for targeted lookups.

## Project
WhatsApp Broadcast SaaS — `c:\Users\User\Desktop\Projects\whatsapp-saas\whatsapp-saas`
- Next.js 14 App Router, TypeScript, Drizzle ORM + Neon Postgres (NOT Supabase)
- NextAuth v5 beta (`auth()`, `getSessionUser()`)
- Multi-tenant: all queries scoped by `workspaceId`
- ALL API routes: `export const dynamic = 'force-dynamic'`
- Production: https://broadcasthq.vercel.app (GitHub: secure-Linkss/broadcasthq)

## Hard Rules
- NO mock data, fake analytics, hardcoded metrics, placeholder responses — ever
- NO simplified versions
- NO `company` column on contacts table (put company in customFields)
- DB: Neon Postgres. Schema in `src/lib/db/schema.ts`
- Auth: `getSessionUser()` from `src/lib/session.ts`
- Session helpers: `unauthorizedJson()`, `forbiddenJson()`, `serverErrorJson()`

## CSV Import Architecture
- `src/lib/csv-mapper.ts` — rule-based mapper (Levenshtein + alias sets + data heuristics)
- `mapCsvColumns(headers, sampleRows)` returns `MappingResult` with `needsAiFallback: boolean`
- Upload route (`/api/contacts/upload`): use mapper directly, no AI
- AI import route (`/api/contacts/import-ai`): rule-based first; AI only if `needsAiFallback: true`

## Key Files
- `src/lib/db/schema.ts` — all DB tables
- `src/lib/session.ts` — auth helpers
- `src/lib/ai-provider.ts` — multi-provider AI (Anthropic, OpenAI, Google, NVIDIA)
- `src/lib/csv-mapper.ts` — rule-based CSV column mapper
- `src/components/layout/Sidebar.tsx` — main nav with real avatar
- `src/components/layout/Topbar.tsx` — notifications (real DB, 30s polling)
- `src/app/(dashboard)/` — all dashboard pages
- `src/app/(marketing)/` — marketing pages (features, pricing, about, docs)
- `src/app/admin/` — admin panel (role: super_admin)
- `src/app/api/` — all API routes

## Contacts Schema Fields
phone, firstName, lastName, email, country, city, notes, tags (jsonb string[]),
status (active/opted_out/blocked), customFields (jsonb), engagementScore, engagementTier

## Stripe / Meta / AI Keys
Not set in local env. Configured in Vercel. See memory for full env var list.

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, contacts, importJobs, workspaces } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { parse } from 'csv-parse/sync'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { aiComplete, getWorkspaceAiConfig, getPlatformFallbackConfig } from '@/lib/ai-provider'
import { mapCsvColumns } from '@/lib/csv-mapper'

const CSV_SYSTEM_PROMPT = `You are an expert data mapper for a WhatsApp CRM called BroadcastHQ.
Map CSV column headers to contact fields: phone (required), firstName, lastName, fullName, email, country, city, notes, tags, optIn, and customFields (for anything else).
Return ONLY valid JSON. Be precise.`

async function suggestWithAi(
  headers: string[],
  aiConfig: { provider: string; apiKey: string; model?: string | null },
) {
  const result = await aiComplete(
    aiConfig as Parameters<typeof aiComplete>[0],
    [{
      role: 'user',
      content: `CSV headers: ${JSON.stringify(headers)}\n\nReturn JSON:\n{"phone":"col_or_null","firstName":"col_or_null","lastName":"col_or_null","fullName":"col_or_null","email":"col_or_null","country":"col_or_null","city":"col_or_null","notes":"col_or_null","tags":"col_or_null","optIn":"col_or_null","customFields":{"our_field":"csv_col"},"confidence":0.0,"explanation":"brief"}`,
    }],
    CSV_SYSTEM_PROMPT,
  )
  const jsonMatch = result.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in AI response')
  return JSON.parse(jsonMatch[0])
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const formData    = await request.formData()
    const file        = formData.get('file') as File | null
    const mappingJson = formData.get('mapping') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    let rows: Record<string, string>[]

    try {
      rows = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    if (rows.length === 0) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })

    const headers = Object.keys(rows[0])

    // ── Phase 1: generate column mapping suggestion ───────────────────────────
    if (!mappingJson) {
      const samples = rows.slice(0, 10)

      // Rule-based mapper runs first — fast, free, no AI key needed
      const ruleMapping = mapCsvColumns(headers, samples)

      if (!ruleMapping.needsAiFallback) {
        // High confidence: skip AI entirely
        return NextResponse.json({
          phase:    'suggest',
          source:   'rule-based',
          headers,
          preview:  rows.slice(0, 3),
          suggestion: {
            phone:        ruleMapping.phone,
            firstName:    ruleMapping.firstName,
            lastName:     ruleMapping.lastName,
            fullName:     ruleMapping.fullName,
            email:        ruleMapping.email,
            country:      ruleMapping.country,
            city:         ruleMapping.city,
            notes:        ruleMapping.notes,
            tags:         ruleMapping.tags,
            optIn:        ruleMapping.optIn,
            customFields: ruleMapping.customFields,
            confidence:   ruleMapping.confidence,
            explanation:  ruleMapping.explanation,
          },
        })
      }

      // Low confidence: try AI fallback
      const [ws] = await db
        .select({ aiProvider: workspaces.aiProvider, aiApiKey: workspaces.aiApiKey, aiModel: workspaces.aiModel })
        .from(workspaces)
        .where(eq(workspaces.id, user.workspaceId))
        .limit(1)

      const aiConfig = getWorkspaceAiConfig(ws ?? { aiProvider: null, aiApiKey: null, aiModel: null })
        ?? getPlatformFallbackConfig()

      if (!aiConfig) {
        // Return partial rule-based result with warning
        return NextResponse.json({
          phase:   'suggest',
          source:  'rule-based-partial',
          headers,
          preview: rows.slice(0, 3),
          warning: 'Low confidence mapping. Configure an AI provider in Settings → AI Provider for better results.',
          suggestion: {
            phone:        ruleMapping.phone,
            firstName:    ruleMapping.firstName,
            lastName:     ruleMapping.lastName,
            fullName:     ruleMapping.fullName,
            email:        ruleMapping.email,
            country:      ruleMapping.country,
            city:         ruleMapping.city,
            notes:        ruleMapping.notes,
            tags:         ruleMapping.tags,
            optIn:        ruleMapping.optIn,
            customFields: ruleMapping.customFields,
            confidence:   ruleMapping.confidence,
            explanation:  ruleMapping.explanation,
          },
        })
      }

      try {
        const aiSuggestion = await suggestWithAi(headers, aiConfig)
        return NextResponse.json({
          phase:      'suggest',
          source:     'ai',
          provider:   aiConfig.provider,
          headers,
          preview:    rows.slice(0, 3),
          suggestion: aiSuggestion,
        })
      } catch {
        // AI failed — fall back to rule-based result
        return NextResponse.json({
          phase:   'suggest',
          source:  'rule-based-fallback',
          headers,
          preview: rows.slice(0, 3),
          warning: 'AI mapping failed. Using smart auto-detection instead.',
          suggestion: {
            phone:        ruleMapping.phone,
            firstName:    ruleMapping.firstName,
            lastName:     ruleMapping.lastName,
            fullName:     ruleMapping.fullName,
            email:        ruleMapping.email,
            country:      ruleMapping.country,
            city:         ruleMapping.city,
            notes:        ruleMapping.notes,
            tags:         ruleMapping.tags,
            optIn:        ruleMapping.optIn,
            customFields: ruleMapping.customFields,
            confidence:   ruleMapping.confidence,
            explanation:  ruleMapping.explanation,
          },
        })
      }
    }

    // ── Phase 2: apply confirmed mapping and import ───────────────────────────
    const mapping: {
      phone:        string | null
      firstName?:   string | null
      lastName?:    string | null
      fullName?:    string | null
      email?:       string | null
      country?:     string | null
      city?:        string | null
      notes?:       string | null
      tags?:        string | null
      optIn?:       string | null
      customFields: Record<string, string>
    } = JSON.parse(mappingJson)

    if (!mapping.phone) {
      return NextResponse.json({ error: 'Phone column mapping is required' }, { status: 400 })
    }

    // Create import job
    const [job] = await db
      .insert(importJobs)
      .values({
        workspaceId: user.workspaceId,
        filename:    file.name,
        status:      'processing',
        totalRows:   rows.length,
      })
      .returning({ id: importJobs.id })

    if (!job) return serverErrorJson()

    const contactRows: (typeof contacts.$inferInsert)[] = []
    const errors: string[] = []
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const row      = rows[i]
      const rawPhone = (row[mapping.phone!] ?? '').trim()

      if (!rawPhone) {
        errors.push(`Row ${i + 2}: missing phone`)
        skipped++
        continue
      }

      let e164: string | null = null
      try {
        if (isValidPhoneNumber(rawPhone)) {
          e164 = parsePhoneNumber(rawPhone).format('E.164')
        } else if (isValidPhoneNumber(rawPhone, 'NG')) {
          e164 = parsePhoneNumber(rawPhone, 'NG').format('E.164')
        }
      } catch { /* invalid */ }

      if (!e164) {
        errors.push(`Row ${i + 2}: invalid phone "${rawPhone}"`)
        skipped++
        continue
      }

      // Resolve name fields
      let firstName: string | null = mapping.firstName
        ? (row[mapping.firstName] ?? '').trim() || null
        : null

      let lastName: string | null = mapping.lastName
        ? (row[mapping.lastName] ?? '').trim() || null
        : null

      if (!firstName && !lastName && mapping.fullName) {
        const parts = (row[mapping.fullName] ?? '').trim().split(/\s+/)
        firstName = parts[0] || null
        lastName  = parts.slice(1).join(' ') || null
      }

      // Opt-in
      const optInRaw = mapping.optIn ? (row[mapping.optIn] ?? '').toLowerCase().trim() : ''
      const optIn    = optInRaw
        ? !['false', '0', 'no', 'n', 'off', 'inactive', 'unsubscribed'].includes(optInRaw)
        : true

      // Tags — split comma-separated values
      const tagsRaw = mapping.tags ? (row[mapping.tags] ?? '').trim() : ''
      const tags    = tagsRaw ? tagsRaw.split(/[,;|]/).map(t => t.trim()).filter(Boolean) : []

      // Custom fields
      const customFields: Record<string, string> = {}
      for (const [ourField, csvHeader] of Object.entries(mapping.customFields ?? {})) {
        const val = (row[csvHeader] ?? '').trim()
        if (val) customFields[ourField] = val
      }

      contactRows.push({
        workspaceId: user.workspaceId,
        phone:       e164,
        firstName,
        lastName,
        email:       mapping.email   ? ((row[mapping.email]   ?? '').trim() || null) : null,
        country:     mapping.country ? ((row[mapping.country] ?? '').trim() || null) : null,
        city:        mapping.city    ? ((row[mapping.city]    ?? '').trim() || null) : null,
        notes:       mapping.notes   ? ((row[mapping.notes]   ?? '').trim() || null) : null,
        tags,
        status:      optIn ? 'active' : 'opted_out',
        customFields,
      })
    }

    let newContacts = 0
    const CHUNK = 500

    for (let i = 0; i < contactRows.length; i += CHUNK) {
      const chunk    = contactRows.slice(i, i + CHUNK)
      const upserted = await db
        .insert(contacts)
        .values(chunk)
        .onConflictDoUpdate({
          target: [contacts.workspaceId, contacts.phone],
          set: {
            firstName:    contacts.firstName,
            lastName:     contacts.lastName,
            email:        contacts.email,
            country:      contacts.country,
            city:         contacts.city,
            notes:        contacts.notes,
            customFields: contacts.customFields,
          },
        })
        .returning({ id: contacts.id })
      newContacts += upserted.length
    }

    // Mark import job complete
    await db
      .update(importJobs)
      .set({
        status:          'completed',
        processedRows:   contactRows.length + skipped,
        newContacts,
        skippedContacts: skipped,
        errors:          errors.slice(0, 50),
        updatedAt:       new Date(),
      })
      .where(eq(importJobs.id, job.id))

    return NextResponse.json({
      phase:    'imported',
      jobId:    job.id,
      total:    rows.length,
      imported: newContacts,
      skipped,
      errors:   errors.slice(0, 20),
    })
  } catch (err) {
    console.error('POST /api/contacts/import-ai error:', err)
    return serverErrorJson()
  }
}

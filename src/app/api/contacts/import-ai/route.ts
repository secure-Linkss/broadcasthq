import { NextRequest, NextResponse } from 'next/server'
import { db, contacts, importJobs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { suggestCsvMapping } from '@/lib/anthropic'
import { parse } from 'csv-parse/sync'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

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

    // Phase 1: return AI column mapping suggestions
    if (!mappingJson) {
      const suggestion = await suggestCsvMapping(headers)
      return NextResponse.json({
        phase:      'suggest',
        headers,
        suggestion,
        preview:    rows.slice(0, 3),
      })
    }

    // Phase 2: apply confirmed mapping and import
    const mapping: {
      phone:        string | null
      firstName:    string | null
      lastName:     string | null
      customFields: Record<string, string>
    } = JSON.parse(mappingJson)

    if (!mapping.phone) {
      return NextResponse.json({ error: 'phone column mapping is required' }, { status: 400 })
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
      const rawPhone = (row[mapping.phone] ?? '').trim()

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

      const customFields: Record<string, string> = {}
      for (const [ourField, csvHeader] of Object.entries(mapping.customFields ?? {})) {
        if (row[csvHeader] !== undefined) customFields[ourField] = row[csvHeader]
      }

      contactRows.push({
        workspaceId:  user.workspaceId,
        phone:        e164,
        firstName:    mapping.firstName ? (row[mapping.firstName] ?? null) : null,
        lastName:     mapping.lastName  ? (row[mapping.lastName]  ?? null) : null,
        status:       'active',
        tags:         [],
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

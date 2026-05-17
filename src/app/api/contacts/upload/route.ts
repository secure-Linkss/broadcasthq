export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, contacts } from '@/lib/db'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { parse } from 'csv-parse/sync'
import { mapCsvColumns } from '@/lib/csv-mapper'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    let rows: Record<string, string>[]

    try {
      rows = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    if (rows.length === 0) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })

    const headers  = Object.keys(rows[0])
    const samples  = rows.slice(0, 10)
    const mapping  = mapCsvColumns(headers, samples)

    if (!mapping.phone) {
      return NextResponse.json({
        error: 'Could not detect a phone column. Rename your column to "phone", "mobile", "whatsapp", etc.',
        headers,
        detected: mapping.explanation,
      }, { status: 422 })
    }

    const contactRows: (typeof contacts.$inferInsert)[] = []
    const errors: string[] = []
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rawPhone = (row[mapping.phone!] ?? '').trim()

      if (!rawPhone) {
        errors.push(`Row ${i + 2}: missing phone number`)
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

      // Resolve first/last name — split fullName if no dedicated columns
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

      // Custom fields (everything not mapped to a known column)
      const customFields: Record<string, string> = {}
      for (const [key, csvHeader] of Object.entries(mapping.customFields)) {
        const val = (row[csvHeader] ?? '').trim()
        if (val) customFields[key] = val
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

    let imported   = 0
    let duplicates = 0
    const CHUNK    = 500

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

      imported   += upserted.length
      duplicates += chunk.length - upserted.length
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      duplicates,
      errors:  errors.slice(0, 20),
      mapping: {
        confidence:  mapping.confidence,
        explanation: mapping.explanation,
        fields: {
          phone:     mapping.phone,
          firstName: mapping.firstName,
          lastName:  mapping.lastName,
          fullName:  mapping.fullName,
          email:     mapping.email,
          country:   mapping.country,
          city:      mapping.city,
          notes:     mapping.notes,
          tags:      mapping.tags,
          optIn:     mapping.optIn,
          custom:    Object.keys(mapping.customFields).length,
        },
      },
    })
  } catch (err) {
    console.error('Upload error:', err)
    return serverErrorJson()
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db, contacts } from '@/lib/db'
import { getSessionUser, unauthorizedJson, forbiddenJson, serverErrorJson } from '@/lib/session'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { parse } from 'csv-parse/sync'

interface CsvRow {
  [key: string]: string | undefined
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorizedJson()
  if (!user.workspaceId) return forbiddenJson()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    let rows: CsvRow[]

    try {
      rows = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    const knownCols = new Set(['phone','phone_number','mobile','telephone','first_name','firstName','last_name','lastName','name','opt_in'])

    const contactRows: (typeof contacts.$inferInsert)[] = []
    const errors: string[] = []
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rawPhone = (row.phone ?? row.phone_number ?? row.mobile ?? row.telephone ?? '').trim()

      const firstName = (row.first_name ?? row.firstName ?? row.name ?? '').trim() || null
      const lastName  = (row.last_name  ?? row.lastName  ?? '').trim() || null
      const optIn     = row.opt_in
        ? !['false', '0', 'no', 'n'].includes(row.opt_in.toLowerCase())
        : true

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

      const customFields: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        if (!knownCols.has(k) && v !== undefined && v !== '') {
          customFields[k] = v
        }
      }

      contactRows.push({
        workspaceId:  user.workspaceId,
        phone:        e164,
        firstName,
        lastName,
        status:       optIn ? 'active' : 'opted_out',
        tags:         [],
        customFields,
      })
    }

    let imported   = 0
    let duplicates = 0
    const CHUNK = 500

    for (let i = 0; i < contactRows.length; i += CHUNK) {
      const chunk = contactRows.slice(i, i + CHUNK)
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

      imported   += upserted.length
      duplicates += chunk.length - upserted.length
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      duplicates,
      errors:  errors.slice(0, 20),
    })
  } catch (err) {
    console.error('Upload error:', err)
    return serverErrorJson()
  }
}

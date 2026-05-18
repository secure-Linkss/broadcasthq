export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db, contacts } from '@/lib/db'
import { and, eq, inArray } from 'drizzle-orm'
import { getSessionUser } from '@/lib/session'

const COUNTRY_CODES: Record<string, string> = {
  '1':    'US/CA', '7':  'RU',  '20':  'EG',  '27':  'ZA', '30':  'GR',
  '31':   'NL',    '32': 'BE',  '33':  'FR',   '34':  'ES', '36':  'HU',
  '39':   'IT',    '40': 'RO',  '41':  'CH',   '43':  'AT', '44':  'UK',
  '45':   'DK',    '46': 'SE',  '47':  'NO',   '48':  'PL', '49':  'DE',
  '51':   'PE',    '52': 'MX',  '53':  'CU',   '54':  'AR', '55':  'BR',
  '56':   'CL',    '57': 'CO',  '58':  'VE',   '60':  'MY', '61':  'AU',
  '62':   'ID',    '63': 'PH',  '64':  'NZ',   '65':  'SG', '66':  'TH',
  '81':   'JP',    '82': 'KR',  '84':  'VN',   '86':  'CN', '90':  'TR',
  '91':   'IN',    '92': 'PK',  '93':  'AF',   '94':  'LK', '95':  'MM',
  '98':   'IR',   '212': 'MA', '213': 'DZ',   '216': 'TN','218': 'LY',
  '220':  'GM',  '221': 'SN', '222': 'MR',   '223': 'ML', '224': 'GN',
  '225':  'CI',  '226': 'BF', '227': 'NE',   '228': 'TG', '229': 'BJ',
  '230':  'MU',  '231': 'LR', '232': 'SL',   '233': 'GH', '234': 'NG',
  '235':  'TD',  '236': 'CF', '237': 'CM',   '238': 'CV', '239': 'ST',
  '240':  'GQ',  '241': 'GA', '242': 'CG',   '243': 'CD', '244': 'AO',
  '245':  'GW',  '246': 'IO', '247': 'AC',   '248': 'SC', '249': 'SD',
  '250':  'RW',  '251': 'ET', '252': 'SO',   '253': 'DJ', '254': 'KE',
  '255':  'TZ',  '256': 'UG', '257': 'BI',   '258': 'MZ', '260': 'ZM',
  '261':  'MG',  '263': 'ZW', '264': 'NA',   '265': 'MW', '266': 'LS',
  '267':  'BW',  '268': 'SZ', '269': 'KM',   '297': 'AW', '298': 'FO',
  '351':  'PT',  '352': 'LU', '353': 'IE',   '354': 'IS', '355': 'AL',
  '356':  'MT',  '357': 'CY', '358': 'FI',   '359': 'BG', '370': 'LT',
  '371':  'LV',  '372': 'EE', '373': 'MD',   '374': 'AM', '375': 'BY',
  '376':  'AD',  '377': 'MC', '378': 'SM',   '380': 'UA', '381': 'RS',
  '382':  'ME',  '385': 'HR', '386': 'SI',   '387': 'BA', '389': 'MK',
  '420':  'CZ',  '421': 'SK', '423': 'LI',   '500': 'FK', '501': 'BZ',
  '502':  'GT',  '503': 'SV', '504': 'HN',   '505': 'NI', '506': 'CR',
  '507':  'PA',  '509': 'HT', '590': 'GP',   '591': 'BO', '592': 'GY',
  '593':  'EC',  '594': 'GF', '595': 'PY',   '596': 'MQ', '597': 'SR',
  '598':  'UY',  '599': 'AN', '670': 'TL',   '672': 'NF', '673': 'BN',
  '674':  'NR',  '675': 'PG', '676': 'TO',   '677': 'SB', '678': 'VU',
  '679':  'FJ',  '680': 'PW', '681': 'WF',   '682': 'CK', '683': 'NU',
  '685':  'WS',  '686': 'KI', '687': 'NC',   '688': 'TV', '689': 'PF',
  '690':  'TK',  '691': 'FM', '692': 'MH',   '850': 'KP', '852': 'HK',
  '853':  'MO',  '855': 'KH', '856': 'LA',   '880': 'BD', '886': 'TW',
  '960':  'MV',  '961': 'LB', '962': 'JO',   '963': 'SY', '964': 'IQ',
  '965':  'KW',  '966': 'SA', '967': 'YE',   '968': 'OM', '970': 'PS',
  '971':  'AE',  '972': 'IL', '973': 'BH',   '974': 'QA', '975': 'BT',
  '976':  'MN',  '977': 'NP', '992': 'TJ',   '993': 'TM', '994': 'AZ',
  '995':  'GE',  '996': 'KG', '998': 'UZ',
}

function detectCountry(e164: string): string | null {
  const digits = e164.replace('+', '')
  for (const [prefix, country] of Object.entries(COUNTRY_CODES).sort((a, b) => b[0].length - a[0].length)) {
    if (digits.startsWith(prefix)) return country
  }
  return null
}

function normalizeNumber(raw: string): string | null {
  let s = raw.replace(/[\s\-().]/g, '')
  s = s.replace(/[^\d+]/g, '')
  if (!s.startsWith('+')) s = '+' + s
  s = s.replace(/[^+\d]/g, '')
  return s
}

type Status = 'valid' | 'invalid_format' | 'duplicate' | 'too_short' | 'too_long'

const E164_RE = /^\+[1-9]\d{6,14}$/

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const numbers: string[] = body.numbers ?? []
    const workspaceId: string = user.workspaceId!

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'No numbers provided' }, { status: 400 })
    }

    const seen = new Set<string>()
    const validNormalized: string[] = []

    type ResultEntry = { original: string; normalized: string | null; status: Status; country: string | null; inContacts: boolean }
    const results: ResultEntry[] = numbers.map(original => {
      const norm = normalizeNumber(original)

      if (!norm || norm.length < 8) {
        return { original, normalized: null, status: 'too_short' as Status, country: null, inContacts: false }
      }
      if (norm.length > 16) {
        return { original, normalized: norm, status: 'too_long' as Status, country: null, inContacts: false }
      }
      if (!E164_RE.test(norm)) {
        return { original, normalized: norm, status: 'invalid_format' as Status, country: null, inContacts: false }
      }
      if (seen.has(norm)) {
        return { original, normalized: norm, status: 'duplicate' as Status, country: detectCountry(norm), inContacts: false }
      }
      seen.add(norm)
      validNormalized.push(norm)
      return { original, normalized: norm, status: 'valid' as Status, country: detectCountry(norm), inContacts: false }
    })

    // DB check for existing contacts
    if (validNormalized.length > 0) {
      try {
        const existing = await db
          .select({ phone: contacts.phone })
          .from(contacts)
          .where(and(eq(contacts.workspaceId, workspaceId), inArray(contacts.phone, validNormalized)))

        const existingSet = new Set(existing.map(e => e.phone))
        for (const r of results) {
          if (r.normalized && existingSet.has(r.normalized)) r.inContacts = true
        }
      } catch {
        // DB unavailable â€” proceed without contact check
      }
    }

    const stats = {
      valid:      results.filter(r => r.status === 'valid').length,
      invalid:    results.filter(r => r.status !== 'valid' && r.status !== 'duplicate').length,
      duplicates: results.filter(r => r.status === 'duplicate').length,
      inContacts: results.filter(r => r.inContacts).length,
    }

    return NextResponse.json({ results, stats })
  } catch (err) {
    console.error('Validator error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


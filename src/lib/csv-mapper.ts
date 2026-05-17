/**
 * Rule-based CSV column mapper.
 * Maps arbitrary CSV headers to known contact fields using
 * fuzzy matching + pattern scoring. AI is the fallback for
 * low-confidence cases — not the default.
 */

export type ContactField = 'phone' | 'firstName' | 'lastName' | 'fullName' | 'email' | 'country' | 'city' | 'company' | 'tags' | 'notes' | 'optIn' | 'custom'

export interface FieldMapping {
  csvHeader:   string
  targetField: ContactField | null
  confidence:  number   // 0–1
  isCustom:    boolean
}

export interface MappingResult {
  phone:        string | null
  firstName:    string | null
  lastName:     string | null
  fullName:     string | null
  email:        string | null
  country:      string | null
  city:         string | null
  company:      string | null
  tags:         string | null
  notes:        string | null
  optIn:        string | null
  customFields: Record<string, string>   // target_name → csv_header
  confidence:   number                   // overall mapping confidence 0–1
  explanation:  string
  needsAiFallback: boolean               // true only if critical fields unresolved
}

// ── Alias tables ──────────────────────────────────────────────────────────────

const PHONE_ALIASES = new Set([
  'phone', 'phonenumber', 'phone_number', 'phonenum', 'phone_num',
  'mobile', 'mobilenumber', 'mobile_number', 'mobilenum', 'mob',
  'cell', 'cellphone', 'cell_phone', 'cellnumber', 'cell_number',
  'telephone', 'tel', 'telnumber', 'tel_number',
  'whatsapp', 'whatsappnumber', 'whatsapp_number', 'wa', 'wanumber',
  'contact', 'contactnumber', 'contact_number',
  'number', 'num', 'msisdn', 'subscriber',
  'landline', 'fax',
])

const FIRST_NAME_ALIASES = new Set([
  'firstname', 'first_name', 'first', 'fname', 'forename',
  'given_name', 'givenname', 'name_first', 'firstnm',
  'first name', // after normalization → 'firstname'
  'prenom', 'vorname', 'nombre',
])

const LAST_NAME_ALIASES = new Set([
  'lastname', 'last_name', 'last', 'lname', 'surname', 'family_name',
  'familyname', 'name_last', 'lastnm', 'last name',
  'nom', 'nachname', 'apellido',
])

const FULL_NAME_ALIASES = new Set([
  'name', 'fullname', 'full_name', 'fullnm',
  'customer_name', 'customername', 'contact_name', 'contactname',
  'client_name', 'clientname', 'person_name', 'personname',
  'display_name', 'displayname',
])

const EMAIL_ALIASES = new Set([
  'email', 'emailaddress', 'email_address', 'e_mail', 'mail',
  'emailid', 'email_id', 'e-mail',
])

const COUNTRY_ALIASES = new Set([
  'country', 'countrycode', 'country_code', 'nation', 'nationality',
  'country_name', 'countryname', 'land', 'pais',
])

const CITY_ALIASES = new Set([
  'city', 'town', 'municipality', 'locality', 'district',
  'location', 'loc', 'area', 'region', 'city_name',
])

const COMPANY_ALIASES = new Set([
  'company', 'company_name', 'companyname', 'organization',
  'organisation', 'org', 'business', 'business_name', 'businessname',
  'employer', 'firm', 'enterprise', 'brand',
])

const TAGS_ALIASES = new Set([
  'tags', 'tag', 'labels', 'label', 'groups', 'group',
  'categories', 'category', 'segments', 'segment', 'lists', 'list',
])

const NOTES_ALIASES = new Set([
  'notes', 'note', 'description', 'desc', 'comment', 'comments',
  'remarks', 'remark', 'memo', 'info', 'information', 'details',
  'additional', 'extras',
])

const OPT_IN_ALIASES = new Set([
  'optin', 'opt_in', 'opted_in', 'optedin', 'subscribed', 'subscribe',
  'consent', 'consented', 'active', 'status', 'marketing_opt_in',
  'marketingoptin', 'opted', 'unsubscribed',
])

// ── Normalize ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_]/g, '')   // collapse whitespace, dashes, underscores
    .replace(/[^a-z0-9]/g, '') // strip everything else
}

// ── Levenshtein distance (for fuzzy fallback) ─────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function fuzzyScore(norm: string, aliases: Set<string>): number {
  if (aliases.has(norm)) return 1.0

  // Substring containment
  for (const alias of aliases) {
    if (norm.includes(alias) || alias.includes(norm)) {
      const ratio = Math.min(norm.length, alias.length) / Math.max(norm.length, alias.length)
      if (ratio >= 0.75) return 0.85
    }
  }

  // Levenshtein fuzzy match
  let best = 0
  for (const alias of aliases) {
    if (Math.abs(norm.length - alias.length) > 4) continue // skip obvious mismatches
    const dist  = levenshtein(norm, alias)
    const maxLen = Math.max(norm.length, alias.length)
    const sim    = 1 - dist / maxLen
    if (sim > best) best = sim
  }
  return best >= 0.8 ? best * 0.8 : 0 // discount fuzzy matches slightly
}

// ── Data-sample heuristics ────────────────────────────────────────────────────

const E164_RE    = /^\+?[1-9]\d{6,14}$/
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const COUNTRY_RE = /^[A-Za-z]{2,3}$/  // ISO codes

function sampleScore(samples: string[], field: ContactField): number {
  if (!samples.length) return 0
  const clean = samples.filter(Boolean)
  if (!clean.length) return 0

  switch (field) {
    case 'phone': {
      const matches = clean.filter(s => E164_RE.test(s.replace(/[\s\-().]/g, '')))
      return matches.length / clean.length
    }
    case 'email': {
      const matches = clean.filter(s => EMAIL_RE.test(s))
      return matches.length / clean.length
    }
    case 'optIn': {
      const boolish = ['true','false','yes','no','1','0','y','n','on','off','active','inactive']
      const matches = clean.filter(s => boolish.includes(s.toLowerCase()))
      return matches.length / clean.length
    }
    case 'country': {
      const matches = clean.filter(s => COUNTRY_RE.test(s.trim()))
      return matches.length / clean.length
    }
    default:
      return 0
  }
}

// ── Main mapper ───────────────────────────────────────────────────────────────

const FIELD_ALIAS_MAP: [ContactField, Set<string>][] = [
  ['phone',     PHONE_ALIASES],
  ['firstName', FIRST_NAME_ALIASES],
  ['lastName',  LAST_NAME_ALIASES],
  ['fullName',  FULL_NAME_ALIASES],
  ['email',     EMAIL_ALIASES],
  ['country',   COUNTRY_ALIASES],
  ['city',      CITY_ALIASES],
  ['company',   COMPANY_ALIASES],
  ['tags',      TAGS_ALIASES],
  ['notes',     NOTES_ALIASES],
  ['optIn',     OPT_IN_ALIASES],
]

export function mapCsvColumns(
  headers: string[],
  sampleRows: Record<string, string>[] = [],
  minConfidence = 0.65
): MappingResult {
  const assigned = new Map<ContactField, { header: string; score: number }>()

  for (const header of headers) {
    const norm    = normalize(header)
    const samples = sampleRows.map(r => (r[header] ?? '').trim()).filter(Boolean).slice(0, 10)

    let bestField: ContactField | null  = null
    let bestScore = 0

    for (const [field, aliases] of FIELD_ALIAS_MAP) {
      let score = fuzzyScore(norm, aliases)

      // Boost with data-sample evidence
      const dataBoost = sampleScore(samples, field)
      if (dataBoost > 0) score = Math.min(1, score + dataBoost * 0.2)

      if (score > bestScore) {
        bestScore = score
        bestField = field
      }
    }

    if (bestField && bestScore >= minConfidence) {
      const existing = assigned.get(bestField)
      if (!existing || bestScore > existing.score) {
        assigned.set(bestField, { header, score: bestScore })
      }
    }
  }

  // Resolve full-name → first+last split if no dedicated name cols
  if (assigned.has('fullName') && !assigned.has('firstName') && !assigned.has('lastName')) {
    // Keep fullName; we'll split at import time
  }

  // Build result
  const get = (f: ContactField) => assigned.get(f)?.header ?? null

  const mappedFields = new Set([...assigned.values()].map(v => v.header))
  const customFields: Record<string, string> = {}
  for (const h of headers) {
    if (!mappedFields.has(h)) {
      // Sanitize key: lowercase, replace non-alphanumeric with _
      const key = normalize(h).replace(/[^a-z0-9]/g, '_') || h
      customFields[key] = h
    }
  }

  const criticalFields = [get('phone')]
  const hasCritical    = criticalFields.every(Boolean)
  const avgConfidence  = assigned.size > 0
    ? [...assigned.values()].reduce((s, v) => s + v.score, 0) / assigned.size
    : 0

  const mappedCount   = assigned.size
  const unmappedCount = headers.length - mappedFields.size

  const explanationParts: string[] = []
  if (get('phone'))     explanationParts.push(`phone→"${get('phone')}"`)
  if (get('firstName')) explanationParts.push(`firstName→"${get('firstName')}"`)
  if (get('lastName'))  explanationParts.push(`lastName→"${get('lastName')}"`)
  if (get('fullName'))  explanationParts.push(`fullName→"${get('fullName')}"`)
  if (unmappedCount > 0) explanationParts.push(`${unmappedCount} custom field(s)`)

  return {
    phone:        get('phone'),
    firstName:    get('firstName'),
    lastName:     get('lastName'),
    fullName:     get('fullName'),
    email:        get('email'),
    country:      get('country'),
    city:         get('city'),
    company:      get('company'),
    tags:         get('tags'),
    notes:        get('notes'),
    optIn:        get('optIn'),
    customFields,
    confidence:   Math.round(avgConfidence * 100) / 100,
    explanation:  explanationParts.join(', ') || 'No known fields detected',
    needsAiFallback: !hasCritical && avgConfidence < 0.5,
  }
}

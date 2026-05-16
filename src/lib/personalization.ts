// Personalization & Variable Parser Engine
// Handles {{variable}}, {{variable|fallback}}, date formatting, and message randomization

export interface PersonalizationContext {
  firstName?:       string | null
  lastName?:        string | null
  fullName?:        string | null
  phone?:           string
  email?:           string | null
  city?:            string | null
  country?:         string | null
  businessName?:    string
  agentName?:       string
  invoiceNumber?:   string
  appointmentDate?: string
  [key: string]:    string | null | undefined
}

// All supported built-in variables with descriptions
export const BUILT_IN_VARIABLES: { variable: string; description: string; example: string }[] = [
  { variable: '{{first_name}}',      description: "Contact's first name",          example: 'Sarah'            },
  { variable: '{{last_name}}',       description: "Contact's last name",           example: 'Jenkins'          },
  { variable: '{{full_name}}',       description: "Contact's full name",           example: 'Sarah Jenkins'    },
  { variable: '{{phone}}',           description: "Contact's phone number",        example: '+234 801 234 5678' },
  { variable: '{{email}}',           description: "Contact's email address",       example: 'sarah@acme.com'   },
  { variable: '{{city}}',            description: "Contact's city",                example: 'Lagos'            },
  { variable: '{{country}}',         description: "Contact's country",             example: 'Nigeria'          },
  { variable: '{{business_name}}',   description: 'Your business name',            example: 'Acme Corp'        },
  { variable: '{{agent_name}}',      description: 'Agent/sender name',             example: 'Alex'             },
  { variable: '{{today_date}}',      description: "Today's date",                  example: '15/05/2026'       },
  { variable: '{{appointment_date}}',description: 'Appointment date',              example: '20/05/2026 10:00' },
  { variable: '{{invoice_number}}',  description: 'Invoice/order number',          example: 'INV-00123'        },
]

// Parse all {{variable}} tokens from a template string
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{([^}|]+?)(?:\|[^}]*)?\}\}/g)
  const vars = new Set<string>()
  for (const m of matches) vars.add(m[1].trim())
  return Array.from(vars)
}

// Parse randomization blocks: [option A|option B|option C]
export function resolveRandomization(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, (_, group: string) => {
    const options = group.split('|').map(s => s.trim())
    return options[Math.floor(Math.random() * options.length)]
  })
}

// Resolve a single variable with optional fallback
function resolveVariable(name: string, fallback: string, ctx: PersonalizationContext): string {
  const map: Record<string, string | null | undefined> = {
    first_name:       ctx.firstName,
    last_name:        ctx.lastName,
    full_name:        ctx.fullName ?? ([ctx.firstName, ctx.lastName].filter(Boolean).join(' ') || null),
    phone:            ctx.phone,
    email:            ctx.email,
    city:             ctx.city,
    country:          ctx.country,
    business_name:    ctx.businessName,
    agent_name:       ctx.agentName,
    invoice_number:   ctx.invoiceNumber,
    appointment_date: ctx.appointmentDate,
    today_date:       new Date().toLocaleDateString('en-GB'),
    ...ctx, // custom fields
  }

  const val = map[name.toLowerCase()]
  if (val != null && val !== '') return val
  return fallback || `[${name}]`
}

// Full personalization render: resolve variables + randomization
export function renderPersonalization(template: string, ctx: PersonalizationContext): string {
  // 1. Resolve {{variable|fallback}} patterns
  let result = template.replace(/\{\{([^}|]+?)(?:\|([^}]*))?\}\}/g, (_, name: string, fallback = '') => {
    return resolveVariable(name.trim(), fallback.trim(), ctx)
  })
  // 2. Resolve [option A|option B] randomization
  result = resolveRandomization(result)
  return result
}

// Validate a template for missing/invalid variables against a context
export interface ValidationResult {
  valid:           boolean
  missingVars:     string[]
  unknownVars:     string[]
  filledVars:      string[]
  previewText:     string
}

export function validateTemplate(template: string, ctx: PersonalizationContext): ValidationResult {
  const allVars = extractVariables(template)
  const knownKeys = new Set(BUILT_IN_VARIABLES.map(v => v.variable.replace(/[{}]/g, '')))

  const missingVars: string[] = []
  const unknownVars: string[] = []
  const filledVars:  string[] = []

  for (const v of allVars) {
    const key = v.toLowerCase()
    if (!knownKeys.has(key) && ctx[key] == null) unknownVars.push(v)
    else if (ctx[key] == null || ctx[key] === '') missingVars.push(v)
    else filledVars.push(v)
  }

  const previewText = renderPersonalization(template, ctx)

  return {
    valid: missingVars.length === 0 && unknownVars.length === 0,
    missingVars,
    unknownVars,
    filledVars,
    previewText,
  }
}

// Bulk preview: render for multiple contacts, return count of issues
export function bulkPreviewStats(template: string, contacts: PersonalizationContext[]): {
  totalRendered: number
  withIssues:    number
  missingByVar:  Record<string, number>
} {
  const missingByVar: Record<string, number> = {}
  let withIssues = 0

  for (const contact of contacts) {
    const { missingVars } = validateTemplate(template, contact)
    if (missingVars.length > 0) {
      withIssues++
      for (const v of missingVars) {
        missingByVar[v] = (missingByVar[v] ?? 0) + 1
      }
    }
  }

  return { totalRendered: contacts.length, withIssues, missingByVar }
}

// Generate variable autocomplete suggestions for a given cursor position
export function getVariableSuggestions(prefix: string): typeof BUILT_IN_VARIABLES {
  const q = prefix.replace('{{', '').toLowerCase()
  return BUILT_IN_VARIABLES.filter(v => v.variable.toLowerCase().includes(q))
}

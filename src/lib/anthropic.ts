import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface CsvMappingSuggestion {
  phone: string | null
  firstName: string | null
  lastName: string | null
  customFields: Record<string, string>
  confidence: number
  explanation: string
}

const SYSTEM_PROMPT = `You are an expert data mapper for a WhatsApp CRM system called BroadcastHQ.
Your job is to analyze CSV column headers and suggest how they map to our contact schema:
- phone (required): The contact's phone number in any format
- firstName: The contact's first name
- lastName: The contact's last name
- customFields: Any other business-relevant fields (company, role, city, order_id, etc.)

Return ONLY valid JSON matching the schema. Be precise and confident.`

export async function suggestCsvMapping(headers: string[]): Promise<CsvMappingSuggestion> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `CSV headers to map: ${JSON.stringify(headers)}

Return JSON with this exact structure:
{
  "phone": "header_name_or_null",
  "firstName": "header_name_or_null",
  "lastName": "header_name_or_null",
  "customFields": { "our_field_name": "csv_header_name" },
  "confidence": 0.0_to_1.0,
  "explanation": "brief explanation"
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in Claude response')

  return JSON.parse(jsonMatch[0]) as CsvMappingSuggestion
}

export async function generateCampaignContent(
  templateName: string,
  brandName: string,
  goal: string
): Promise<{ subject: string; body: string; variables: string[] }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: `You are a WhatsApp marketing copywriter. Write concise, engaging WhatsApp template messages.
Use {{variable_name}} syntax for dynamic content. Keep messages under 160 characters for best engagement.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Brand: ${brandName}
Template name: ${templateName}
Campaign goal: ${goal}

Return JSON: {"subject":"short_description","body":"message_with_{{variables}}","variables":["var1","var2"]}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in Claude response')
  return JSON.parse(jsonMatch[0])
}

export { client as anthropic }

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken  = process.env.TWILIO_AUTH_TOKEN!
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

let _client: twilio.Twilio | null = null

function getClient(): twilio.Twilio {
  if (!_client) {
    _client = twilio(accountSid, authToken)
  }
  return _client
}

export interface SendResult {
  sid: string | null
  success: boolean
  error?: string
}

export async function sendWhatsAppMessage(
  to: string,
  templateBody: string
): Promise<SendResult> {
  try {
    const msg = await getClient().messages.create({
      from: fromNumber,
      to:   `whatsapp:${to}`,
      body: templateBody,
    })
    return { sid: msg.sid, success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { sid: null, success: false, error: message }
  }
}

export function buildTemplateBody(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return twilio.validateRequest(authToken, signature, url, params)
}

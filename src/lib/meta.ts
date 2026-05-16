// Meta WhatsApp Cloud API client
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const GRAPH_VERSION = 'v19.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export interface MetaTemplate {
  id: string
  name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  components: MetaTemplateComponent[]
}

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  text?: string
  format?: string
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>
}

export interface MetaSendMessagePayload {
  to: string
  templateName: string
  languageCode: string
  components?: MetaTemplateComponent[]
}

export interface MetaWebhookEvent {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: { display_phone_number: string; phone_number_id: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          text?: { body: string }
          type: string
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string }>
        }>
      }
      field: string
    }>
  }>
}

export class MetaClient {
  private accessToken: string
  private wabaId: string
  private phoneNumberId: string

  constructor(accessToken: string, wabaId: string, phoneNumberId: string) {
    this.accessToken = accessToken
    this.wabaId = wabaId
    this.phoneNumberId = phoneNumberId
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error?.message ?? `Meta API error ${res.status}`)
    }
    return data as T
  }

  async listTemplates(): Promise<MetaTemplate[]> {
    const data = await this.request<{ data: MetaTemplate[] }>(
      `/${this.wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`
    )
    return data.data ?? []
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components: MetaTemplateComponent[] = []
  ): Promise<{ messages: Array<{ id: string }> }> {
    return this.request(`/${this.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    })
  }

  async sendTextMessage(to: string, text: string): Promise<{ messages: Array<{ id: string }> }> {
    return this.request(`/${this.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
  }

  async markMessageRead(messageId: string): Promise<void> {
    await this.request(`/${this.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  }

  static verifyWebhookSignature(
    rawBody: string,
    signature: string,
    appSecret: string
  ): boolean {
    const { createHmac } = require('crypto') as typeof import('crypto')
    const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
    const received = signature.replace('sha256=', '')
    try {
      return require('crypto').timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(received, 'hex')
      )
    } catch {
      return false
    }
  }
}

export function buildMetaClient(conn: {
  access_token: string
  waba_id: string
  phone_number_id: string
}): MetaClient {
  return new MetaClient(conn.access_token, conn.waba_id, conn.phone_number_id)
}

/**
 * Unified AI provider abstraction.
 * Supports: Anthropic, OpenAI, Google Gemini, NVIDIA NIM (OpenAI-compatible).
 * Each workspace can bring their own API key + choose their provider.
 * Platform fallback: ANTHROPIC_API_KEY env var (optional).
 */

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'nvidia' | 'none'

export interface AiConfig {
  provider: AiProvider
  apiKey: string
  model?: string | null
}

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Default models per provider
const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai:    'gpt-4o-mini',
  google:    'gemini-1.5-flash',
  nvidia:    'meta/llama-3.1-8b-instruct',
  none:      '',
}

// ─── Simple XOR obfuscation for API keys at rest ─────────────────────────────
// Not strong crypto — but prevents plain-text exposure in DB dumps.
// For true encryption, use AES-256-GCM with PLATFORM_KEY env.

function getObfuscationKey(): string {
  return process.env.NEXTAUTH_SECRET?.slice(0, 32) ?? 'broadcasthq-default-obfuscation-key'
}

export function encryptApiKey(plaintext: string): string {
  const key = getObfuscationKey()
  const buf = Buffer.from(plaintext, 'utf8')
  const out = Buffer.alloc(buf.length)
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ key.charCodeAt(i % key.length)
  }
  return out.toString('base64')
}

export function decryptApiKey(encrypted: string): string {
  const key = getObfuscationKey()
  const buf = Buffer.from(encrypted, 'base64')
  const out = Buffer.alloc(buf.length)
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ key.charCodeAt(i % key.length)
  }
  return out.toString('utf8')
}

// ─── Chat completion abstraction ─────────────────────────────────────────────

async function callAnthropic(apiKey: string, model: string, messages: AiMessage[], systemPrompt?: string): Promise<string> {
  const anthropicMessages = messages.filter(m => m.role !== 'system')
  const system = systemPrompt ?? messages.find(m => m.role === 'system')?.content

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'x-api-key':          apiKey,
      'anthropic-version':  '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: anthropicMessages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { content: { type: string; text: string }[] }
  return data.content.find(c => c.type === 'text')?.text ?? ''
}

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, messages: AiMessage[]): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content ?? ''
}

async function callGoogle(apiKey: string, model: string, messages: AiMessage[]): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 1024 } }
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Gemini error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  return data.candidates[0]?.content?.parts[0]?.text ?? ''
}

// ─── Public interface ─────────────────────────────────────────────────────────

export async function aiComplete(
  config: AiConfig,
  messages: AiMessage[],
  systemPrompt?: string,
): Promise<string> {
  const model = config.model || DEFAULT_MODELS[config.provider]

  switch (config.provider) {
    case 'anthropic':
      return callAnthropic(config.apiKey, model, messages, systemPrompt)

    case 'openai':
      return callOpenAICompatible('https://api.openai.com/v1', config.apiKey, model, [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages,
      ])

    case 'nvidia':
      return callOpenAICompatible('https://integrate.api.nvidia.com/v1', config.apiKey, model, [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages,
      ])

    case 'google':
      return callGoogle(config.apiKey, model, [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages,
      ])

    case 'none':
      throw new Error('No AI provider configured. Add your API key in Settings → AI Provider.')

    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }
}

// ─── Get workspace AI config (with platform fallback) ─────────────────────────

export function getPlatformFallbackConfig(): AiConfig | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-haiku-4-5-20251001' }
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
  }
  return null
}

export function getWorkspaceAiConfig(ws: { aiProvider: string | null; aiApiKey: string | null; aiModel: string | null }): AiConfig | null {
  if (!ws.aiProvider || ws.aiProvider === 'none' || !ws.aiApiKey) return null
  return {
    provider: ws.aiProvider as AiProvider,
    apiKey:   decryptApiKey(ws.aiApiKey),
    model:    ws.aiModel || null,
  }
}

export const AI_PROVIDER_OPTIONS: { value: AiProvider; label: string; modelPlaceholder: string; keyPlaceholder: string; docsUrl: string }[] = [
  {
    value:            'anthropic',
    label:            'Anthropic (Claude)',
    modelPlaceholder: 'claude-haiku-4-5-20251001',
    keyPlaceholder:   'sk-ant-...',
    docsUrl:          'https://console.anthropic.com/',
  },
  {
    value:            'openai',
    label:            'OpenAI (GPT)',
    modelPlaceholder: 'gpt-4o-mini',
    keyPlaceholder:   'sk-...',
    docsUrl:          'https://platform.openai.com/api-keys',
  },
  {
    value:            'google',
    label:            'Google Gemini',
    modelPlaceholder: 'gemini-1.5-flash',
    keyPlaceholder:   'AIza...',
    docsUrl:          'https://aistudio.google.com/app/apikey',
  },
  {
    value:            'nvidia',
    label:            'NVIDIA NIM',
    modelPlaceholder: 'meta/llama-3.1-8b-instruct',
    keyPlaceholder:   'nvapi-...',
    docsUrl:          'https://build.nvidia.com/',
  },
]

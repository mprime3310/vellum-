/**
 * Server-only AI plumbing. This module is imported *inside* the server
 * function handlers so the provider SDKs never reach the browser bundle.
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText } from 'ai'
import { getProvider, type ProviderId } from './ai-settings'

export interface AiCall {
  provider: ProviderId
  apiKey: string
  model: string
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

export interface AiCallResult {
  text: string
  finishReason: string
}

const DEFAULT_MAX_TOKENS = 24_000
const DEFAULT_TEMPERATURE = 0.78

const GATEWAY_BASE_URL =
  process.env.AI_GATEWAY_BASE_URL ?? 'https://ai.gateway.lovable.dev/v1'
const GATEWAY_API_KEY = process.env.LOVABLE_API_KEY ?? process.env.AI_GATEWAY_API_KEY ?? ''

export class AiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiError'
  }
}

const TRUNCATED =
  'The AI response was cut off. Try a shorter input or a larger model.'

/** Default provider: the Vellum AI gateway, authenticated server-side. */
async function callGateway(call: AiCall): Promise<AiCallResult> {
  if (!GATEWAY_API_KEY) {
    throw new AiError(
      'The default AI provider is not configured on this server. Add LOVABLE_API_KEY to .env, or pick your own provider in AI settings.',
    )
  }

  const provider = createOpenAICompatible({
    name: 'vellum-ai',
    baseURL: GATEWAY_BASE_URL,
    apiKey: GATEWAY_API_KEY,
  })

  const result = await generateText({
    model: provider(call.model),
    messages: [
      { role: 'system', content: call.system },
      { role: 'user', content: call.user },
    ],
    temperature: call.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: call.maxTokens ?? DEFAULT_MAX_TOKENS,
  })

  return { text: result.text ?? '', finishReason: result.finishReason ?? 'stop' }
}

/** Bring-your-own-key providers: their OpenAI-compatible chat completions API. */
async function callByok(call: AiCall): Promise<AiCallResult> {
  const def = getProvider(call.provider)

  if (!def.endpoint) {
    throw new AiError(`${def.label} is not configured correctly.`)
  }
  const apiKey = call.apiKey?.trim() ?? ''
  if (!apiKey) {
    // Never silently fall back to the default provider.
    throw new AiError(
      `No API key set for ${def.label}. Open AI settings and paste your key — it is stored only in your browser.`,
    )
  }

  const body: Record<string, unknown> = {
    model: call.model || def.defaultModel,
    messages: [
      { role: 'system', content: call.system },
      { role: 'user', content: call.user },
    ],
    temperature: call.temperature ?? DEFAULT_TEMPERATURE,
    response_format: { type: 'json_object' },
    [def.maxTokensParam]: call.maxTokens ?? DEFAULT_MAX_TOKENS,
  }

  let response: Response
  try {
    response = await fetch(def.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw new AiError(
      `Could not reach ${def.label}. Check your connection and try again. (${String(cause)})`,
    )
  }

  if (!response.ok) {
    throw new AiError(await describeError(response, def.label, call.model || def.defaultModel))
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    error?: { message?: string }
  }

  const choice = payload.choices?.[0]
  const text = choice?.message?.content ?? ''
  if (!text.trim() && payload.error?.message) {
    throw new AiError(`${def.label} returned an error: ${payload.error.message}`)
  }

  return { text, finishReason: choice?.finish_reason ?? 'stop' }
}

async function describeError(response: Response, label: string, model: string): Promise<string> {
  let detail = ''
  try {
    const payload = (await response.json()) as { error?: { message?: string } }
    detail = payload.error?.message ?? ''
  } catch {
    detail = ''
  }

  if (response.status === 401 || response.status === 403) {
    return `Your ${label} key was rejected.${detail ? ` (${detail})` : ''}`
  }
  if (response.status === 404) {
    return `Your account can't use model ${model}, pick another in AI settings.`
  }
  if (response.status === 429) {
    return `Rate limited by ${label}. Wait a moment, then try again.`
  }
  if (response.status === 400) {
    return `Your ${label} request was rejected${detail ? `: ${detail}` : '.'}`
  }
  if (response.status >= 500) {
    return `${label} is having trouble right now. Please try again.`
  }
  return `${label} request failed (${response.status})${detail ? `: ${detail}` : '.'}`
}

export async function callModel(call: AiCall): Promise<AiCallResult> {
  const def = getProvider(call.provider)
  const model = call.model || def.defaultModel

  if (def.serverKey) {
    const result = await callGateway({ ...call, model })
    if (result.finishReason === 'length') throw new AiError(TRUNCATED)
    if (!result.text.trim()) throw new AiError('The model returned an empty response. Try again.')
    return result
  }

  const result = await callByok({ ...call, model })
  if (result.finishReason === 'length') throw new AiError(TRUNCATED)
  if (!result.text.trim()) throw new AiError('The model returned an empty response. Try again.')
  return result
}

export { TRUNCATED as TRUNCATED_MESSAGE }

/**
 * AI provider settings — shared, framework-agnostic store.
 *
 * IMPORTANT: this state is intentionally module-level. Earlier designs kept a
 * `useState` copy inside each component, which meant that saving the provider in
 * the settings dialog silently left the input panel on the default provider.
 * Here every component subscribes to the same source of truth, and the store
 * also listens to the window `storage` event so other tabs stay in sync.
 */

export const AI_SETTINGS_KEY = 'lovable-cv-ai-v2'

export type ProviderId = 'lovable' | 'groq' | 'gemini' | 'openai' | 'deepseek' | 'cohere' | 'nvidia'

export interface ProviderDef {
  id: ProviderId
  label: string
  /** No key required: the server holds the gateway key. */
  serverKey?: boolean
  endpoint?: string
  docsUrl?: string
  keyPrefix?: string
  keyHint?: string
  models: { id: string; label: string }[]
  defaultModel: string
  /** OpenAI + Groq want `max_completion_tokens`; everyone else `max_tokens`. */
  maxTokensParam: 'max_completion_tokens' | 'max_tokens'
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'lovable',
    label: 'Vellum AI (default)',
    serverKey: true,
    models: [
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash · fast & balanced' },
      { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro · highest quality' },
      { id: 'openai/gpt-5-mini', label: 'GPT-5 mini' },
      { id: 'openai/gpt-5', label: 'GPT-5' },
    ],
    defaultModel: 'google/gemini-2.5-flash',
    maxTokensParam: 'max_tokens',
  },
  {
    id: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    docsUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    keyHint: 'Starts with gsk_ — free keys at console.groq.com/keys',
    models: [
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B · recommended' },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    ],
    defaultModel: 'openai/gpt-oss-120b',
    maxTokensParam: 'max_completion_tokens',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIza',
    keyHint: 'Starts with AIza — free keys at aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash · recommended' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    ],
    defaultModel: 'gemini-2.5-flash',
    maxTokensParam: 'max_tokens',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    keyHint: 'Starts with sk- — keys at platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini · recommended' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
    defaultModel: 'gpt-4o-mini',
    maxTokensParam: 'max_completion_tokens',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyPrefix: 'sk-',
    keyHint: 'Starts with sk- — keys at platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat · recommended' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
    defaultModel: 'deepseek-chat',
    maxTokensParam: 'max_tokens',
  },
  {
    id: 'cohere',
    label: 'Cohere',
    // OpenAI-compatibility layer. Cohere serves the same route from
    // api.cohere.ai; api.cohere.com is the canonical domain.
    endpoint: 'https://api.cohere.com/compatibility/v1/chat/completions',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    // Cohere keys are opaque tokens with no fixed prefix, so we do not claim one.
    keyHint: 'Free trial key at dashboard.cohere.com/api-keys',
    models: [
      { id: 'command-a-plus-05-2026', label: 'Command A Plus · recommended' },
      { id: 'command-a-03-2025', label: 'Command A 03-2025' },
      { id: 'command-r7b-12-2024', label: 'Command R7B · fast' },
      { id: 'command-r-plus-04-2024', label: 'Command R Plus 04-2024' },
    ],
    defaultModel: 'command-a-plus-05-2026',
    maxTokensParam: 'max_tokens',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    // NVIDIA's hosted NIM catalogue, OpenAI-compatible, free to use today.
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    docsUrl: 'https://build.nvidia.com',
    keyPrefix: 'nvapi-',
    keyHint: 'Starts with nvapi- — free keys at build.nvidia.com',
    models: [
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', label: 'Nemotron Super 49B · recommended' },
      { id: 'nvidia/nemotron-3-super-120b-a12b', label: 'Nemotron 3 Super 120B' },
      { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
    ],
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    maxTokensParam: 'max_tokens',
  },
]

export const DEFAULT_PROVIDER: ProviderId = 'lovable'

export function getProvider(id: ProviderId): ProviderDef {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
}

export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some((p) => p.id === value)
}

export interface AiSettings {
  provider: ProviderId
  keys: Partial<Record<ProviderId, string>>
  models: Partial<Record<ProviderId, string>>
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: DEFAULT_PROVIDER,
  keys: {},
  models: Object.fromEntries(PROVIDERS.map((p) => [p.id, p.defaultModel])) as Record<
    ProviderId,
    string
  >,
}

/** Drops any saved model id that is no longer offered, back to the default. */
export function sanitizeAiSettings(input: unknown): AiSettings {
  const raw = (input ?? {}) as Partial<AiSettings>
  const provider = isProviderId(raw.provider) ? raw.provider : DEFAULT_PROVIDER

  const keys: Partial<Record<ProviderId, string>> = {}
  for (const def of PROVIDERS) {
    const value = raw.keys?.[def.id]
    if (typeof value === 'string' && value.trim().length > 0) keys[def.id] = value.trim()
  }

  const models: Partial<Record<ProviderId, string>> = {}
  for (const def of PROVIDERS) {
    const saved = raw.models?.[def.id]
    models[def.id] =
      typeof saved === 'string' && def.models.some((m) => m.id === saved)
        ? saved
        : def.defaultModel
  }

  return { provider, keys, models }
}

export function modelFor(settings: AiSettings, provider: ProviderId): string {
  const saved = settings.models[provider]
  const def = getProvider(provider)
  return def.models.some((m) => m.id === saved) ? (saved as string) : def.defaultModel
}

export function keyFor(settings: AiSettings, provider: ProviderId): string {
  return settings.keys[provider]?.trim() ?? ''
}

/** Human readable validation, surfaced in the dialog and before any AI call. */
export function providerKeyError(settings: AiSettings): string | null {
  const def = getProvider(settings.provider)
  if (def.serverKey) return null
  const key = keyFor(settings, settings.provider)
  if (key.length === 0) {
    return `${def.label} needs an API key. Open AI settings and paste your key — it is stored only in your browser.`
  }
  if (def.keyPrefix && !key.startsWith(def.keyPrefix)) {
    return `That does not look like a ${def.label} key — those usually start with "${def.keyPrefix}".`
  }
  return null
}

export interface ServerAiPayload {
  provider: ProviderId
  apiKey: string
  model: string
}

/** The exact object handed to the server functions. */
export function aiRequestPayload(settings: AiSettings): ServerAiPayload {
  const provider = settings.provider
  return {
    provider,
    apiKey: keyFor(settings, provider),
    model: modelFor(settings, provider),
  }
}

export function providerLabel(settings: AiSettings): string {
  const def = getProvider(settings.provider)
  return def.serverKey ? def.label : `${def.label} · ${modelFor(settings, settings.provider)}`
}

/* ---------------------------- the shared store ---------------------------- *
 * One module-level value + a listener set. Every component reads the same
 * snapshot, so saving the provider in the dialog updates the input panel
 * immediately — there is no per-component copy that can go stale.
 * ------------------------------------------------------------------------- */

let current: AiSettings | null = null
const listeners = new Set<() => void>()

function read(): AiSettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS
  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_KEY)
    if (!raw) return DEFAULT_AI_SETTINGS
    return sanitizeAiSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_AI_SETTINGS
  }
}

export function getAiSettings(): AiSettings {
  if (!current) current = read()
  return current
}

/** Stable snapshot used during SSR / hydration. */
export function getAiSettingsServerSnapshot(): AiSettings {
  return DEFAULT_AI_SETTINGS
}

function persist(next: AiSettings) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next))
  } catch {
    /* storage disabled or full — the in-memory value still works */
  }
}

function emit() {
  for (const listener of Array.from(listeners)) listener()
}

export function setAiSettings(patch: Partial<AiSettings>): AiSettings {
  const prev = getAiSettings()
  const next = sanitizeAiSettings({
    provider: patch.provider ?? prev.provider,
    keys: { ...prev.keys, ...(patch.keys ?? {}) },
    models: { ...prev.models, ...(patch.models ?? {}) },
  })
  current = next
  persist(next)
  emit()
  return next
}

export function setProvider(id: ProviderId) {
  return setAiSettings({ provider: id })
}

export function setProviderKey(id: ProviderId, key: string) {
  return setAiSettings({ keys: { [id]: key } as Partial<Record<ProviderId, string>> })
}

export function setProviderModel(id: ProviderId, model: string) {
  return setAiSettings({ models: { [id]: model } as Partial<Record<ProviderId, string>> })
}

export function clearProviderKey(id: ProviderId) {
  const prev = getAiSettings()
  const keys = { ...prev.keys }
  delete keys[id]
  return setAiSettings({ keys: { [id]: '' } as Partial<Record<ProviderId, string>> })
}

export function subscribeAiSettings(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== AI_SETTINGS_KEY) return
    current = read()
    emit()
  })
}

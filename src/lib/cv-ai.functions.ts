import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isEmptyCv, withIds, type CvData, type CvEntry } from './cv-types'
import {
  PARSE_SYSTEM_PROMPT,
  GENERATE_SYSTEM_PROMPT,
  HUMANIZE_SYSTEM_PROMPT,
  buildGeneratePrompt,
  buildHumanizePrompt,
  buildParsePrompt,
} from './cv-prompts'
import { getProvider, modelFor, isProviderId, getAiSettings } from './ai-settings'

/**
 * Every AI call happens here, on the server. The browser only ever receives
 * validated `CvData` back.
 */

const ProviderSchema = z.enum(['lovable', 'groq', 'gemini', 'openai', 'deepseek'])

const AiArgsSchema = z.object({
  provider: ProviderSchema.optional(),
  apiKey: z.string().max(200).optional(),
  model: z.string().max(120).optional(),
})

export type AiOutcome =
  | { ok: true; cv: CvData }
  | { ok: false; error: string }

/** The client always sends { provider, apiKey, model }; fall back to stored prefs. */
function resolveAi(args: z.infer<typeof AiArgsSchema>) {
  const stored = getAiSettings()
  const provider = args.provider && isProviderId(args.provider) ? args.provider : stored.provider
  const apiKey = args.apiKey?.trim() ?? stored.keys[provider] ?? ''
  const model = args.model?.trim() || modelFor(stored, provider)
  return { provider, apiKey, model }
}

export const parseCv = createServerFn({ method: 'POST' })
  .validator(AiArgsSchema.extend({ text: z.string().min(1) }))
  .handler(async ({ data }): Promise<AiOutcome> => {
    const { callModel } = await import('./cv-ai.server')
    const { parseCvJson } = await import('./cv-schema')
    const ai = resolveAi(data)

    if (data.text.trim().length < 20) {
      return { ok: false, error: 'Paste a little more of your CV — a few lines at least.' }
    }

    try {
      const result = await callModel({
        ...ai,
        system: PARSE_SYSTEM_PROMPT,
        user: buildParsePrompt(data.text),
        temperature: 0.2,
        maxTokens: 16_000,
      })
      const cv = withIds(parseCvJson(result.text))
      if (isEmptyCv(cv)) {
        return { ok: false, error: 'No CV content was found in that text. Check the paste and try again.' }
      }
      return { ok: true, cv }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

const GenerateSchema = AiArgsSchema.extend({
  mode: z.enum(['prompt', 'job']),
  prompt: z.string().max(60_000).default(''),
  jobDescription: z.string().max(60_000).optional(),
  profile: z.string().max(20_000).optional(),
})

export const generateCv = createServerFn({ method: 'POST' })
  .validator(GenerateSchema)
  .handler(async ({ data }): Promise<AiOutcome> => {
    const { callModel } = await import('./cv-ai.server')
    const { parseCvJson } = await import('./cv-schema')
    const ai = resolveAi(data)

    const brief = (data.jobDescription ?? data.prompt).trim()
    if (brief.length < 8) {
      return {
        ok: false,
        error:
          data.mode === 'job'
            ? 'Paste the job description first — even the short version works.'
            : 'Tell me a little about the role. One line is enough.',
      }
    }

    try {
      const result = await callModel({
        ...ai,
        system: GENERATE_SYSTEM_PROMPT,
        user: buildGeneratePrompt({
          mode: data.mode,
          prompt: data.prompt,
          jobDescription: data.jobDescription,
          profile: data.profile,
        }),
        temperature: 0.78,
        maxTokens: 24_000,
      })
      const cv = withIds(parseCvJson(result.text))
      if (isEmptyCv(cv)) {
        return { ok: false, error: 'The model did not return a CV. Try again, or paste your CV instead.' }
      }
      return { ok: true, cv }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while talking to the model. Please try again.'
}

/**
 * AI humaniser. Rewrites the prose of an existing CV, then merges defensively:
 * facts, ids, employers, dates, skills and contact details can never be changed
 * by the model, and a short/long response is repaired from the original rather
 * than trusted.
 */

const HumanizeSchema = z.object({
  cv: z.unknown(),
  provider: ProviderSchema.optional(),
  apiKey: z.string().max(200).optional(),
  model: z.string().max(120).optional(),
})

export type HumanizeOutcome =
  | { ok: true; cv: CvData; changed: number }
  | { ok: false; error: string }

export const humanizeCv = createServerFn({ method: 'POST' })
  .validator(HumanizeSchema)
  .handler(async ({ data }): Promise<HumanizeOutcome> => {
    const { callModel } = await import('./cv-ai.server')
    const { normalizeCvObject, parseCvJson } = await import('./cv-schema')
    const stored = getAiSettings()
    const provider = data.provider && isProviderId(data.provider) ? data.provider : stored.provider
    const apiKey = data.apiKey?.trim() ?? stored.keys[provider] ?? ''
    const model = data.model?.trim() || modelFor(stored, provider)

    const original = withIds(normalizeCvObject(data.cv))
    if (!original.summary && original.experience.length === 0) {
      return { ok: false, error: 'There is nothing to humanise yet — build your CV first.' }
    }

    try {
      const result = await callModel({
        provider,
        apiKey,
        model,
        system: HUMANIZE_SYSTEM_PROMPT,
        user: buildHumanizePrompt(JSON.stringify(original)),
        temperature: 0.9,
        maxTokens: 24_000,
      })
      const rewritten = withIds(parseCvJson(result.text))
      const merged = mergeProse(original, rewritten)
      return {
        ok: true,
        cv: merged,
        changed: countDifferences(original, merged),
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : 'The humaniser failed. Try the instant pass instead.',
      }
    }
  })

/**
 * Takes only prose from the model's answer. Every structural field — ids,
 * employers, roles, locations, dates, skills, languages, contact — comes from
 * the original. If the model returned a different number of bullets, the
 * original ones are restored rather than silently dropped.
 */
function mergeProse(original: CvData, rewritten: CvData): CvData {
  const sameLength = <T,>(a: T[], b: T[]) => a.length === b.length

  return {
    ...original,
    summary: rewritten.summary.trim() ? rewritten.summary : original.summary,
    experience: original.experience.map((item, index) => {
      const other = rewritten.experience[index]
      const usable = Boolean(other) && sameLength(item.bullets, other?.bullets ?? [])
      return {
        ...item, // every fact from the original
        bullets: item.bullets.map((bullet, bulletIndex) =>
          usable ? (other?.bullets[bulletIndex] ?? bullet) : bullet,
        ),
      }
    }),
    education: original.education.map((item, index) => {
      const other = rewritten.education[index]
      return { ...item, details: other?.details.trim() ? other.details : item.details }
    }),
    projects: mergeEntries(original.projects, rewritten.projects),
    certifications: mergeEntries(original.certifications, rewritten.certifications),
    awards: mergeEntries(original.awards, rewritten.awards),
    volunteer: mergeEntries(original.volunteer, rewritten.volunteer),
    references: mergeEntries(original.references, rewritten.references),
  }
}

function mergeEntries(original: CvEntry[], rewritten: CvEntry[]): CvEntry[] {
  return original.map((item, index) => {
    const other = rewritten[index]
    return { ...item, description: other?.description.trim() ? other.description : item.description }
  })
}

function countDifferences(before: CvData, after: CvData): number {
  let changed = 0
  const compare = (a: string[], b: string[]) => {
    if (a.length !== b.length) return
    a.forEach((value, index) => {
      if (value.trim() !== (b[index] ?? '').trim()) changed += 1
    })
  }
  if (before.summary.trim() !== after.summary.trim()) changed += 1
  before.experience.forEach((item, index) => compare(item.bullets, after.experience[index]?.bullets ?? []))
  compare(
    before.education.map((item) => item.details),
    after.education.map((item) => item.details),
  )
  for (const key of ['projects', 'certifications', 'awards', 'volunteer', 'references'] as const) {
    compare(
      before[key].map((item) => item.description),
      after[key].map((item) => item.description),
    )
  }
  return changed
}


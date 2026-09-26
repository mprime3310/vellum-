/**
 * Local CV "humaniser".
 *
 * AI-written copy has recognisable tics: em-dash stacking, "spearheaded",
 * "leveraged", "not just X, but Y", rule-of-three lists, first person, and
 * "Additionally/Moreover" at the start of every other bullet. This module
 * rewrites those tics with deterministic rules — instantly, offline, and for
 * free — without touching any fact, number, employer, date or skill.
 *
 * Honest scope: this makes the prose read like a person wrote it. It is not
 * (and does not claim to be) a way to beat an AI detector — those are
 * unreliable in both directions. The optional AI pass adds variety that rules
 * cannot.
 */
import type { CvData } from './cv-types'

export type TellKind =
  | 'cliche'
  | 'filler'
  | 'transition'
  | 'hedge'
  | 'person'
  | 'contraction'
  | 'rhythm'
  | 'format'

export interface HumanizeStats {
  cliche: number
  filler: number
  transition: number
  hedge: number
  person: number
  contraction: number
  rhythm: number
  format: number
  /** Total edits applied. */
  edits: number
  /** Tics still detectable afterwards. */
  remaining: number
}

function emptyStats(): HumanizeStats {
  return {
    cliche: 0, filler: 0, transition: 0, hedge: 0, person: 0,
    contraction: 0, rhythm: 0, format: 0, edits: 0, remaining: 0,
  }
}

type Rule = [kind: TellKind, pattern: RegExp, replacement: string]

/** Buzzwords and stock phrases that no human writes in a CV. */
const CLIQUES: Rule[] = [
  ['cliche', /\bspearheaded\b/gi, 'led'],
  ['cliche', /\bleverag(?:e|ed|es|ing)\b/gi, 'used'],
  ['cliche', /\butili[sz]ing\b/gi, 'using'],
  ['cliche', /\butili[sz](?:e|ed|es)\b/gi, 'use'],
  ['cliche', /\bsynerg(?:y|ies)\b/gi, 'close collaboration'],
  ['cliche', /\bseamlessly,?\s*/gi, ''],
  ['cliche', /\brobust\b/gi, 'reliable'],
  ['cliche', /\bcutting[- ]edge\b/gi, 'current'],
  ['cliche', /\bstate[- ]of[- ]the[- ]art\b/gi, 'current'],
  ['cliche', /\bbest[- ]in[- ]class\b/gi, 'reliable'],
  ['cliche', /\bworld[- ]class,?\s*/gi, ''],
  ['cliche', /\bgroundbreaking\b/gi, 'unusual'],
  ['cliche', /\bhighly skilled\b/gi, 'experienced'],
  ['cliche', /\bproven track record(?: of success)?\b/gi, 'a track record'],
  ['cliche', /\bresults[- ]driven,?\s*/gi, ''],
  ['cliche', /\bdetail[- ]oriented,?\s*/gi, ''],
  ['cliche', /\bteam player,?\s*/gi, ''],
  ['cliche', /\bself[- ]starter,?\s*/gi, ''],
  ['cliche', /\bgo[- ]getter,?\s*/gi, ''],
  ['cliche', /\bthink outside the box\b/gi, 'work creatively'],
  ['cliche', /\bpassionate about\b/gi, 'focused on'],
  ['cliche', /\bstrong work ethic\b/gi, 'reliable'],
  ['cliche', /\bunparalleled\b/gi, 'unmatched'],
  ['cliche', /\bnumerous\b/gi, 'many'],
  ['cliche', /\bmyriad\b/gi, 'many'],
  ['cliche', /\bendeavo(?:u)?r(?:ed|ing|s)?\b/gi, 'try'],
  ['cliche', /\bin order to\b/gi, 'to'],
  ['cliche', /\bdue to the fact that\b/gi, 'because'],
  ['cliche', /\b(?:has|have) the ability to\b/gi, 'can'],
  ['cliche', /\b(?:was|were) (?:able|required) to\b/gi, ''],
  ['cliche', /\bplays? a (?:key|crucial|central|vital) role in\b/gi, 'leads'],
  ['cliche', /\bat the forefront of\b/gi, 'on'],
  ['cliche', /\bkeen interest in\b/gi, 'interest in'],
  ['cliche', /\bvalue[- ]driven,?\s*/gi, ''],
  ['cliche', /\bhigh[- ]impact,?\s*/gi, ''],
  ['cliche', /\binnovative,?\s*/gi, ''],
  ['cliche', /\bhighly motivated(?: individual)?,?\s*/gi, ''],
  ['cliche', /\bdynamic (?:professional|individual|person|team|environment|workplace)\b/gi, 'adaptable'],
]

/** Whole openers that exist to pad a first sentence. */
const FILLER: Rule[] = [
  ['filler', /^\s*in today'?s [a-z\s-]{3,40}(?:world|landscape|environment)\s*,?\s*/i, ''],
  ['filler', /^\s*as an? [a-z\s-]{3,40}(?:professional|individual|enthusiast|expert)\s*,?\s*/i, ''],
  ['filler', /^\s*with (?:a |an )?(?:proven )?track record[^,.]{0,40}\s*,?\s*/i, ''],
  ['filler', /^\s*i am writing to (?:apply|express)[^,.]{0,60}\s*,?\s*/i, ''],
  ['filler', /^\s*i am (?:very )?(?:passionate|enthusiastic) about[^,.]{0,40}\s*,?\s*/i, ''],
  ['filler', /^\s*i believe (?:that )?i (?:am|would be|will be)[^,.]{0,60}\s*,?\s*/i, 'I '],
  ['filler', /^\s*over the years\s*,?\s*/i, ''],
  ['filler', /^\s*in recent years\s*,?\s*/i, ''],
  ['filler', /^\s*it is (?:my|my) pleasure to\b/gi, 'I enjoy'],
  // AI loves parking a transition at the head of a sentence, not just a bullet.
  ['filler', /(^|[\s.!?])(?:overall|in (?:summary|conclusion|essence)|to summaris[ez]e|ultimately)\s*,?\s*/gi, '$1'],
  ['filler', /(^|[\s.!?])(?:first|firstly|second|secondly|third|thirdly|finally|lastly)\s*,\s*/gi, '$1'],
  ['filler', /(^|[\s.!?])(?:additionally|furthermore|moreover|in addition)\s*,?\s*/gi, '$1'],
  ['filler', /(^|[\s.!?])(?:therefore|thus|hence|consequently)\s*,?\s*/gi, '$1'],
  ['filler', /^\s*in essence\s*,\s*/i, ''],
  ['filler', /\bin today'?s (?:business|world) [a-z\s-]{3,30},/gi, 'Today,'],
]

/** "Not just X, but Y" — one of the loudest tells. */
const PATTERNS: Rule[] = [
  ['cliche', /\bnot only\b([^,.;]{2,60}?)\bbut also\b/gi, '$1 and'],
  ['cliche', /\bnot just\b([^,.;]{2,60}?)\bbut(?: also)?\b/gi, '$1, and genuinely'],
  ['cliche', /\bnot only\b([^,.;]{2,60}?)\bbut\b/gi, '$1 and'],
]

/** Hedging adverbs. */
const HEDGES: Rule[] = [
  ['hedge', /\b(?:very|really|quite|extremely|incredibly|truly|virtually|simply|basically|actually|literally|arguably|successfully|effectively|consistently|previously)\s+/gi, ''],
  ['hedge', /\bhighly\s+(?=(?:skilled|qualified|motivated|experienced|proficient))/gi, ''],
]

/** CVs should not be written in the first person. */
const PERSON: Rule[] = [
  [
    'person',
    // (1) leading context, (2) the "I" to drop, (3) the verb to keep
    /(^|[\s.!?])(I)\s+(led|managed|built|designed|owned|drove|ran|created|developed|worked|coordinated|negotiated|delivered|improved|reduced|increased|introduced|launched|established|headed|oversaw|mentored|trained|grew|rebuilt|maintained|handled|planned|analysed|analyzed|supported|helped|initiated|streamlined|standardised|standardized|partnered)\b/gi,
    '$1$3',
  ],
  ['person', /\bi['’]m\s+(?=very\s|really\s|just\s)/gi, 'I '],
  // A bullet never opens with "I am …" + participle, or "I can <verb>".
  // Guarded against "I am a designer", which is fine in a summary.
  ['person', /^\s*I\s+(?:am|was|were|have|had)\s+(?!(?:a|an|the|not)\b)/i, ''],
  ['person', /^\s*I\s+(?:can|could|will|would|do|did)\s+/i, ''],
  // …after a comma, "I can <verb>" is a tic too ("…, I can streamline the process").
  ['person', /([,;]\s*)I\s+(?:can|could|will|would)\s+/gi, '$1'],
  ['person', /\bmy\s+(?=career|goal|aim|passion|strength|focus|story)\b/gi, 'the'],
]

/**
 * Contractions read human. The "have" family needs a guard: "we have a team"
 * must not become "we've a team".
 */
const CONTRACTIONS: Rule[] = [
  ['contraction', /\bi am\b/gi, "I'm"],
  ['contraction', /\bi have\b(?!\s+(?:a|an|the|my|our|no|not|never|been|to|had))/gi, "I've"],
  ['contraction', /\bi will\b/gi, "I'll"],
  ['contraction', /\bi would\b/gi, "I'd"],
  ['contraction', /\bdo not\b/gi, "don't"],
  ['contraction', /\bdoes not\b/gi, "doesn't"],
  ['contraction', /\bdid not\b/gi, "didn't"],
  ['contraction', /\bis not\b/gi, "isn't"],
  ['contraction', /\bare not\b/gi, "aren't"],
  ['contraction', /\bwas not\b/gi, "wasn't"],
  ['contraction', /\bwere not\b/gi, "weren't"],
  ['contraction', /\bhas not\b/gi, "hasn't"],
  ['contraction', /\bhave not\b(?!\s+(?:a|an|the|my|our|no|not|never|been|to|had))/gi, "haven't"],
  ['contraction', /\bhad not\b(?!\s+(?:a|an|the|my|our|no|not|never|been|to))/gi, "hadn't"],
  ['contraction', /\bwill not\b/gi, "won't"],
  ['contraction', /\bwould not\b/gi, "wouldn't"],
  ['contraction', /\bshould not\b/gi, "shouldn't"],
  ['contraction', /\bcould not\b/gi, "couldn't"],
  ['contraction', /\bcannot\b/gi, "can't"],
  ['contraction', /\bit is\b/gi, "it's"],
  ['contraction', /\bthat is\b/gi, "that's"],
  ['contraction', /\bthere is\b/gi, "there's"],
  ['contraction', /\bthey are\b/gi, "they're"],
  ['contraction', /\bwe are\b/gi, "we're"],
  ['contraction', /\byou are\b/gi, "you're"],
  ['contraction', /\bthey have\b(?!\s+(?:a|an|the|no|not|never|been|to|had))/gi, "they've"],
  ['contraction', /\bwe have\b(?!\s+(?:a|an|the|no|not|never|been|to|had))/gi, "we've"],
  ['contraction', /\byou have\b(?!\s+(?:a|an|the|no|not|never|been|to|had))/gi, "you've"],
  ['contraction', /\bthey will\b/gi, "they'll"],
  ['contraction', /\bwe will\b/gi, "we'll"],
  ['contraction', /\byou will\b/gi, "you'll"],
  ['contraction', /\blet us\b/gi, "let's"],
  ['contraction', /\bwho is\b/gi, "who's"],
]

/** Passive-ish padding that adds nothing. */
const PADDING: Rule[] = [
  ['transition', /\bin the event that\b/gi, 'if'],
  ['transition', /\bfor the purpose of\b/gi, 'to'],
  ['transition', /\bwith the aim of\b/gi, 'to'],
  ['transition', /\bwith a view to\b/gi, 'to'],
  ['transition', /\bin the process of\b\s*/gi, ''],
  ['transition', /\bon a (?:daily|regular|weekly) basis\b/gi, 'daily'],
  ['transition', /\bmake sure (?:that|to)\b/gi, 'ensure'],
  ['transition', /\bin a timely manner\b/gi, 'on time'],
  ['transition', /\bfurthermore\b/gi, 'also'],
]

/* --------------------------------- engine -------------------------------- */

function applyRules(text: string, rules: Rule[], stats: HumanizeStats): string {
  let output = text
  for (const [kind, pattern, replacement] of rules) {
    pattern.lastIndex = 0
    let count = 0
    output = output.replace(pattern, (...args) => {
      count += 1
      // args[0] is the whole match, args[1..n] are the capture groups.
      return replacement.replace(/\$(\d)/g, (_, index) => String(args[Number(index)] ?? ''))
    })
    if (count > 0) {
      stats[kind] += count
      stats.edits += count
    }
  }
  return output
}

/** Punctuation cleanup: double spaces, space-before-comma, repeated articles. */
function tidy(text: string, stats: HumanizeStats): string {
  const before = text
  const output = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\.\s*\./g, '.')
    // "with a a track record" — a removed buzzword can leave two articles
    .replace(/\b(an?)\s+(a|an|the)\b/gi, '$1')
  if (output !== before) {
    stats.format += 1
    stats.edits += 1
  }
  return output
}

/**
 * Reduces em-dash stacking: a dash before a lowercase word or a conjunction
 * becomes a comma; dashes before a capitalised new clause are kept.
 */
function varyRhythm(text: string, stats: HumanizeStats): string {
  let edits = 0
  // A dash used as a comma. Kept when a new capitalised clause follows.
  const output = text.replace(/\s*(?:—|–|-)\s+/g, (match, offset: number) => {
    const rest = text.slice(offset + match.length)
    const next = /^[a-z(]/.test(rest) || /^(?:and|but|which|while|as|so|because|meaning)\b/i.test(rest)
    if (next) {
      edits += 1
      return ', '
    }
    return match
  })
  if (edits > 0) {
    stats.rhythm += edits
    stats.edits += edits
  }
  // Cap semicolons — AI leans on them for rhythm.
  const semicolons = output.split(';').length - 1
  if (semicolons > 1) {
    let seen = 0
    const reduced = output.replace(/;\s*/g, () => {
      seen += 1
      return seen === 1 ? '; ' : ', '
    })
    stats.rhythm += semicolons - 1
    stats.edits += semicolons - 1
    return reduced
  }
  return output
}

export interface HumanizeOptions {
  /** Turn "it is" into "it's" and friends. On by default; off reads stiffer. */
  contractions?: boolean
  /** Strip the first person ("I led" -> "Led"). On by default. */
  dePersonalise?: boolean
}

export interface HumanizeResult {
  text: string
  stats: HumanizeStats
}

/** Humanise a single string (summary, one bullet, one description…). */
export function humanizeString(input: string, options: HumanizeOptions = {}): HumanizeResult {
  const stats = emptyStats()
  const { contractions = true, dePersonalise = true } = options
  if (!input || !input.trim()) return { text: input, stats }

  let text = ` ${input} ` // padding so the ^ anchored rules work
  text = applyRules(text, PATTERNS, stats)
  text = applyRules(text, CLIQUES, stats)
  text = applyRules(text, FILLER, stats)
  text = applyRules(text, PADDING, stats)
  text = applyRules(text, HEDGES, stats)
  if (dePersonalise) text = applyRules(text, PERSON, stats)
  if (contractions) text = applyRules(text, CONTRACTIONS, stats)
  text = varyRhythm(text, stats)
  text = tidy(text, stats)

  // Restore the original capitalisation at the start of the string.
  const trimmed = text.trim()
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return { text: capitalised, stats }
}

/**
 * Humanise every piece of prose in a CV. Facts, employers, dates, titles and
 * skills are never touched — only the writing.
 */
export function humanizeCvData(
  data: CvData,
  options: HumanizeOptions = {},
): { data: CvData; stats: HumanizeStats } {
  const stats = emptyStats()
  const merge = (part: HumanizeStats) => {
    for (const key of Object.keys(stats) as Array<keyof HumanizeStats>) {
      ;(stats[key] as number) += part[key]
    }
  }

  const run = (value: string) => {
    const result = humanizeString(value, options)
    merge(result.stats)
    return result.text
  }

  const next: CvData = {
    ...data,
    summary: run(data.summary),
    experience: data.experience.map((item) => ({
      ...item,
      // role/company/location are facts — only the bullets get rewritten
      bullets: item.bullets.map((bullet) => run(bullet)),
    })),
    education: data.education.map((item) => ({
      ...item,
      details: item.details ? run(item.details) : item.details,
    })),
    projects: data.projects.map((item) => rewriteEntry(item, run)),
    certifications: data.certifications.map((item) => rewriteEntry(item, run)),
    awards: data.awards.map((item) => rewriteEntry(item, run)),
    volunteer: data.volunteer.map((item) => rewriteEntry(item, run)),
    references: data.references.map((item) => rewriteEntry(item, run)),
  }

  stats.remaining = countTells(next)
  return { data: next, stats }
}

function rewriteEntry(item: CvData['projects'][number], run: (value: string) => string) {
  return {
    ...item,
    description: item.description ? run(item.description) : item.description,
  }
}

/* ------------------------------ tell scanner ----------------------------- */

/** Patterns that still read as machine-written after the pass. */
const TELL_PATTERNS: RegExp[] = [
  /\bspearheaded\b/gi,
  /\bleverag(?:e|ed|es|ing)\b/gi,
  /\b(?:results[- ]driven|detail[- ]oriented|team player|self[- ]starter|go[- ]getter)\b/gi,
  /\bproven track record\b/gi,
  /\bseamlessly\b/gi,
  /\bcutting[- ]edge\b/gi,
  /\bworld[- ]class\b/gi,
  /\bnot just\b[^,.;]{2,60}\bbut\b/gi,
  /\bnot only\b[^,.;]{2,60}\bbut\b/gi,
  /^\s*(?:additionally|furthermore|moreover|in conclusion|overall)\b/im,
  /\bin today'?s\b/gi,
  /\butili[sz](?:e|ed|es|ing)\b/gi,
  /\bin order to\b/gi,
  /\bdue to the fact that\b/gi,
  /\bhas the ability to\b/gi,
  /\bhigh[- ]impact\b/gi,
  /\binnovative\b/gi,
  /\bhighly (?:skilled|qualified|motivated|experienced)\b/gi,
  /\bvery (?:passionate|experienced|skilled)\b/gi,
  /(^|[.!?]\s+)i\s+(led|managed|built|designed|owned|ran|created|developed|delivered|improved|reduced|increased)/gi,
  /—/g,
  /\bFurthermore\b/gi,
]

/** All the prose fields of a CV, as one string — used by the meter and the server prompt. */
export function cvProse(data: CvData): string {
  return [
    data.summary,
    ...data.experience.flatMap((item) => item.bullets),
    ...data.education.map((item) => item.details),
    ...data.projects.map((item) => item.description),
    ...data.certifications.map((item) => item.description),
    ...data.awards.map((item) => item.description),
    ...data.volunteer.map((item) => item.description),
    ...data.references.map((item) => item.description),
  ]
    .filter((value) => value && value.trim().length > 0)
    .join('\n')
}

/** How many AI-ish tics remain in the CV. A heuristic, not a detector score. */
export function countTells(data: CvData): number {
  const prose = cvProse(data)
  let total = 0
  for (const pattern of TELL_PATTERNS) {
    pattern.lastIndex = 0
    total += prose.match(pattern)?.length ?? 0
  }
  return total
}



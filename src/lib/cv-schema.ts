/**
 * Robust handling of *messy* AI output.
 *
 * Models regularly return ```json fences, extra prose, `name` instead of
 * `fullName`, `null` instead of `""`, numbers where strings belong, a single
 * string where an array belongs, and skills as either a string[] or a
 * `{ category: items }` map. Nothing in here may throw for a single bad field —
 * a broken key must never take the whole CV down with it.
 */
import { z } from 'zod'
import {
  emptyCv,
  withIds,
  type CvData,
  type CvEducation,
  type CvEntry,
  type CvExperience,
  type CvLanguage,
  type CvSkillGroup,
} from './cv-types'
import { uid } from './utils'

/* ------------------------------- primitives ------------------------------ */

type Raw = Record<string, unknown>

function isPlainObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** "Full Name" | "full_name" | "fullName" all collapse to "fullname". */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function keyMap(obj: Raw): Raw {
  const out: Raw = {}
  for (const [key, value] of Object.entries(obj)) out[normalizeKey(key)] = value
  return out
}

/** First defined value among a list of alias keys (compact, case-insensitive). */
function pick(obj: Raw, aliases: readonly string[]): unknown {
  const map = keyMap(obj)
  for (const alias of aliases) {
    const value = map[normalizeKey(alias)]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function has(obj: Raw, aliases: readonly string[]): boolean {
  const map = keyMap(obj)
  return aliases.some((alias) => normalizeKey(alias) in map)
}

/** Anything -> a trimmed string. Objects become "" (never "[object Object]"). */
export function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'Yes' : ''
  if (Array.isArray(value)) {
    return value
      .map((v) => toText(v))
      .filter((v) => v.length > 0)
      .join(', ')
  }
  if (isPlainObject(value)) {
    for (const key of ['text', 'value', 'name', 'label', 'title', 'description', 'content']) {
      if (key in value) {
        const nested = toText(value[key])
        if (nested) return nested
      }
    }
    return ''
  }
  return ''
}

const BULLET_MARKERS = /^\s*(?:[-•*·▪‣∙]|\d+[.)])\s+/

/** A string (possibly multi-line / bulleted) -> array of clean items. */
export function splitListText(text: string): string[] {
  return text
    .split(/\r?\n|(?:^|\s)[•▪·‣∙]\s|;\s+/)
    .map((line) => line.replace(BULLET_MARKERS, '').trim())
    .filter((line) => line.length > 0)
}

/** Anything -> string[] (handles nested objects with text/value keys). */
export function toTextArray(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    const out: string[] = []
    for (const item of value) {
      if (isPlainObject(item)) {
        const nested = toText(item)
        if (nested) out.push(nested)
        continue
      }
      const text = toText(item)
      if (!text) continue
      // a single array slot that itself contains a bulleted block
      if (text.includes('\n')) out.push(...splitListText(text))
      else out.push(text)
    }
    return out
  }
  const text = toText(value)
  if (!text) return []
  return text.includes('\n') ? splitListText(text) : [text]
}

/**
 * Comma / newline / semicolon separated text -> array, but a single value that
 * already is an array is preserved. Used for `items: ["React", "Vite"]`.
 */
export function toDelimitedArray(value: unknown): string[] {
  if (Array.isArray(value)) return toTextArray(value)
  const text = toText(value)
  if (!text) return []
  return text
    .split(/\r?\n|,|;|\||·|\u2022/)
    .map((part) => part.replace(BULLET_MARKERS, '').trim())
    .filter((part) => part.length > 0)
}

/** Numbers -> strings, null -> "". */
export function preprocessToString(value: unknown): string {
  return toText(value)
}

const DATE_LIKE = /\d/
const RANGE_SEPARATOR = /\s*(?:–|—|―|-{1,3}|\bto\b|\buntil\b|\bthrough\b)\s*/i

/** "2019 – 2022" | "Jan 2019 to Present" | "03/2019-07/2021" -> { start, end } */
export function splitPeriod(value: unknown): { start: string; end: string } {
  const text = toText(value)
  if (!text) return { start: '', end: '' }
  const cleaned = text.replace(/^(?:from|since)\s+/i, '').replace(/[()]/g, ' ').trim()
  const parts = cleaned
    .split(RANGE_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  if (parts.length >= 2 && DATE_LIKE.test(parts[0])) {
    return { start: parts[0], end: parts[parts.length - 1] }
  }
  if (parts.length === 2 && DATE_LIKE.test(parts[1])) {
    return { start: parts[0], end: parts[1] }
  }
  return { start: cleaned, end: '' }
}

const DURATION_HINT = new RegExp(`^\\s*\\d+(\\.\\d+)?\\s*(?:\\+)?\\s*(?:years?|yrs?|months?|mos?)\\b`, 'i')

/** "English (Native)" | "French: Fluent" | "Spanish – B2" -> { name, level } */
export function splitLanguage(value: string): { name: string; level: string } {
  const text = value.trim()
  if (!text) return { name: '', level: '' }
  const match =
    text.match(/^(.*?)\s*[([–—:-]\s*([^)\]]+?)\s*[)\]]?$/) ?? text.match(/^(.*?)\s*[([–—-]\s*([^)\]]+?)$/)
  if (match && DATE_LIKE.test(match[1]) === false) {
    const name = match[1].replace(/[([–—-]\s*$/, '').trim()
    const level = match[2].replace(/[)\]]+$/, '').trim()
    if (name && level && !DURATION_HINT.test(level)) return { name, level }
  }
  return { name: text, level: '' }
}

export { DATE_LIKE, isPlainObject, pick, has, keyMap }

/* --------------------------------- JSON ---------------------------------- */

/** Strips ```json fences and prose, then slices from the first { to the last }. */
export function extractJson(raw: string): string {
  let text = (raw ?? '').trim()
  if (!text) throw new Error('EMPTY_RESPONSE')

  // ```json ... ``` / ``` ... ```
  const fence = text.match(/```(?:json|JSON|javascript|js)?\s*([\s\S]*?)```/)
  if (fence && fence[1]) text = fence[1].trim()

  // Some models prepend "Here is the JSON:" — cut to the outermost object.
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  return text
    .replace(/^\uFEFF/, '')
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
    .replace(/[\u201C\u201D]/g, '"') // smart quotes around keys/values
    .trim()
}

/** Repairs the most common breakage before JSON.parse gives up. */
function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const singleLine = text.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (match) => match.replace(/\r?\n/g, '\\n'),
    )
    return JSON.parse(singleLine)
  }
}

/* ----------------------------- section coercion -------------------------- */

function asArray(value: unknown): Raw[] {
  if (Array.isArray(value)) return value.filter(isPlainObject)
  if (isPlainObject(value)) {
    // { "Acme Corp": { role, dates } } -> [{ company: 'Acme Corp', ... }]
    const entries = Object.entries(value)
    if (entries.length > 0 && entries.every(([, v]) => isPlainObject(v))) {
      return entries.map(([key, v]) => ({ company: key, ...(v as Raw) }))
    }
    return [value]
  }
  return []
}

const EXP_ROLE = ['role', 'position', 'jobTitle', 'title', 'designation', 'jobRole']
const EXP_COMPANY = ['company', 'employer', 'organization', 'organisation', 'firm', 'workplace', 'companyName', 'client']
const EXP_LOCATION = ['location', 'city', 'place', 'region', 'area', 'country', 'workLocation']
const EXP_START = ['startDate', 'start', 'from', 'dateStart', 'startYear', 'begin']
const EXP_END = ['endDate', 'end', 'to', 'dateEnd', 'endYear', 'until']
const EXP_PERIOD = ['period', 'dates', 'dateRange', 'date', 'duration', 'when', 'tenure', 'timeframe']
const EXP_BULLETS = [
  'bullets', 'achievements', 'responsibilities', 'highlights', 'duties',
  'accomplishments', 'description', 'details', 'tasks', 'contributions',
  'keyAchievements', 'summary', 'responsibility',
]

export function coerceExperience(value: unknown): CvExperience[] {
  return asArray(value).map((item) => {
    const period = splitPeriod(pick(item, EXP_PERIOD))
    const start = toText(pick(item, EXP_START)) || period.start
    const end = toText(pick(item, EXP_END)) || period.end
    let bullets = toTextArray(pick(item, EXP_BULLETS))
    if (bullets.length === 0) {
      const leftover = toText(item.impact ?? item.notes)
      bullets = leftover ? [leftover] : []
    }
    return {
      id: toText(item.id) || uid('exp'),
      role: toText(pick(item, EXP_ROLE)),
      company: toText(pick(item, EXP_COMPANY)),
      location: toText(pick(item, EXP_LOCATION)),
      startDate: start,
      endDate: end,
      bullets,
    }
  })
}

const EDU_DEGREE = ['degree', 'qualification', 'title', 'program', 'programme', 'course', 'study', 'field', 'major']
const EDU_SCHOOL = ['institution', 'school', 'university', 'college', 'academy', 'organisation', 'organization', 'institute']
const EDU_DETAILS = ['details', 'description', 'grade', 'gpa', 'honours', 'honors', 'notes', 'thesis', 'achievements', 'coursework']

export function coerceEducation(value: unknown): CvEducation[] {
  return asArray(value).map((item) => {
    const period = splitPeriod(pick(item, EXP_PERIOD))
    return {
      id: toText(item.id) || uid('edu'),
      degree: toText(pick(item, EDU_DEGREE)),
      institution: toText(pick(item, EDU_SCHOOL)),
      location: toText(pick(item, EXP_LOCATION)),
      startDate: toText(pick(item, EXP_START)) || period.start,
      endDate: toText(pick(item, EXP_END)) || period.end,
      details: toTextArray(pick(item, EDU_DETAILS)).join('; '),
    }
  })
}

const SKILL_CATEGORY = ['category', 'name', 'group', 'label', 'title', 'type', 'area']
const SKILL_ITEMS = ['items', 'skills', 'list', 'values', 'keywords', 'technologies', 'tools', 'entries']

/** string[] | { category: items } | string -> [{ category, items }] */
export function coerceSkillGroups(value: unknown): CvSkillGroup[] {
  if (value === null || value === undefined) return []

  // "React, Node, SQL" or "React\nNode"
  if (typeof value === 'string') {
    const items = toDelimitedArray(value)
    return items.length > 0 ? [{ id: uid('skill'), category: 'Core Skills', items }] : []
  }
  if (typeof value === 'number' || typeof value === 'boolean') return []

  // { Frontend: ['React'], Backend: 'Node' }
  if (isPlainObject(value)) {
    if (has(value, SKILL_CATEGORY) || has(value, SKILL_ITEMS)) {
      const category = toText(pick(value, SKILL_CATEGORY)) || 'Core Skills'
      const items = toDelimitedArray(pick(value, SKILL_ITEMS))
      return items.length > 0 ? [{ id: toText(value.id) || uid('skill'), category, items }] : []
    }
    const groups: CvSkillGroup[] = []
    for (const [category, items] of Object.entries(value)) {
      const list = toDelimitedArray(items)
      if (list.length > 0) groups.push({ id: uid('skill'), category: category.trim(), items: list })
    }
    return groups
  }

  if (!Array.isArray(value)) return []

  // string[] -> one group; object[] -> groups
  if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
    const items = toDelimitedArray(value)
    return items.length > 0 ? [{ id: uid('skill'), category: 'Core Skills', items }] : []
  }

  const groups: CvSkillGroup[] = []
  for (const item of value) {
    if (!isPlainObject(item)) {
      groups.push(...coerceSkillGroups(item))
      continue
    }
    const category = toText(pick(item, SKILL_CATEGORY))
    const items = toDelimitedArray(pick(item, SKILL_ITEMS))
    if (items.length === 0) {
      const flat = toText(item) // [{ name: 'React', level: 'Expert' }]
      if (flat) groups.push({ id: uid('skill'), category: 'Core Skills', items: [flat] })
      continue
    }
    groups.push({ id: toText(item.id) || uid('skill'), category: category || 'Core Skills', items })
  }

  // merge duplicate categories that came from separate entries
  const merged = new Map<string, CvSkillGroup>()
  for (const group of groups) {
    const key = normalizeKey(group.category)
    const existing = merged.get(key)
    if (existing) existing.items = Array.from(new Set([...existing.items, ...group.items]))
    else merged.set(key, group)
  }
  return Array.from(merged.values())
}

/* ------------------------------ zod coercion ----------------------------- *
 * Every leaf uses `.catch(...)` so a single malformed field degrades to an
 * empty value instead of failing the whole CV. Input is preprocessed first
 * (strings/numbers/arrays/objects are all tolerated), because AI output is
 * reliably *almost* the right shape.
 * ------------------------------------------------------------------------- */

const zText = z.preprocess(preprocessToString, z.string().catch(''))
const zTextList = z.preprocess(toTextArray, z.array(z.string()).catch([]))
const asObject = (value: unknown) => (isPlainObject(value) ? value : {})

const zContact = z.preprocess(
  asObject,
  z.object({
    email: zText,
    phone: zText,
    address: zText,
    linkedin: zText,
    portfolio: zText,
    website: zText,
  }),
)

const zExperience = z.preprocess(
  coerceExperience,
  z
    .array(
      z.preprocess(
        asObject,
        z.object({
          id: zText,
          role: zText,
          company: zText,
          location: zText,
          startDate: zText,
          endDate: zText,
          bullets: zTextList,
        }),
      ),
    )
    .catch([]),
)

const zEducation = z.preprocess(
  coerceEducation,
  z
    .array(
      z.preprocess(
        asObject,
        z.object({
          id: zText,
          degree: zText,
          institution: zText,
          location: zText,
          startDate: zText,
          endDate: zText,
          details: zText,
        }),
      ),
    )
    .catch([]),
)

const zSkillGroups = z.preprocess(
  coerceSkillGroups,
  z
    .array(
      z.preprocess(
        asObject,
        z.object({
          id: zText,
          category: zText,
          items: zTextList,
        }),
      ),
    )
    .catch([]),
)

const zEntries = z.preprocess(
  coerceEntries,
  z
    .array(
      z.preprocess(
        asObject,
        z.object({
          id: zText,
          title: zText,
          subtitle: zText,
          date: zText,
          description: zText,
        }),
      ),
    )
    .catch([]),
)

const zLanguages = z.preprocess(
  coerceLanguages,
  z
    .array(
      z.preprocess(
        asObject,
        z.object({
          id: zText,
          name: zText,
          level: zText,
        }),
      ),
    )
    .catch([]),
)

export const CvSchema = z.preprocess(
  asObject,
  z.object({
    fullName: zText,
    title: zText,
    summary: zText,
    contact: zContact,
    experience: zExperience,
    education: zEducation,
    skills: zSkillGroups,
    certifications: zEntries,
    projects: zEntries,
    awards: zEntries,
    volunteer: zEntries,
    references: zEntries,
    languages: zLanguages,
  }),
)

/** Unwraps `{ cv: {...} }`, `{ resume: {...} }`, `{ data: {...} }` envelopes. */
function unwrapCv(raw: unknown, depth = 0): Raw {
  if (!isPlainObject(raw) || depth > 3) return {}
  const looksLikeCv = has(raw, [
    'fullName', 'name', 'summary', 'profile', 'experience', 'workExperience',
    'employmentHistory', 'education', 'skills', 'title',
  ])
  if (looksLikeCv) return raw
  for (const key of ['cv', 'resume', 'curriculumVitae', 'data', 'result', 'output', 'candidate']) {
    const inner = pick(raw, [key])
    if (isPlainObject(inner)) return unwrapCv(inner, depth + 1)
    if (Array.isArray(inner) && isPlainObject(inner[0])) return unwrapCv(inner[0], depth + 1)
  }
  return raw
}

const A = {
  fullName: ['fullName', 'full_name', 'name', 'candidateName', 'personName'],
  title: ['title', 'jobTitle', 'position', 'headline', 'professionalTitle', 'targetRole', 'role', 'designation'],
  summary: ['summary', 'professionalSummary', 'profile', 'about', 'aboutMe', 'objective', 'personalStatement', 'overview', 'bio', 'introduction', 'careerSummary'],
  contact: ['contact', 'contactInfo', 'contactDetails', 'personalInfo', 'personal', 'personalDetails', 'details'],
  email: ['email', 'emailAddress', 'mail', 'eMail'],
  phone: ['phone', 'phoneNumber', 'mobile', 'telephone', 'cell', 'contactNumber'],
  address: ['address', 'location', 'city', 'place', 'addressLine', 'residence', 'region', 'country'],
  linkedin: ['linkedin', 'linkedInUrl', 'linkedinProfile', 'linkedinUrl'],
  portfolio: ['portfolio', 'portfolioUrl', 'portfolioLink'],
  website: ['website', 'websiteUrl', 'personalWebsite', 'site', 'blog', 'url', 'web'],
  experience: ['experience', 'workExperience', 'employmentHistory', 'professionalExperience', 'work_history', 'jobs', 'positions', 'career', 'employment'],
  education: ['education', 'educationHistory', 'academicBackground', 'academics', 'qualifications', 'studies', 'degrees'],
  skills: ['skills', 'skillGroups', 'technicalSkills', 'coreCompetencies', 'competencies', 'expertise', 'technologies', 'skillCategories', 'keySkills'],
  certifications: ['certifications', 'certificates', 'licenses', 'credentials', 'courses', 'training'],
  projects: ['projects', 'sideProjects', 'personalProjects', 'selectedProjects', 'portfolioProjects'],
  awards: ['awards', 'honors', 'honours', 'achievements', 'accolades', 'recognitions'],
  volunteer: ['volunteer', 'volunteering', 'volunteerExperience', 'communityService', 'extracurricular', 'activities'],
  references: ['references', 'referees', 'referenceList'],
  languages: ['languages', 'languageSkills', 'spokenLanguages'],
} as const

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value)
    if (text) return text
  }
  return ''
}

function nested(source: Raw, aliases: readonly string[]): Raw | undefined {
  for (const alias of aliases) {
    const inner = pick(source, [alias])
    if (isPlainObject(inner)) return inner
  }
  return undefined
}

/**
 * Maps every known alias onto the canonical CvData shape, then runs the result
 * through the forgiving Zod schema and guarantees ids on every list item.
 */
export function normalizeCvObject(input: unknown): CvData {
  const raw = unwrapCv(input)
  const contactSource: Raw = nested(raw, A.contact) ?? {}

  const normalized = {
    fullName: firstString(pick(raw, A.fullName)),
    title: firstString(pick(raw, A.title), pick(contactSource, ['title', 'headline'])),
    summary: firstString(pick(raw, A.summary), pick(contactSource, ['summary', 'bio'])),
    contact: {
      email: firstString(pick(contactSource, A.email), pick(raw, A.email)),
      phone: firstString(pick(contactSource, A.phone), pick(raw, A.phone)),
      address: firstString(pick(contactSource, A.address), pick(raw, A.address)),
      linkedin: firstString(pick(contactSource, A.linkedin), pick(raw, A.linkedin)),
      portfolio: firstString(pick(contactSource, A.portfolio), pick(raw, A.portfolio)),
      website: firstString(pick(contactSource, A.website), pick(raw, A.website)),
    },
    experience: coerceExperience(pick(raw, A.experience)),
    education: coerceEducation(pick(raw, A.education)),
    skills: coerceSkillGroups(pick(raw, A.skills)),
    certifications: coerceEntries(pick(raw, A.certifications)),
    projects: coerceEntries(pick(raw, A.projects)),
    awards: coerceEntries(pick(raw, A.awards)),
    volunteer: coerceEntries(pick(raw, A.volunteer)),
    references: coerceEntries(pick(raw, A.references)),
    languages: coerceLanguages(pick(raw, A.languages)),
  }

  const result = CvSchema.safeParse(normalized)
  const data = (result.success ? result.data : normalized) as CvData
  return withIds({
    ...emptyCv(),
    ...data,
    contact: { ...emptyCv().contact, ...data.contact },
  })
}

/** Full pipeline: fenced/messy AI text -> validated CvData. */
export function parseCvJson(raw: string): CvData {
  const json = extractJson(raw)
  if (!json) throw new Error('EMPTY_RESPONSE')
  return normalizeCvObject(parseJsonLoose(json))
}



/* ------------------------- certifications & friends ---------------------- */

const ENTRY_TITLE = [
  'title', 'name', 'certification', 'certificate', 'project', 'award', 'role',
  'position', 'license', 'event', 'reference', 'degree', 'course', 'label',
]
const ENTRY_SUBTITLE = [
  'subtitle', 'issuer', 'organization', 'organisation', 'company', 'publisher',
  'client', 'institution', 'authority', 'provider', 'school', 'author', 'where',
  'technologies', 'stack', 'tech', 'link', 'url',
]
const ENTRY_DATE = ['date', 'year', 'issued', 'issueDate', 'when', 'period', 'dates', 'duration', 'startDate']
const ENTRY_DESCRIPTION = ['description', 'summary', 'details', 'text', 'note', 'notes', 'impact', 'highlights', 'responsibilities']

export function coerceEntries(value: unknown): CvEntry[] {
  const source = Array.isArray(value)
    ? value
    : isPlainObject(value)
      ? Object.entries(value).map(([key, v]) =>
          isPlainObject(v) ? { title: key, ...(v as Raw) } : { title: key, description: v },
        )
      : toTextArray(value).map((title) => ({ title }))

  const out: CvEntry[] = []
  for (const item of source) {
    if (!isPlainObject(item)) {
      const text = toText(item)
      if (text) out.push({ id: uid('entry'), title: text, subtitle: '', date: '', description: '' })
      continue
    }
    const title = toText(pick(item, ENTRY_TITLE))
    const subtitle = toText(pick(item, ENTRY_SUBTITLE))
    const date = toText(pick(item, ENTRY_DATE))
    const description = toTextArray(pick(item, ENTRY_DESCRIPTION)).join(' ')
    if (!title && !subtitle && !description) continue
    out.push({
      id: toText(item.id) || uid('entry'),
      title,
      subtitle,
      date,
      description,
    })
  }
  return out
}

const LANG_NAME = ['name', 'language', 'lang', 'title', 'label']
const LANG_LEVEL = ['level', 'proficiency', 'fluency', 'proficiencyLevel', 'ability', 'rating', 'grade', 'command']

/** ["English (Native)", { language: 'French', proficiency: 'B2' }] -> languages */
export function coerceLanguages(value: unknown): CvLanguage[] {
  const out: CvLanguage[] = []
  const push = (name: string, level: string) => {
    if (!name.trim() && !level.trim()) return
    out.push({ id: uid('lang'), name: name.trim(), level: level.trim() })
  }

  if (value === null || value === undefined) return []
  if (typeof value === 'string') {
    for (const part of toDelimitedArray(value)) {
      const { name, level } = splitLanguage(part)
      push(name, level)
    }
    return out
  }
  if (isPlainObject(value) && !has(value, LANG_NAME)) {
    for (const [name, level] of Object.entries(value)) push(name, toText(level))
    return out
  }
  if (isPlainObject(value)) {
    const { name, level } = splitLanguage(toText(pick(value, LANG_NAME)))
    push(name, toText(pick(value, LANG_LEVEL)) || level)
    return out
  }
  if (!Array.isArray(value)) return out

  for (const item of value) {
    if (isPlainObject(item)) {
      const { name, level } = splitLanguage(toText(pick(item, LANG_NAME)))
      push(name, toText(pick(item, LANG_LEVEL)) || level)
      continue
    }
    const text = toText(item)
    if (!text) continue
    const { name, level } = splitLanguage(text)
    push(name, level)
  }
  return out
}

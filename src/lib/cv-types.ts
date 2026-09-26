import { uid } from './utils'

/** ------------------------------------------------------------------ *
 *  The CV data model. Everything the templates render comes from here. *
 * ------------------------------------------------------------------- */

export interface CvContact {
  email: string
  phone: string
  address: string
  linkedin: string
  portfolio: string
  website: string
}

export interface CvExperience {
  id: string
  role: string
  company: string
  location: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface CvEducation {
  id: string
  degree: string
  institution: string
  location: string
  startDate: string
  endDate: string
  details: string
}

export interface CvSkillGroup {
  id: string
  category: string
  items: string[]
}

/** Shared shape for certifications / projects / awards / volunteer / references. */
export interface CvEntry {
  id: string
  title: string
  subtitle: string
  date: string
  description: string
}

export interface CvLanguage {
  id: string
  name: string
  level: string
}

export interface CvData {
  fullName: string
  title: string
  summary: string
  contact: CvContact
  experience: CvExperience[]
  education: CvEducation[]
  skills: CvSkillGroup[]
  certifications: CvEntry[]
  projects: CvEntry[]
  awards: CvEntry[]
  volunteer: CvEntry[]
  references: CvEntry[]
  languages: CvLanguage[]
}

export const TEMPLATE_IDS = [
  'modern',
  'ats',
  'ats-numbered',
  'ats-classic',
  'executive',
  'minimal',
  'harvard',
  'creative',
  'timeline',
  'editorial',
] as const

export type TemplateId = (typeof TEMPLATE_IDS)[number]

export interface CvSettings {
  template: TemplateId
  accent: string
  fontScale: number
}

/** Accent palette offered in the design panel (muted, print-safe inks). */
export const ACCENT_SWATCHES = [
  '#1F4E79',
  '#2F5D50',
  '#7A3B2E',
  '#3B3A6B',
  '#0F766E',
  '#8A6D1F',
  '#334155',
  '#9D2B5B',
  '#1E3A8A',
  '#4C1D95',
  '#111827',
  '#B45309',
] as const

export const DEFAULT_SETTINGS: CvSettings = {
  template: 'modern',
  accent: '#1F4E79',
  fontScale: 1,
}

export function emptyContact(): CvContact {
  return {
    email: '',
    phone: '',
    address: '',
    linkedin: '',
    portfolio: '',
    website: '',
  }
}

export function emptyCv(): CvData {
  return {
    fullName: '',
    title: '',
    summary: '',
    contact: emptyContact(),
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    awards: [],
    volunteer: [],
    references: [],
    languages: [],
  }
}

export function newExperience(): CvExperience {
  return {
    id: uid('exp'),
    role: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    bullets: [''],
  }
}

export function newEducation(): CvEducation {
  return {
    id: uid('edu'),
    degree: '',
    institution: '',
    location: '',
    startDate: '',
    endDate: '',
    details: '',
  }
}

export function newSkillGroup(): CvSkillGroup {
  return { id: uid('skill'), category: '', items: [] }
}

export function newEntry(): CvEntry {
  return { id: uid('entry'), title: '', subtitle: '', date: '', description: '' }
}

export function newLanguage(): CvLanguage {
  return { id: uid('lang'), name: '', level: '' }
}

/** Deep clone that is safe on the plain data we store (no functions/dates). */
export function cloneCv(data: CvData): CvData {
  if (typeof structuredClone === 'function') return structuredClone(data)
  return JSON.parse(JSON.stringify(data)) as CvData
}

/** Guarantees every list item has an id (used for AI-provided payloads). */
export function withIds(data: CvData): CvData {
  const assign = <T extends { id?: string }>(items: T[], prefix: string): T[] =>
    items.map((item) => ({ ...item, id: item.id && item.id.length > 0 ? item.id : uid(prefix) }))

  return {
    ...data,
    experience: assign(data.experience, 'exp'),
    education: assign(data.education, 'edu'),
    skills: assign(data.skills, 'skill'),
    certifications: assign(data.certifications, 'cert'),
    projects: assign(data.projects, 'proj'),
    awards: assign(data.awards, 'award'),
    volunteer: assign(data.volunteer, 'vol'),
    references: assign(data.references, 'ref'),
    languages: assign(data.languages, 'lang'),
  }
}

/** True when there is genuinely nothing to render (used for the empty state). */
export function isEmptyCv(data: CvData): boolean {
  const anyText = (values: string[]) => values.some((v) => v.trim().length > 0)
  return (
    !anyText([data.fullName, data.title, data.summary]) &&
    !anyText(Object.values(data.contact)) &&
    data.experience.every((e) => !anyText([e.role, e.company, ...e.bullets])) &&
    data.education.every((e) => !anyText([e.degree, e.institution, e.details])) &&
    data.skills.every((s) => !anyText([s.category, ...s.items])) &&
    data.projects.every((p) => !anyText([p.title, p.description])) &&
    data.certifications.every((c) => !anyText([c.title, c.description])) &&
    data.awards.every((a) => !anyText([a.title, a.description])) &&
    data.volunteer.every((v) => !anyText([v.title, v.description])) &&
    data.references.every((r) => !anyText([r.title, r.description])) &&
    data.languages.every((l) => !anyText([l.name, l.level]))
  )
}

/** A completed contact line for the CV header, empty parts skipped. */
export function contactParts(contact: CvContact): string[] {
  return [
    contact.email,
    contact.phone,
    contact.address,
    contact.linkedin,
    contact.portfolio,
    contact.website,
  ]
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export function formatRange(start: string, end: string, fallback = '') {
  const s = start.trim()
  const e = end.trim()
  if (s && e) return `${s} – ${e}`
  if (s) return `${s} – Present`
  if (e) return e
  return fallback
}

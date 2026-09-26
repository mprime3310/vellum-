import type { CSSProperties, ReactNode } from 'react'
import type { BlockKind, CvBlock } from '~/lib/cv-layout'
import { contactParts, formatRange, type CvData, type TemplateId } from '~/lib/cv-types'

/** A4 at 96dpi — the single source of truth for the page box. */
export const PAGE_W = 794
export const PAGE_H = 1123

/* Document inks. A CV is a printed artefact: these are deliberately concrete,
 * print-safe neutrals, independent of the app's UI theme tokens. */
export const INK = '#11161F'
export const BODY = '#39404D'
export const MUTED = '#6B7280'
export const FAINT = '#989FA9'
export const RULE = '#E2E5EA'
export const PAPER = '#FFFFFF'

export const SANS = 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif'
export const SERIF = 'Georgia, "Times New Roman", Times, serif'
export const TIMES = '"Times New Roman", Times, Georgia, serif'

export interface CvTheme {
  accent: string
  fontScale: number
}

/** Scales a print size by the user's font-scale slider. */
export function fs(px: number, theme: CvTheme): number {
  return Math.round(px * theme.fontScale * 100) / 100
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = (hex || '').replace('#', '').trim()
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  if (full.length !== 6) return hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((value) => Number.isNaN(value))) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface TemplateDef {
  id: TemplateId
  name: string
  blurb: string
  /** Reserved page margins in px. */
  padding: { top: number; right: number; bottom: number; left: number }
  fontFamily: string
  /** Applied to the page content wrapper AND to the measurement container. */
  contentStyle: CSSProperties
  build: (data: CvData, theme: CvTheme) => CvBlock[]
  /** Small swatch preview used by the design panel (independent of content). */
  preview: (theme: CvTheme) => { background: string; accentBar: string; lines: string[] }
}

/* ------------------------------- blocks ---------------------------------- */

/**
 * How many skill items go into one block.
 *
 * A skills group is a single unsplittable block, so a long list can be half a
 * page tall and strand everything below it. Chunking keeps each block small
 * enough to flow, which is what stops a page ending halfway down with blank
 * paper beneath it. Twelve items renders as a comfortable 2-3 line group at
 * every template's type scale, including up to 1.3x font scale.
 */
const SKILL_ITEMS_PER_BLOCK = 12


export function block(id: string, kind: BlockKind, node: ReactNode): CvBlock {
  return { id, kind, node }
}

export function headingBlock(
  id: string,
  kind: BlockKind,
  label: string,
  render: (label: string) => ReactNode,
): CvBlock {
  return { id: `heading-${id}`, kind, node: render(label), splittable: false }
}

export function paragraphBlock(
  id: string,
  text: string,
  fontStyle: CSSProperties,
): CvBlock | null {
  const clean = text.replace(/\s*\n+\s*/g, ' ').trim()
  if (!clean) return null
  return {
    id: `para-${id}`,
    kind: 'paragraph',
    text: clean,
    splittable: true,
    renderText: (slice) => (
      <p style={{ ...fontStyle, margin: '0 0 6px' }}>
        <span data-cv-text>{slice}</span>
      </p>
    ),
    node: (
      <p style={{ ...fontStyle, margin: '0 0 6px' }}>
        <span data-cv-text>{clean}</span>
      </p>
    ),
  }
}

/* ------------------------------ section data ----------------------------- */

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'volunteer'
  | 'references'

export const DEFAULT_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Professional Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards & Honours',
  languages: 'Languages',
  volunteer: 'Volunteer Experience',
  references: 'References',
}

/* ------------------------------ style kit -------------------------------- */

export interface EntryParts {
  title: string
  sub: string
  date: string
}

export interface StyleKit {
  labels?: Partial<Record<SectionKey, string>>
  order: SectionKey[]
  /** How each section heading is rendered (block kind defaults to 'heading'). */
  heading: (label: string) => ReactNode
  headingKind?: BlockKind
  entry: (parts: EntryParts) => ReactNode
  bullet: (text: string) => ReactNode
  badges: (category: string, items: string[]) => ReactNode
  /** paragraph style used for summaries, education details and descriptions */
  paragraphStyle: CSSProperties
  /** language row */
  language: (name: string, level: string) => ReactNode
  /** generic one-line entry (certifications, awards, volunteer, references) */
  simpleEntry: (parts: EntryParts) => ReactNode
  /** vertical rhythm */
  spacing?: { sectionTop?: number; entryBottom?: number }
}

const spacer = (id: string, height: number): CvBlock => ({
  id: `spacer-${id}`,
  kind: 'spacer',
  node: <div style={{ height }} />,
})

function joined(parts: Array<string | undefined>, separator = ' · ') {
  return parts
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0)
    .join(separator)
}

function entryParts(title: string, sub: string, date: string): EntryParts {
  const cleanTitle = title.trim()
  const cleanSub = sub.trim()
  return {
    title: cleanTitle || cleanSub,
    sub: cleanTitle ? cleanSub : '',
    date: date.trim(),
  }
}

/**
 * The shared section pipeline: hides empty sections, emits keep-together entry
 * heads followed by atomic bullets, and keeps paragraphs splittable.
 */
export function standardBlocks(
  data: CvData,
  theme: CvTheme,
  kit: StyleKit,
  header: CvBlock[],
): CvBlock[] {
  const blocks: CvBlock[] = [...header]

  const pushHeading = (key: SectionKey) => {
    const label = kit.labels?.[key] ?? DEFAULT_LABELS[key]
    blocks.push(headingBlock(key, kit.headingKind ?? 'heading', label.toUpperCase(), kit.heading))
  }

  for (const key of kit.order) {
    if (key === 'summary') {
      const para = paragraphBlock('summary', data.summary, kit.paragraphStyle)
      if (!para) continue
      pushHeading(key)
      blocks.push(para)
      continue
    }

    if (key === 'experience') {
      const list = data.experience.filter(
        (item) =>
          joined([item.role, item.company, item.location]).length > 0 ||
          item.bullets.some((bullet) => bullet.trim().length > 0),
      )
      if (list.length === 0) continue
      pushHeading(key)
      for (const item of list) {
        blocks.push(
          block(
            `exp-${item.id}`,
            'entry',
            kit.entry(
              entryParts(
                item.role,
                joined([item.company, item.location]),
                formatRange(item.startDate, item.endDate),
              ),
            ),
          ),
        )
        item.bullets
          .map((bullet) => bullet.trim())
          .filter((bullet) => bullet.length > 0)
          .forEach((bullet, index) => {
            blocks.push(block(`exp-${item.id}-b${index}`, 'bullet', kit.bullet(bullet)))
          })
        blocks.push(spacer(`exp-${item.id}`, kit.spacing?.entryBottom ?? 8))
      }
      continue
    }

    if (key === 'education') {
      const list = data.education.filter(
        (item) => joined([item.degree, item.institution, item.details]).length > 0,
      )
      if (list.length === 0) continue
      pushHeading(key)
      for (const item of list) {
        blocks.push(
          block(
            `edu-${item.id}`,
            'entry',
            kit.entry(
              entryParts(
                item.degree,
                joined([item.institution, item.location]),
                formatRange(item.startDate, item.endDate),
              ),
            ),
          ),
        )
        const details = paragraphBlock(`edu-details-${item.id}`, item.details, kit.paragraphStyle)
        if (details) blocks.push(details)
        blocks.push(spacer(`edu-${item.id}`, kit.spacing?.entryBottom ?? 8))
      }
      continue
    }

    if (key === 'skills') {
      const list = data.skills.filter(
        (group) => group.category.trim().length > 0 || group.items.length > 0,
      )
      if (list.length === 0) continue
      pushHeading(key)
      for (const group of list) {
        /*
         * A skills group renders as ONE atomic block, so a long list becomes a
         * block half a page tall. When it does not fit in the space left, the
         * whole thing jumps to the next page and strands the remainder — the
         * "text stops halfway down, rest of the page is blank" effect.
         *
         * Chunk it instead: several ordinary blocks that flow and fill like any
         * other content. The category is shown once, on the first chunk, and
         * consecutive chunks sit flush so the list still reads as continuous.
         */
        const items = group.items.filter((item) => item.trim().length > 0)
        if (items.length === 0) {
          blocks.push(block(`skill-${group.id}`, 'badges', kit.badges(group.category, [])))
        } else {
          for (let start = 0; start < items.length; start += SKILL_ITEMS_PER_BLOCK) {
            const chunk = items.slice(start, start + SKILL_ITEMS_PER_BLOCK)
            const isFirst = start === 0
            const id = isFirst ? `skill-${group.id}` : `skill-${group.id}-${start}`
            blocks.push(block(id, 'badges', kit.badges(isFirst ? group.category : '', chunk)))
          }
        }
        blocks.push(spacer(`skill-${group.id}`, 6))
      }
      continue
    }

    if (key === 'languages') {
      const list = data.languages.filter((item) => joined([item.name, item.level]).length > 0)
      if (list.length === 0) continue
      pushHeading(key)
      for (const item of list) {
        blocks.push(block(`lang-${item.id}`, 'line', kit.language(item.name, item.level)))
      }
      blocks.push(spacer('languages', kit.spacing?.entryBottom ?? 8))
      continue
    }

    // projects / certifications / awards / volunteer / references
    const list = data[key].filter((item) => joined([item.title, item.subtitle, item.description]).length > 0)
    if (list.length === 0) continue
    pushHeading(key)
    for (const item of list) {
      blocks.push(
        block(
          `${key}-${item.id}`,
          'entry',
          kit.simpleEntry(entryParts(item.title, item.subtitle, item.date)),
        ),
      )
      const description = paragraphBlock(`${key}-desc-${item.id}`, item.description, kit.paragraphStyle)
      if (description) blocks.push(description)
      blocks.push(spacer(`${key}-${item.id}`, 6))
    }
  }

  return blocks
}

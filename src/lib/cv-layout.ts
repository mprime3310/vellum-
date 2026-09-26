import type { ReactNode } from 'react'

/**
 * Professional A4 pagination.
 *
 * Templates never emit one long div: they emit an ORDERED ARRAY OF BLOCKS with
 * keep-together / keep-with-next semantics. This module then fills pages top to
 * bottom, honouring those rules, splitting long paragraphs at line boundaries
 * with widow/orphan control, never splitting a bullet mid-item, and wrapping
 * skill badge rows as whole rows.
 */

export type BlockKind =
  | 'header' // name / title / contact band — atomic
  | 'heading' // section heading — must stay with the start of what follows
  | 'entry' // role / company / dates line — atomic, keeps its first bullet
  | 'line' // single atomic line (e.g. a contact or details line)
  | 'bullet' // atomic
  | 'badges' // atomic, wraps by whole row
  | 'paragraph' // splittable at line boundaries
  | 'spacer'

export interface CvBlock {
  id: string
  kind: BlockKind
  node: ReactNode
  /** Raw text for splittable paragraphs. */
  text?: string
  /** Renders an arbitrary slice of `text` with the paragraph's own styling. */
  renderText?: (text: string) => ReactNode
  /** true => may be split across pages at a line boundary. */
  splittable?: boolean
}

export interface PlacedBlock {
  block: CvBlock
  /** Present when only a slice of a paragraph was placed here. */
  text?: string
  height: number
}

export interface PagePlan {
  blocks: PlacedBlock[]
  used: number
}

export interface PaginateOptions {
  contentHeight: number
  heights: Record<string, number>
  lineHeights: Record<string, number>
  /** Measures a paragraph slice by temporarily setting it on [data-cv-text]. */
  measureText: (blockId: string, text: string) => number
  /** Widow/orphan threshold, in lines, for both sides of a split. */
  minLines?: number
  /**
   * Sub-pixel slack treated as "fits". Without it a page is abandoned the moment
   * the next block would cross the line by a fraction of a pixel, which leaves a
   * dead band of blank paper above the bottom margin on every page.
   */
  epsilon?: number
}

const DEFAULT_LINE_HEIGHT = 18
const DEFAULT_EPSILON = 0.5
/**
 * The most of an atomic next block a heading will insist on keeping with it,
 * as a fraction of the page. Beyond this, insisting is pointless: a block that
 * big almost never fits in the remaining space, so demanding it only pushes the
 * heading to the next page and leaves a hole behind.
 */
const MAX_KEEP_WITH_FRACTION = 0.34

export function paginate(blocks: CvBlock[], options: PaginateOptions): PagePlan[] {
  const { contentHeight, heights, lineHeights, measureText } = options
  const minLines = options.minLines ?? 2
  const eps = options.epsilon ?? DEFAULT_EPSILON
  if (contentHeight <= 0) return [{ blocks: [], used: 0 }]

  const pages: PagePlan[] = []
  let current: PlacedBlock[] = []
  /**
   * Spacers that have been measured but not committed yet. They are vertical
   * rhythm *between* two blocks, so they may only be spent when the block that
   * follows them also lands on this page. The previous implementation added
   * spacer heights straight to the running total while never rendering them,
   * so every page was planned 27-72px taller than it painted — that is what
   * left the ragged dead band above the bottom margin.
   */
  let pending: PlacedBlock[] = []

  const used = (): number => {
    let sum = 0
    for (const placed of current) sum += placed.height
    return sum
  }
  const lead = (): number => {
    let sum = 0
    for (const placed of pending) sum += placed.height
    return sum
  }
  /** Room left for a block including the rhythm that precedes it. */
  const available = (): number => contentHeight - used() - lead()
  const place = (block: CvBlock, height: number, text?: string) => {
    if (current.length > 0) for (const spacer of pending) current.push(spacer)
    pending = []
    current.push({ block, text, height })
  }
  const flush = () => {
    pending = []
    // Rhythm is meaningless once a page ends: a trailing spacer is just blank
    // paper, so drop it (and anything it dragged along).
    while (current.length > 0 && current[current.length - 1].block.kind === 'spacer') current.pop()
    if (current.length > 0) pages.push({ blocks: current, used: used() })
    current = []
  }
  const nextReal = (index: number): CvBlock | null => {
    for (let i = index + 1; i < blocks.length; i++) {
      if (blocks[i].kind !== 'spacer') return blocks[i]
    }
    return null
  }
  /**
   * How much of the next block a heading/entry must drag along with it.
   *
   * A splittable paragraph only has to contribute its first `minLines` lines —
   * reserving its FULL height would be actively harmful: the summary paragraph
   * is far taller than a page's worth of leftover space, so every heading in
   * front of it would be exiled to a page of its own, stranding the header
   * alone on page 1.
   *
   * The same reasoning applies to an oversized ATOMIC block (a long skills
   * group, a wordy bullet). Demanding all of it fit means it rarely can, so
   * the heading is pushed down every time and leaves a big hole. Cap what we
   * insist on so the heading can still sit above a partial block.
   */
  const keepWithHeight = (next: CvBlock | null): number => {
    if (!next) return 0
    const height = Math.min(heights[next.id] ?? 0, contentHeight)
    if (next.splittable && next.text) {
      const lineHeight = lineHeights[next.id] ?? DEFAULT_LINE_HEIGHT
      return Math.min(height, lineHeight * minLines)
    }
    return Math.min(height, contentHeight * MAX_KEEP_WITH_FRACTION)
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const height = heights[block.id] ?? 0

    if (block.kind === 'spacer') {
      if (height > 0) pending.push({ block, height })
      continue
    }

    /* ------------------------ splittable paragraphs ------------------------ */
    if (block.splittable && block.text && block.renderText) {
      let remaining = block.text
      let guard = 0

      while (remaining.length > 0 && guard < 400) {
        guard += 1
        const lineHeight = lineHeights[block.id] ?? DEFAULT_LINE_HEIGHT
        const measure = (text: string) => measureText(block.id, text)
        const lineCount = (text: string) => Math.max(1, Math.round(measure(text) / lineHeight))
        const room = available()
        const fullHeight = measure(remaining)

        // Fits in what is left of this page?
        if (fullHeight <= room + eps) {
          place(block, fullHeight, remaining)
          remaining = ''
          break
        }

        // Not enough room to leave a respectable chunk behind: start a new page.
        if (room < lineHeight * minLines && used() > 0) {
          flush()
          continue
        }

        const words = remaining.split(/\s+/).filter((w) => w.length > 0)
        const totalLines = lineCount(remaining)
        const prefix = (count: number) => words.slice(0, count).join(' ')
        const suffix = (count: number) => words.slice(count).join(' ')
        let take = maxWordsThatFit(words, room, measure)

        // Orphan control: never leave fewer than `minLines` lines behind.
        if (take > 0 && lineCount(prefix(take)) < minLines && used() > 0) {
          flush()
          continue
        }
        if (take <= 0) {
          if (used() > 0) {
            flush()
            continue
          }
          take = 1 // pathological page: guarantee forward progress
        }

        // Widow control: never push a single line onto the next page.
        if (totalLines > minLines * 2 && words.length - take > 0) {
          let restLines = lineCount(suffix(take))
          let attempts = 0
          while (restLines > 0 && restLines < minLines && take > minLines && attempts < 6) {
            const reduced = maxWordsThatFit(words, room - lineHeight, measure)
            if (reduced <= 0 || reduced >= take) break
            take = reduced
            restLines = words.length - take > 0 ? lineCount(suffix(take)) : 0
            attempts += 1
          }
          if (restLines === 1 && used() > 0) {
            flush()
            continue
          }
        }

        place(block, measure(prefix(take)), prefix(take))
        remaining = suffix(take).trim()
        if (remaining.length > 0) flush()
      }
      continue
    }

    /* --------------------------- atomic blocks ---------------------------- */
    if (height <= contentHeight + eps) {
      const keepsWithNext = block.kind === 'heading' || block.kind === 'entry'
      if (keepsWithNext) {
        const next = nextReal(i)
        const reserved = keepWithHeight(next)
        // A heading must never end up stranded at the bottom of a page: it has
        // to drag the start of whatever follows onto the same page.
        if (used() + lead() + height + reserved > contentHeight + eps && used() > 0) flush()
      }
      if (used() + lead() + height > contentHeight + eps && used() > 0) flush()
      place(block, height)
      continue
    }

    // Taller than a whole page and not splittable: give it a page to itself.
    flush()
    place(block, height)
    flush()
  }

  flush()
  return pages.length > 0 ? pages : [{ blocks: [], used: 0 }]
}

/** Largest word count whose rendered height still fits in `available`. */
function maxWordsThatFit(
  words: string[],
  available: number,
  measure: (text: string) => number,
): number {
  if (words.length === 0 || available <= 0) return 0
  let lo = 1
  let hi = words.length
  let best = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (measure(words.slice(0, mid).join(' ')) <= available) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

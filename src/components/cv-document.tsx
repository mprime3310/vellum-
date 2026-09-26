import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { PagePlan } from '~/lib/cv-layout'
import { paginate } from '~/lib/cv-layout'
import type { CvData, CvSettings } from '~/lib/cv-types'
import { PAGE_H, PAGE_W, getTemplate, type CvTheme } from './templates'

export interface CvDocumentProps {
  data: CvData
  settings: CvSettings
  /** Filled with the live A4 page elements in order — used by the PDF export. */
  pageNodesRef?: RefObject<HTMLElement[]>
  onPageCountChange?: (count: number) => void
  onMeasuringChange?: (measuring: boolean) => void
  className?: string
  /** Show the "Page X of N" caption under each sheet. */
  showCaptions?: boolean
}

const MEASURE_DEBOUNCE_MS = 120
/** How many times the overflow guard may shrink the budget before giving up. */
const MAX_SHRINK_ATTEMPTS = 4
/** Never shrink a page below this, however badly a sheet overflows. */
const MIN_PAGE_BUDGET = 240

/**
 * The CSS `transform: scale()` currently applied to an element, or 1.
 *
 * The preview fits the 794px sheet to the available width with
 * `transform: scale(...)`, and that transform is inherited by the off-screen
 * measurement stage. `getBoundingClientRect()` reports post-transform pixels,
 * so anything measured inside the preview comes back multiplied by this factor
 * — at a typical desktop width that is ~0.8, i.e. every height 20% short.
 * Dividing by it restores true CSS pixels. Derived from the element's own
 * geometry (rect width vs. layout width) so it is correct for any nesting of
 * transforms and needs no DOM mutation.
 */
function previewScale(element: HTMLElement): number {
  const layoutWidth = element.offsetWidth
  if (!layoutWidth) return 1
  const scale = element.getBoundingClientRect().width / layoutWidth
  return Number.isFinite(scale) && scale > 0.05 ? scale : 1
}

/**
 * Renders the CV as a stack of real A4 sheets.
 *
 * 1. The template emits blocks; we render them once, off-screen, at the exact
 *    content width and read each block's height (after `document.fonts.ready`).
 * 2. The layout engine fills pages top-to-bottom honouring keep-together,
 *    keep-with-next, widow/orphan and no-split-bullets rules.
 * 3. Only then do we paint the sheets, so preview and exported PDF are
 *    pixel-identical and never reflow after the user sees them.
 */
export function CvDocument({
  data,
  settings,
  pageNodesRef,
  onPageCountChange,
  onMeasuringChange,
  className,
  showCaptions = true,
}: CvDocumentProps) {
  const def = useMemo(() => getTemplate(settings.template), [settings.template])
  const theme = useMemo<CvTheme>(
    () => ({ accent: settings.accent, fontScale: settings.fontScale }),
    [settings.accent, settings.fontScale],
  )
  const blocks = useMemo(() => def.build(data, theme), [def, data, theme])

  const contentWidth = PAGE_W - def.padding.left - def.padding.right
  const contentHeight = PAGE_H - def.padding.top - def.padding.bottom

  const measureRef = useRef<HTMLDivElement | null>(null)
  const pagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shrinkAttempts = useRef(0)
  const blockElements = useRef(new Map<string, HTMLDivElement>())
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const [pages, setPages] = useState<PagePlan[] | null>(null)
  const [measuring, setMeasuring] = useState(true)
  /**
   * The height budget handed to the paginator. Normally the true content
   * height; it is only ever reduced by the overflow guard below, which
   * re-paginates until no sheet actually overflows.
   */
  const [budget, setBudget] = useState(contentHeight)

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({ ...def.contentStyle, width: contentWidth }),
    [def, contentWidth],
  )

  /**
   * Restore the full page height whenever the document itself changes.
   *
   * This is deliberately a separate effect from the measurement pass: the
   * overflow guard shrinks `budget` and that must re-run pagination, but it
   * must NOT undo its own shrink — hence `budget` is absent from the deps here.
   */
  useEffect(() => {
    setBudget(contentHeight)
    shrinkAttempts.current = 0
  }, [blocks, contentHeight])

  useEffect(() => {
    let cancelled = false
    setMeasuring(true)

    const run = async () => {
      if (typeof document !== 'undefined' && 'fonts' in document) {
        try {
          await document.fonts.ready
        } catch {
          /* fonts API unavailable — measure with fallback metrics */
        }
      }
      if (cancelled || !measureRef.current) return

      /*
       * The preview wraps the sheets in `transform: scale(fit-to-width)`, and
       * getBoundingClientRect() reports POST-transform pixels. Measuring those
       * under-reports every block by the zoom factor (~0.8 at desktop width),
       * so the paginator packed roughly 25% too much onto each page and the
       * surplus was amputated by `.cv-page { overflow: hidden }` — text cut off
       * flush against the bottom edge. Divide the zoom back out so every height
       * is in true CSS pixels, which is the unit `contentHeight` is in.
       */
      const scale = previewScale(measureRef.current)

      const heights: Record<string, number> = {}
      const lineHeights: Record<string, number> = {}
      const current = blocksRef.current
      const ids = new Set(current.map((block) => block.id))

      for (const block of current) {
        const element = blockElements.current.get(block.id)
        if (!element) continue
        heights[block.id] = element.getBoundingClientRect().height / scale
        const computed = window.getComputedStyle(element)
        const lineHeight = Number.parseFloat(computed.lineHeight)
        const fontSize = Number.parseFloat(computed.fontSize) || 14
        lineHeights[block.id] =
          Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : fontSize * 1.4
      }

      // prune stale refs from earlier renders
      for (const key of Array.from(blockElements.current.keys())) {
        if (!ids.has(key)) blockElements.current.delete(key)
      }

      const measureText = (blockId: string, text: string) => {
        const element = blockElements.current.get(blockId)
        if (!element) return 0
        const textElement = element.querySelector<HTMLElement>('[data-cv-text]')
        if (!textElement) return element.getBoundingClientRect().height / scale
        const original = textElement.textContent ?? ''
        textElement.textContent = text
        const height = element.getBoundingClientRect().height / scale
        textElement.textContent = original
        return height
      }

      const plans = paginate(current, { contentHeight: budget, heights, lineHeights, measureText, minLines: 2 })
      if (cancelled) return
      setPages(plans)
      setMeasuring(false)
    }

    const timer = setTimeout(run, MEASURE_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [blocks, contentHeight, budget])

  useEffect(() => {
    onMeasuringChange?.(measuring)
  }, [measuring, onMeasuringChange])

  useEffect(() => {
    if (pages) onPageCountChange?.(pages.length)
  }, [pages, onPageCountChange])

  /**
   * Overflow guard — the thing that makes clipped text impossible.
   *
   * `.cv-page` is `overflow: hidden`, so if a sheet ever paints more than the
   * budget allows, the last line is silently amputated with no bottom margin
   * left to show for it. Measuring is supposed to prevent that, but a late web
   * font, a template quirk or a sub-pixel rounding error can all make a sheet
   * paint taller than the paginator believed. So after every paint we measure
   * the real sheets; if any one is too tall we shrink the budget by the exact
   * overflow and paginate again. It converges in one or two passes and the
   * guard is bounded, so it can never loop.
   */
  useLayoutEffect(() => {
    if (!pages || pages.length === 0) return
    const sheets = pagesContainerRef.current?.querySelectorAll<HTMLElement>('.cv-page')
    if (!sheets || sheets.length === 0) return
    if (shrinkAttempts.current >= MAX_SHRINK_ATTEMPTS) return

    let worst = 0
    sheets.forEach((sheet) => {
      // A sheet's DIRECT children are the laid-out blocks. (Its first child is
      // the first block itself, not a wrapper — reading that one's children
      // measures a fraction of the page and the guard never fires.)
      const blocks = sheet.children
      if (blocks.length === 0) return
      const scale = previewScale(sheet)
      let painted = 0
      for (const block of Array.from(blocks)) {
        painted += (block as HTMLElement).getBoundingClientRect().height / scale
      }
      worst = Math.max(worst, painted - budget)
    })

    if (worst > 0.5) {
      shrinkAttempts.current += 1
      setBudget((previous) => Math.max(MIN_PAGE_BUDGET, previous - worst - 1))
    }
  }, [pages, budget])

  const rendered: PagePlan[] = pages ?? [{ blocks: [], used: 0 }]


  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* measurement stage — off-screen, identical width and typography to a page */}
      <div aria-hidden="true" className="cv-measure" ref={measureRef} style={wrapperStyle}>
        {blocks.map((block) => (
          <div
            key={block.id}
            className="cv-flow"
            ref={(element) => {
              if (element) blockElements.current.set(block.id, element)
            }}
          >
            {block.node}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-5" ref={pagesContainerRef}>
        {rendered.map((page, pageIndex) => (
          <div key={pageIndex} className="flex flex-col items-center gap-2">
            <div
              className="cv-page"
              data-cv-page={pageIndex + 1}
              ref={(element) => {
                if (!pageNodesRef) return
                const next = pageNodesRef.current.slice()
                if (element) next[pageIndex] = element
                else next.splice(pageIndex, 1)
                pageNodesRef.current = next
              }}
              style={{
                ...def.contentStyle,
                paddingTop: def.padding.top,
                paddingRight: def.padding.right,
                paddingBottom: def.padding.bottom,
                paddingLeft: def.padding.left,
              }}
            >
              {page.blocks.map((placed, index) => (
                <div key={`${placed.block.id}-${index}`} className="cv-flow">
                  {placed.text !== undefined && placed.block.renderText
                    ? placed.block.renderText(placed.text)
                    : placed.block.node}
                </div>
              ))}
            </div>
            {showCaptions ? (
              <div className="flex items-center gap-2 text-[11px] font-medium text-canvas-foreground/70 select-none">
                <span>
                  Page {pageIndex + 1} of {rendered.length}
                </span>
                <span className="text-canvas-foreground/30">·</span>
                <span>A4 · 210 × 297 mm</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {measuring && pages === null ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-full bg-primary/85 px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-panel">
            Laying out your pages…
          </span>
        </div>
      ) : null}
    </div>
  )
}

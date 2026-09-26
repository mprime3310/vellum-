import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FileText, Maximize2, Minus, Plus, Sparkles } from 'lucide-react'
import { CvDocument } from './cv-document'
import { Button } from './ui/button'
import { Badge } from './ui/field'
import { DownloadButtons } from './download-buttons'
import { useCvStore } from '~/lib/cv-store'
import { isEmptyCv } from '~/lib/cv-types'
import { PAGE_H, PAGE_W } from '~/components/templates'
import { clamp } from '~/lib/utils'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.5
const GAP = 20

export function PreviewPanel({
  pageNodesRef,
  onGoToInput,
}: {
  pageNodesRef: React.RefObject<HTMLElement[]>
  onGoToInput: () => void
}) {
  const { data, settings } = useCvStore()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [fitScale, setFitScale] = useState(0.7)
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [pageCount, setPageCount] = useState(0)
  const [measuring, setMeasuring] = useState(true)

  const empty = isEmptyCv(data)
  const scale = zoom === 'fit' ? fitScale : zoom

  // Fit-to-width: the sheet is 794px wide, so the scale is usable width / 794.
  useLayoutEffect(() => {
    const element = scrollerRef.current
    if (!element) return
    const update = () => {
      const style = window.getComputedStyle(element)
      const horizontal =
        element.clientWidth -
        Number.parseFloat(style.paddingLeft || '0') -
        Number.parseFloat(style.paddingRight || '0')
      setFitScale(clamp(horizontal / PAGE_W, MIN_ZOOM, MAX_ZOOM))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [empty])

  useEffect(() => {
    if (empty) setPageCount(0)
  }, [empty])

  const step = useCallback(
    (direction: 1 | -1) => {
      setZoom((current) => {
        const base = current === 'fit' ? fitScale : current
        return clamp(Math.round((base + direction * 0.1) * 100) / 100, MIN_ZOOM, MAX_ZOOM)
      })
    },
    [fitScale],
  )

  const zoomPct = Math.round(scale * 100)

  if (empty) {
    return (
      <div className="grid-fade flex h-full flex-col bg-canvas">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm rounded-xl border border-canvas-line/40 bg-canvas/60 p-6 text-center backdrop-blur-sm">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Sparkles className="size-5" />
            </span>
            <h2 className="text-[15px] font-semibold text-canvas-foreground">
              Your A4 CV appears here
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-canvas-foreground/70">
              Paste your existing CV, describe the role you want, or drop in a job description. The
              preview paginates like a real page — exactly what you download.
            </p>
            <Button variant="accent" size="lg" className="mt-4 w-full" onClick={onGoToInput}>
              Start writing
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex flex-wrap items-center gap-2 border-b border-canvas-line/40 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="subtle"
            size="iconSm"
            aria-label="Zoom out"
            onClick={() => step(-1)}
            disabled={zoomPct <= MIN_ZOOM * 100}
          >
            <Minus className="size-4" />
          </Button>
          <button
            type="button"
            onClick={() => setZoom('fit')}
            className="min-w-14 rounded-md px-1.5 py-1 text-[12px] font-semibold text-canvas-foreground transition-colors hover:bg-canvas/30"
            title="Fit width"
          >
            {zoom === 'fit' ? 'Fit' : `${zoomPct}%`}
          </button>
          <Button
            variant="subtle"
            size="iconSm"
            aria-label="Zoom in"
            onClick={() => step(1)}
            disabled={zoomPct >= MAX_ZOOM * 100}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="subtle"
            size="iconSm"
            aria-label="Fit to width"
            onClick={() => setZoom('fit')}
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {measuring ? (
            <Badge className="bg-canvas/40 text-canvas-foreground/80">measuring…</Badge>
          ) : pageCount > 0 ? (
            <Badge className="bg-canvas/40 text-canvas-foreground/80">
              {pageCount} page{pageCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
          <DownloadButtons pageNodesRef={pageNodesRef} compact />
        </div>
      </div>

      <div ref={scrollerRef} className="scroll-slim min-h-0 flex-1 overflow-auto p-5">
        <div
          className="mx-auto"
          style={{
            width: PAGE_W * scale,
            height: pageCount > 0 ? pageCount * (PAGE_H * scale + GAP) : undefined,
          }}
        >
          <div style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <CvDocument
              data={data}
              settings={settings}
              pageNodesRef={pageNodesRef}
              onPageCountChange={setPageCount}
              onMeasuringChange={setMeasuring}
              showCaptions={scale >= 0.75}
            />
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-canvas-foreground/50">
          <FileText className="size-3" />
          A4 · 210 × 297 mm — what you see is what you download
        </p>
      </div>
    </div>
  )
}

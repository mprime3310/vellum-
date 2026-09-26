import { useEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { AppHeader } from './app-header'
import { AiSettingsDialog } from './ai-settings-dialog'
import { InputPanel } from './input-panel'
import { EditorPanel } from './editor-panel'
import { PreviewPanel } from './preview-panel'
import { DesignPanel } from './design-panel'
import { MobileTabs, type MobileTab } from './mobile-tabs'
import { DownloadButtons } from './download-buttons'
import { TooltipProvider } from './ui/field'
import { CvProvider } from '~/lib/cv-store'
import { useTheme } from '~/lib/use-theme'
import type { CvData, CvSettings } from '~/lib/cv-types'

/**
 * The dashboard.
 *
 * Desktop (>=1024px): three columns — input, editor, preview with the design
 * panel docked underneath it.
 * Mobile: one panel at a time, driven by the sticky bottom tab bar. The PDF and
 * Word buttons sit in the header *and* in a fixed action bar, so downloading is
 * always one tap away.
 *
 * The rendered A4 page elements are hoisted into a single ref so the header, the
 * mobile bar and the preview all export the exact same sheets.
 */
export function Dashboard({ data, settings }: { data: CvData; settings: CvSettings }) {
  return (
    <CvProvider initialData={data} initialSettings={settings}>
      <DashboardInner />
    </CvProvider>
  )
}

/**
 * Tracks a CSS media query.
 *
 * Used to mount exactly ONE PreviewPanel. Previously both the desktop column
 * and the mobile tab bar rendered a PreviewPanel, so two CvDocument instances
 * were live at once: each measured and paginated independently, the hidden one
 * (display:none) measured every block as 0, and because both were handed the
 * same `pageNodesRef` the export could end up capturing the hidden instance's
 * dead nodes. Mounting one at a time removes the whole class of problem.
 *
 * Starts false so the first client render matches the server's.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])
  return matches
}

function DashboardInner() {
  const [tab, setTab] = useState<MobileTab>('preview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const pageNodesRef = useRef<HTMLElement[]>([])
  const { resolved: resolvedTheme } = useTheme()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const openSettings = () => setSettingsOpen(true)

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <AppHeader onOpenSettings={openSettings} pageNodesRef={pageNodesRef} />

        <main className="flex min-h-0 flex-1">
          <Panel label="Input" className="hidden lg:flex lg:w-[clamp(320px,25vw,390px)]">
            <InputPanel onOpenSettings={openSettings} />
          </Panel>

          <Panel label="Editor" className="hidden lg:flex lg:w-[clamp(340px,30vw,480px)]">
            <EditorPanel onOpenSettings={openSettings} />
          </Panel>

          {isDesktop ? (
            <section
              aria-label="Preview and design"
              className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border"
            >
              <div className="min-h-0 flex-1">
                <PreviewPanel pageNodesRef={pageNodesRef} onGoToInput={() => setTab('input')} />
              </div>
              <div className="scroll-slim max-h-[44%] shrink-0 overflow-y-auto border-t border-border bg-background p-3">
                <h2 className="mb-2.5 text-[12.5px] font-semibold text-foreground">Design</h2>
                <DesignPanel />
              </div>
            </section>
          ) : null}

          {/* mobile: exactly one panel on screen */}
          {isDesktop ? null : (
            <section aria-label={`${tab} panel`} className="flex min-h-0 w-full flex-1 flex-col">
            {tab === 'input' ? (
              <div className="h-full min-h-0 p-4">
                <InputPanel onOpenSettings={openSettings} />
              </div>
            ) : null}
            {tab === 'edit' ? (
              <div className="h-full min-h-0 p-4">
                <EditorPanel onOpenSettings={openSettings} />
              </div>
            ) : null}
            {tab === 'preview' ? (
              <div className="h-full min-h-0">
                <PreviewPanel pageNodesRef={pageNodesRef} onGoToInput={() => setTab('input')} />
              </div>
            ) : null}
            {tab === 'design' ? (
              <div className="scroll-slim h-full min-h-0 p-4">
                <DesignPanel />
              </div>
            ) : null}
            </section>
          )}
        </main>

        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
          <p className="flex-1 text-[11.5px] leading-tight text-muted-foreground">
            Export keeps the exact layout you see above.
          </p>
          <DownloadButtons pageNodesRef={pageNodesRef} compact />
        </div>

        <MobileTabs value={tab} onChange={setTab} />

        <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <Toaster
          theme={resolvedTheme}
          position="bottom-center"
          closeButton
          toastOptions={{ duration: 4500 }}
        />
      </div>
    </TooltipProvider>
  )
}

function Panel({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label: string
}) {
  return (
    <section
      aria-label={label}
      className={`min-h-0 shrink-0 flex-col border-r border-border bg-background p-4 ${className ?? ''}`}
    >
      {children}
    </section>
  )
}

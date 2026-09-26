import { useEffect } from 'react'
import { KeyRound, Moon, Redo2, Sun, Undo2 } from 'lucide-react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/field'
import { DownloadButtons } from './download-buttons'
import { useCvStore } from '~/lib/cv-store'
import { useTheme } from '~/lib/use-theme'

export function AppHeader({
  onOpenSettings,
  pageNodesRef,
}: {
  onOpenSettings: () => void
  pageNodesRef: React.RefObject<HTMLElement[]>
}) {
  const { canUndo, canRedo, undo, redo } = useCvStore()
  const theme = useTheme()

  // Keyboard history: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (!meta) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <a href="/" className="flex min-w-0 items-center gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-primary-foreground"
          style={{ background: 'var(--color-primary)' }}
        >
          V
        </span>
        <span className="hidden min-w-0 flex-col leading-none sm:flex">
          <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            Vellum
          </span>
          <span className="truncate text-[10.5px] text-muted-foreground">AI CV Studio</span>
        </span>
      </a>

      <div className="ml-2 flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Undo"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Redo"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme.resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={theme.toggle}
            >
              {theme.resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme.resolved === 'dark' ? 'Light theme' : 'Dark theme'}</TooltipContent>
        </Tooltip>

        <Button variant="outline" onClick={onOpenSettings} className="px-2.5 sm:px-3.5">
          <KeyRound className="size-4" />
          <span className="hidden sm:inline">AI settings</span>
        </Button>
        <DownloadButtons pageNodesRef={pageNodesRef} compact />
      </div>
    </header>
  )
}

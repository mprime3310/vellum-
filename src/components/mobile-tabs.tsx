import { Eye, Palette, PenLine, WandSparkles } from 'lucide-react'
import { cn } from '~/lib/utils'

export type MobileTab = 'input' | 'edit' | 'preview' | 'design'

const TABS: Array<{ value: MobileTab; label: string; icon: typeof Eye }> = [
  { value: 'input', label: 'Input', icon: WandSparkles },
  { value: 'edit', label: 'Edit', icon: PenLine },
  { value: 'preview', label: 'Preview', icon: Eye },
  { value: 'design', label: 'Design', icon: Palette },
]

/** Sticky bottom navigation — one panel at a time on small screens. */
export function MobileTabs({
  value,
  onChange,
}: {
  value: MobileTab
  onChange: (tab: MobileTab) => void
}) {
  return (
    <nav
      className="z-30 flex h-16 shrink-0 items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Sections"
    >
      {TABS.map(({ value: tab, label, icon: Icon }) => {
        const active = value === tab
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                active ? 'bg-accent-soft text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}

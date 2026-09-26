import { Check } from 'lucide-react'
import { Slider } from './ui/controls'
import { useCvStore } from '~/lib/cv-store'
import { ACCENT_SWATCHES, TEMPLATE_IDS, type TemplateId } from '~/lib/cv-types'
import { TEMPLATE_LIST } from '~/components/templates'
import { cn } from '~/lib/utils'

/** A small abstract rendering of each template — cheap, and always accurate. */
function TemplateThumb({
  template,
  accent,
  active,
  onSelect,
}: {
  template: (typeof TEMPLATE_LIST)[number]
  accent: string
  active: boolean
  onSelect: () => void
}) {
  const preview = template.preview({ accent, fontScale: 1 })
  const bar = template.id === 'creative' ? 'h-3 rounded-sm' : 'h-2'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative overflow-hidden rounded-lg border p-1.5 text-left transition-all',
        active
          ? 'border-accent bg-accent-soft/60 ring-1 ring-accent'
          : 'border-border bg-card hover:border-ring/50',
      )}
      aria-pressed={active}
    >
      <div
        className="flex h-24 flex-col gap-1 overflow-hidden rounded-md p-2"
        style={{ background: preview.background }}
      >
        <div className={cn('w-full', bar)} style={{ background: preview.accentBar }} />
        <div className={cn('w-3/5', bar)} style={{ background: preview.accentBar, opacity: 0.55 }} />
        {preview.lines.map((color, index) => (
          <div
            key={index}
            className="h-1 rounded-full"
            style={{ background: color, width: index % 2 === 0 ? '100%' : '82%' }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1 px-0.5">
        <span className="truncate text-[12px] font-semibold text-foreground">{template.name}</span>
        {active ? <Check className="ml-auto size-3.5 shrink-0 text-accent-foreground" /> : null}
      </div>
      <span className="block truncate px-0.5 text-[10.5px] leading-tight text-muted-foreground">
        {template.blurb}
      </span>
    </button>
  )
}

export function DesignPanel() {
  const { settings, updateSettings } = useCvStore()
  const theme = { accent: settings.accent, fontScale: settings.fontScale }

  return (
    <div className="space-y-5 p-1">
      <section>
        <h3 className="mb-2 text-[12.5px] font-semibold text-foreground">Template</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {TEMPLATE_LIST.map((template) => (
            <TemplateThumb
              key={template.id}
              template={template}
              accent={settings.accent}
              active={settings.template === template.id}
              onSelect={() => updateSettings({ template: template.id as TemplateId })}
            />
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {TEMPLATE_LIST.length} templates today — the registry in{' '}
          <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10.5px]">
            src/components/templates
          </code>{' '}
          takes as many as you add.
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-[12.5px] font-semibold text-foreground">Accent colour</h3>
        <div className="flex flex-wrap gap-2">
          {ACCENT_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => updateSettings({ accent: swatch })}
              className={cn(
                'size-9 rounded-full border-2 transition-transform hover:scale-110',
                settings.accent === swatch ? 'border-foreground' : 'border-transparent',
              )}
              style={{ background: swatch }}
              aria-label={`Accent ${swatch}`}
              aria-pressed={settings.accent === swatch}
            />
          ))}
          <label className="relative size-9 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border text-[10px] font-semibold text-muted-foreground">
            <span className="absolute inset-0 flex items-center justify-center">+</span>
            <input
              type="color"
              value={settings.accent}
              onChange={(event) => updateSettings({ accent: event.target.value }, { merge: true })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom accent colour"
            />
          </label>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[12.5px] font-semibold text-foreground">Font size</h3>
          <span className="text-[11.5px] tabular-nums text-muted-foreground">
            {Math.round(settings.fontScale * 100)}%
          </span>
        </div>
        <Slider
          min={0.85}
          max={1.25}
          step={0.05}
          value={[settings.fontScale]}
          onValueChange={([value]) => updateSettings({ fontScale: value }, { merge: true })}
        />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-muted-foreground">
          <span>Compact</span>
          <span>Readable</span>
        </div>
      </section>
    </div>
  )
}

export { TEMPLATE_IDS }

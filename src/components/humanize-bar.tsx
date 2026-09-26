import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle, Sparkles, WandSparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from './ui/field'
import { useCvStore } from '~/lib/cv-store'
import { countTells, humanizeCvData } from '~/lib/cv-humanize'
import { humanizeCv, type HumanizeOutcome } from '~/lib/cv-ai.functions'
import { aiRequestPayload, providerKeyError, getProvider } from '~/lib/ai-settings'
import { useAiSettings } from '~/lib/use-ai-settings'
import { isEmptyCv } from '~/lib/cv-types'

/**
 * Two ways to make the prose read like a person wrote it:
 * the instant rule-based pass (free, offline, undoable) and an AI rewrite that
 * adds variety rules cannot.
 */
export function HumanizeBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data, replaceData, updateData } = useCvStore()
  const settings = useAiSettings()
  const [busy, setBusy] = useState(false)

  const empty = isEmptyCv(data)
  // Recomputed on every edit so the meter is honest.
  const tells = useMemo(() => (empty ? 0 : countTells(data)), [data, empty])
  const keyError = providerKeyError(settings)
  const provider = getProvider(settings.provider)

  function runInstant() {
    const result = humanizeCvData(data)
    if (result.stats.edits === 0) {
      toast('Nothing left to fix', {
        description: 'No clichés, stock phrases or AI tics found in the prose.',
      })
      return
    }
    // merge:false → the whole pass is a single undo step
    updateData((draft) => {
      Object.assign(draft, result.data)
    })
    const breakdown = [
      result.stats.cliche && `${result.stats.cliche} clichés`,
      result.stats.filler && `${result.stats.filler} stock phrases`,
      result.stats.transition && `${result.stats.transition} filler words`,
      result.stats.hedge && `${result.stats.hedge} hedges`,
      result.stats.person && `${result.stats.person} first-person`,
      result.stats.contraction && `${result.stats.contraction} contractions`,
      result.stats.rhythm && `${result.stats.rhythm} punctuation`,
    ].filter(Boolean)

    toast.success(`Humanised — ${result.stats.edits} edits`, {
      description: `${breakdown.join(', ')}. ${result.stats.remaining} tell${result.stats.remaining === 1 ? '' : 's'} left.`,
    })
  }

  async function runAi() {
    const problem = providerKeyError(settings)
    if (problem) {
      toast.error(problem, { action: { label: 'AI settings', onClick: onOpenSettings } })
      onOpenSettings()
      return
    }
    setBusy(true)
    const started = Date.now()
    try {
      const outcome: HumanizeOutcome = await humanizeCv({
        data: { cv: data, ...aiRequestPayload(settings) },
      })
      if (!outcome.ok) {
        toast.error(outcome.error, {
          action: /key|model|settings/i.test(outcome.error)
            ? { label: 'AI settings', onClick: onOpenSettings }
            : undefined,
        })
        return
      }
      if (outcome.changed === 0) {
        toast('Already reads naturally', {
          description: 'The model left every sentence as it was. Try the instant pass instead.',
        })
        return
      }
      replaceData(outcome.cv)
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000))
      toast.success(`Rewrote ${outcome.changed} passages in ${seconds}s`, {
        description: 'Facts, dates and employers are untouched — undo any time.',
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'The humaniser failed. Try the instant pass.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (empty) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge tone={tells === 0 ? 'success' : tells <= 4 ? 'neutral' : 'accent'}>
            {tells === 0 ? 'reads naturally' : `${tells} AI tell${tells === 1 ? '' : 's'}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64 text-center">
          Counts clichés, stock transitions, first person and em-dash tics. A writing heuristic,
          not an AI-detector score.
        </TooltipContent>
      </Tooltip>

      <Button size="sm" onClick={runInstant} disabled={busy}>
        <WandSparkles className="size-3.5" />
        Humanise
      </Button>

      <Button size="sm" variant="outline" onClick={runAi} disabled={busy}>
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {busy ? 'Rewriting…' : 'AI rewrite'}
      </Button>

      <span className="ml-auto text-[11px] leading-tight text-muted-foreground">
        {keyError ? 'Needs a key' : provider.serverKey ? 'AI rewrite' : 'AI rewrite'} · undo any time
      </span>
    </div>
  )
}

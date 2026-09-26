import { useState } from 'react'
import { toast } from 'sonner'
import { Briefcase, FileText, LoaderCircle, ScanText, Sparkles, WandSparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Card, Textarea } from './ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/dialog'
import { generateCv, parseCv, type AiOutcome } from '~/lib/cv-ai.functions'
import { aiRequestPayload, getProvider, providerKeyError } from '~/lib/ai-settings'
import { useAiSettings } from '~/lib/use-ai-settings'
import { useCvStore } from '~/lib/cv-store'
import { isEmptyCv } from '~/lib/cv-types'

type Mode = 'parse' | 'prompt' | 'job'

const EXAMPLES: Record<Mode, string> = {
  parse: '',
  prompt: 'Senior frontend engineer, 7 years. React and TypeScript, design systems, a11y. Led two teams, shipped a checkout rebuild that cut drop-off by a third.',
  job: `Senior Backend Engineer (Go / Kubernetes)

We are looking for a backend engineer to own our payments platform.

Must have:
- 5+ years building distributed services in Go
- Kubernetes, Terraform, observability (Prometheus, Grafana)
- PostgreSQL, Kafka, Redis
- Track record of mentoring

Nice to have: gRPC, PCI-DSS compliance, multi-region failover.`,
}

const TABS: Array<{ value: Mode; label: string; icon: typeof FileText }> = [
  { value: 'parse', label: 'Paste CV', icon: FileText },
  { value: 'prompt', label: 'From prompt', icon: WandSparkles },
  { value: 'job', label: 'From job', icon: Briefcase },
]

export function InputPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const settings = useAiSettings()
  const { replaceData, data } = useCvStore()
  const [mode, setMode] = useState<Mode>('parse')
  const [text, setText] = useState('')
  const [prompt, setPrompt] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [profile, setProfile] = useState('')
  const [busy, setBusy] = useState(false)

  const provider = getProvider(settings.provider)
  const keyError = providerKeyError(settings)
  const hasContent = !isEmptyCv(data)

  async function run(modeToRun: Mode) {
    const problem = providerKeyError(settings)
    if (problem) {
      toast.error(problem, {
        action: { label: 'AI settings', onClick: onOpenSettings },
      })
      onOpenSettings()
      return
    }

    setBusy(true)
    const started = Date.now()
    try {
      const payload = aiRequestPayload(settings)
      const outcome: AiOutcome =
        modeToRun === 'parse'
          ? await parseCv({ data: { ...payload, text } })
          : await generateCv({
              data: {
                ...payload,
                mode: modeToRun === 'job' ? 'job' : 'prompt',
                prompt,
                jobDescription,
                profile,
              },
            })

      if (!outcome.ok) {
        toast.error(outcome.error, {
          action: /key|model|settings/i.test(outcome.error)
            ? { label: 'AI settings', onClick: onOpenSettings }
            : undefined,
        })
        return
      }

      replaceData(outcome.cv)
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000))
      const added =
        outcome.cv.experience.length + outcome.cv.education.length + outcome.cv.skills.length
      toast.success(`CV built in ${seconds}s · ${added} sections`, {
        description: 'Review every detail in the editor, then download it.',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as Mode)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pt-4">
          <TabsContent value="parse" className="mt-0 space-y-3">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste your whole CV here — headers, bullet points, anything. The AI turns it into clean, structured sections."
              className="min-h-56"
              spellCheck={false}
            />
            <Button
              className="w-full"
              size="lg"
              disabled={busy || text.trim().length === 0}
              onClick={() => run('parse')}
            >
              {busy && mode === 'parse' ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ScanText className="size-4" />
              )}
              {busy && mode === 'parse' ? 'Reading your CV…' : 'Parse and build my CV'}
            </Button>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Every fact is kept exactly as written — nothing is invented when you paste a CV.
            </p>
          </TabsContent>

          <TabsContent value="prompt" className="mt-0 space-y-3">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="One line is enough. E.g. “Marketing manager, 5 years, B2B SaaS, Berlin.”"
              className="min-h-28"
            />
            <Button
              variant="ghost"
              size="sm"
              className="px-0 text-primary"
              onClick={() => setPrompt(EXAMPLES.prompt)}
            >
              Use the example brief
            </Button>
            <Textarea
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              placeholder="Optional: anything else the AI should know — projects, awards, seniority, tone."
              className="min-h-24"
            />
            <Button
              className="w-full"
              size="lg"
              disabled={busy || prompt.trim().length === 0}
              onClick={() => run('prompt')}
            >
              {busy && mode === 'prompt' ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {busy && mode === 'prompt' ? 'Writing your CV…' : 'Write a full CV'}
            </Button>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              A short brief is enough — the AI expands it into a complete, detailed CV.
            </p>
          </TabsContent>

          <TabsContent value="job" className="mt-0 space-y-3">
            <Textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description to target."
              className="min-h-40"
              spellCheck={false}
            />
            <Textarea
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              placeholder="Optional: your background, so the tailoring stays believable."
              className="min-h-20"
            />
            <Button
              className="w-full"
              size="lg"
              disabled={busy || jobDescription.trim().length === 0}
              onClick={() => run('job')}
            >
              {busy && mode === 'job' ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <WandSparkles className="size-4" />
              )}
              {busy && mode === 'job' ? 'Tailoring your CV…' : 'Tailor my CV to this job'}
            </Button>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Mirrors the job description's keywords and requirements — ideal for ATS screens.
            </p>
          </TabsContent>
        </div>
      </Tabs>

      <div className="mt-3 border-t border-border pt-3">
        <Card
          className={
            keyError
              ? 'flex items-start gap-2.5 border-destructive/40 bg-destructive/5 p-3'
              : 'flex items-start gap-2.5 p-3'
          }
        >
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-foreground">
              Using {provider.label}
              {provider.serverKey ? '' : ` · ${settings.models[settings.provider]}`}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
              {keyError ??
                (hasContent
                  ? 'Generating replaces the current CV — undo any time with the history button.'
                  : 'Keys stay in your browser.')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onOpenSettings}>
            Change
          </Button>
        </Card>
      </div>
    </div>
  )
}

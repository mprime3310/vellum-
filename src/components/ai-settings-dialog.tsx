import { useState } from 'react'
import { CircleAlert, ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck, Trash } from 'lucide-react'
import { Button } from './ui/button'
import { Badge, Input, Separator } from './ui/field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { RadioCard, RadioGroup, Select, SelectContent, SelectItem, SelectTrigger } from './ui/controls'
import {
  PROVIDERS,
  getProvider,
  setProvider,
  setProviderKey,
  setProviderModel,
  type ProviderId,
} from '~/lib/ai-settings'
import { useAiSettings } from '~/lib/use-ai-settings'

export function AiSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings = useAiSettings()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            AI settings
          </DialogTitle>
          <DialogDescription>
            Choose where the AI runs. The default provider needs no key — it uses this app's
            server-side gateway. Bring your own key for anything else.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <RadioGroup
            value={settings.provider}
            onValueChange={(value) => setProvider(value as ProviderId)}
          >
            {PROVIDERS.map((def) => (
              <ProviderCard
                key={def.id}
                providerId={def.id}
                active={settings.provider === def.id}
                revealKey={Boolean(revealed[def.id])}
                onToggleReveal={() =>
                  setRevealed((prev) => ({ ...prev, [def.id]: !prev[def.id] }))
                }
              />
            ))}
          </RadioGroup>

          <Separator className="my-4" />

          <div className="rounded-lg border border-border bg-secondary/60 p-3">
            <p className="text-[12.5px] font-semibold text-foreground">Your keys stay yours</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Keys are stored only in your browser, in localStorage, and are sent from your browser
              straight to the provider when you press Generate — they are never stored on the
              server. Currently using{' '}
              <span className="font-medium text-foreground">
                {getProvider(settings.provider).label}
              </span>
              .
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProviderCard({
  providerId,
  active,
  revealKey,
  onToggleReveal,
}: {
  providerId: ProviderId
  active: boolean
  revealKey: boolean
  onToggleReveal: () => void
}) {
  const settings = useAiSettings()
  const def = getProvider(providerId)
  const isServer = Boolean(def.serverKey)
  const key = settings.keys[providerId] ?? ''
  const model = settings.models[providerId] ?? def.defaultModel

  return (
    <RadioCard
      value={providerId}
      title={def.label}
      description={isServer ? 'Runs on our server — no key needed.' : def.keyHint}
      meta={
        isServer ? (
          <Badge tone="success">
            <ShieldCheck className="size-3" /> no key
          </Badge>
        ) : key ? (
          <Badge tone="success">key saved</Badge>
        ) : (
          <Badge tone="danger">
            <CircleAlert className="size-3" /> key needed
          </Badge>
        )
      }
    >
      {active ? (
        <div className="space-y-2.5">
          <Select value={model} onValueChange={(value) => setProviderModel(providerId, value)}>
            <SelectTrigger aria-label={`${def.label} model`}>
              {def.models.find((option) => option.id === model)?.label ?? model}
            </SelectTrigger>
            <SelectContent>
              {def.models.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isServer ? (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Uses the server-side AI gateway key. Nothing to configure.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={revealKey ? 'text' : 'password'}
                    value={key}
                    placeholder={def.keyPrefix ? `${def.keyPrefix}…` : 'API key'}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={`${def.label} API key`}
                    onChange={(event) => setProviderKey(providerId, event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={onToggleReveal}
                    className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={revealKey ? 'Hide key' : 'Show key'}
                  >
                    {revealKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {key ? (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Remove key"
                    onClick={() => setProviderKey(providerId, '')}
                  >
                    <Trash className="size-4" />
                  </Button>
                ) : null}
              </div>
              {def.docsUrl ? (
                <a
                  href={def.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-primary underline-offset-4 hover:underline"
                >
                  Get a {def.label} key
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </RadioCard>
  )
}


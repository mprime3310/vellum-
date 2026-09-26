import * as SelectPrimitive from '@radix-ui/react-select'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '~/lib/utils'

/* ---------------------------------- Select -------------------------------- */

export const Select = SelectPrimitive.Root

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={4}
        className={cn(
          'z-50 max-h-72 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-panel',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="scroll-slim max-h-72 overflow-y-auto">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-7 pr-2 text-[13px] outline-none data-[highlighted]:bg-secondary',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

/* -------------------------------- Accordion ------------------------------- */

export const Accordion = AccordionPrimitive.Root

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('border-b border-border/70', className)} {...props} />
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex flex-1 items-center gap-2 py-3 text-left text-[13px] font-semibold tracking-tight text-foreground transition-colors hover:text-accent-foreground',
          className,
        )}
        {...props}
      >
        {children}
        <span className="ml-auto flex size-5 items-center justify-center rounded-md text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180">
          <ChevronDown className="size-4" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:hidden data-[state=open]:animate-in-fade"
      {...props}
    >
      <div className={cn('pb-4', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

/* -------------------------------- Radio group ----------------------------- */

export function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('space-y-2', className)} {...props} />
}

/** A full-width selectable card; the indicator comes from the radio group state. */
export function RadioCard({
  title,
  description,
  meta,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  title: string
  description?: string
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <RadioGroupPrimitive.Item
      className="group w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=checked]:border-accent data-[state=checked]:bg-accent-soft/70"
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-1.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-card group-data-[state=checked]:border-accent">
          <RadioGroupPrimitive.Indicator asChild>
            <span className="block size-2 rounded-full bg-accent" />
          </RadioGroupPrimitive.Indicator>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">{title}</span>
            {meta}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
          {children ? <span className="mt-2.5 block">{children}</span> : null}
        </span>
      </div>
    </RadioGroupPrimitive.Item>
  )
}


export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-4 rounded-full border-2 border-accent bg-card shadow-panel transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label="Font size"
      />
    </SliderPrimitive.Root>
  )
}

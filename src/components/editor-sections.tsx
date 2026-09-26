import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash } from 'lucide-react'
import { Button } from './ui/button'
import { Field, Input, Textarea } from './ui/field'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/controls'
import { cn, moveItem } from '~/lib/utils'

/* ----------------------------- accordion shell ---------------------------- */

export function EditorSection({
  value,
  title,
  icon,
  badge,
  children,
}: {
  value: string
  title: string
  icon?: ReactNode
  badge?: number | string
  children: ReactNode
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        {title}
        {badge !== undefined && badge !== 0 && badge !== '' ? (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  )
}

export { Accordion }

/* --------------------------------- fields --------------------------------- */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: string
}) {
  const id = `f-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

export function AreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  hint?: string
}) {
  const id = `a-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

/* ------------------------------ list editing ------------------------------ */

export function ItemCard({
  title,
  meta,
  index,
  total,
  onMove,
  onRemove,
  children,
}: {
  title: string
  meta?: string
  index: number
  total: number
  onMove: (from: number, to: number) => void
  onRemove: () => void
  children: (open: boolean) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
          aria-expanded={open}
        >
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-foreground">
              {title || 'Untitled'}
            </span>
            {meta ? (
              <span className="block truncate text-[11.5px] text-muted-foreground">{meta}</span>
            ) : null}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Delete"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash className="size-3.5" />
          </Button>
        </div>
      </div>
      {open ? <div className="space-y-3 border-t border-border p-3">{children(open)}</div> : null}
    </div>
  )
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full border-dashed"
      onClick={onClick}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  )
}

export function ListStack<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  empty,
}: {
  items: T[]
  onChange: (next: T[]) => void
  renderItem: (
    item: T,
    index: number,
    move: (from: number, to: number) => void,
    remove: () => void,
  ) => ReactNode
  empty?: string
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-muted-foreground">
        {empty}
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id}>
          {renderItem(
            item,
            index,
            (from, to) => onChange(moveItem(items, from, to)),
            () => onChange(items.filter((_, i) => i !== index)),
          )}
        </div>
      ))}
    </div>
  )
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-2.5', className)}>{children}</div>
}

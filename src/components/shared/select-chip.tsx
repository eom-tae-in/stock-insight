'use client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SegmentOption } from './segmented'
export function SelectChip({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: {
  readonly label: string
  readonly value: string
  readonly options: readonly SegmentOption[]
  readonly onValueChange: (value: string) => void
  readonly disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className="rounded-control hover:border-border-strong data-[state=open]:bg-brand-subtle data-[state=open]:border-primary h-8 w-auto gap-1.5 px-3 py-0 text-xs disabled:opacity-40"
      >
        <span className="text-tertiary">{label}</span>
        <span className="text-foreground font-medium">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-panel shadow-popover p-1.5">
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="rounded-control min-h-9 data-[disabled]:opacity-40"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

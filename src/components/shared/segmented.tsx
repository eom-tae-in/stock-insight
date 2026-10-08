'use client'
import { RadioGroup } from 'radix-ui'
import { cn } from '@/lib/utils'
export type SegmentOption = {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
}
export function Segmented({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
  className,
}: {
  readonly label: string
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly options: readonly SegmentOption[]
  readonly disabled?: boolean
  readonly className?: string
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      orientation="horizontal"
      className={cn(
        'bg-surface-raised inline-flex rounded-md p-[3px]',
        className
      )}
    >
      {options.map(option => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          disabled={disabled || option.disabled}
          className="text-text-secondary hover:bg-card data-[state=checked]:bg-brand-subtle data-[state=checked]:text-brand-text rounded-control focus-visible:ring-ring focus-visible:ring-offset-background h-9 px-3 text-xs leading-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:font-semibold md:h-7"
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}

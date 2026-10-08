'use client'
import { useId, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
export function TextField({
  label,
  help,
  error,
  id,
  ...props
}: ComponentProps<typeof Input> & {
  readonly label: string
  readonly help?: string
  readonly error?: string
}) {
  const generated = useId()
  const fieldId = id ?? generated
  const descriptionId = `${fieldId}-description`
  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="text-text-secondary block text-[13px] leading-5 font-medium"
      >
        {label}
      </label>
      <Input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={
          [props['aria-describedby'], (error || help) && descriptionId]
            .filter(Boolean)
            .join(' ') || undefined
        }
      />
      {(error || help) && (
        <p
          id={descriptionId}
          role={error ? 'alert' : undefined}
          className={
            error
              ? 'text-danger text-xs leading-4'
              : 'text-tertiary text-xs leading-4'
          }
        >
          {error || help}
        </p>
      )}
    </div>
  )
}

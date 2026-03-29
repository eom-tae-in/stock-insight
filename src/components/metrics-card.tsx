'use client'

import { cn } from '@/lib/utils'
import type { MetricsCardProps } from '@/types'

export function MetricsCard({
  label,
  value,
  unit,
  isPositive,
  icon,
}: MetricsCardProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            {unit && <p className="text-muted-foreground text-sm">{unit}</p>}
            <p
              className={cn(
                'text-2xl font-bold',
                isPositive === true && 'text-green-600 dark:text-green-400',
                isPositive === false && 'text-red-600 dark:text-red-400'
              )}
            >
              {typeof value === 'number' ? value.toFixed(2) : value}
            </p>
          </div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  )
}

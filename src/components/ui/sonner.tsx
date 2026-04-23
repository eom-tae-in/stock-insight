'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:px-5 group-[.toaster]:py-4 group-[.toaster]:text-base group-[.toaster]:shadow-lg',
          title: 'text-base font-semibold',
          description: 'text-sm leading-6',
          actionButton: 'min-h-10 px-4 text-sm',
          cancelButton: 'min-h-10 px-4 text-sm',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

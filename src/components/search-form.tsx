'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import type { SearchFormProps } from '@/types'

const searchSchema = z.object({
  ticker: z
    .string()
    .min(1, '종목 심볼 또는 회사명을 입력해주세요')
    .max(50, '입력이 너무 깁니다')
    .transform(val => val.toUpperCase()),
})

type SearchFormData = z.infer<typeof searchSchema>

export function SearchForm({
  onSubmit,
  isLoading = false,
  error,
}: SearchFormProps) {
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setLocalError(error || null)
  }, [error])

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      ticker: '',
    },
  })

  const handleSubmit = async (data: SearchFormData) => {
    setLocalError(null)
    try {
      await onSubmit(data.ticker)
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다'
      setLocalError(message)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full space-y-6"
      >
        <FormField
          control={form.control}
          name="ticker"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="예: AAPL, TSLA, MSFT"
                  disabled={isLoading}
                  className="text-center text-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {localError && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {localError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? '조회 중...' : '조회'}
        </Button>
      </form>
    </Form>
  )
}

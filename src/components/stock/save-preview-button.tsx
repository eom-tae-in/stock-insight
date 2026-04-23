'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'

interface SavePreviewButtonProps {
  searchId: string
  ticker: string
}

export function SavePreviewButton({
  searchId,
  ticker,
}: SavePreviewButtonProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          previewId: searchId,
          ticker,
        }),
      })

      if (!response.ok) {
        const error = (await response.json()) as {
          error?: { message: string }
        }
        const message = error.error?.message || '저장 중 오류가 발생했습니다'
        toast.error(message)
        setIsSaving(false)
        return
      }

      const data = (await response.json()) as ApiResponse<{ id: string }>
      toast.success('종목이 저장되었습니다!')
      router.push(`/stock-analysis/${data.data.id}`)
    } catch (err) {
      console.error('저장 중 오류 발생:', err)
      toast.error('저장 중 오류가 발생했습니다')
      setIsSaving(false)
    }
  }

  return (
    <Button
      onClick={handleSave}
      disabled={isSaving}
      className="gap-2"
      size="lg"
    >
      <CheckCircle className="h-4 w-4" />
      {isSaving ? '저장 중...' : '저장'}
    </Button>
  )
}

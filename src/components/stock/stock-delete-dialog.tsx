'use client'

import { TriangleAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function StockDeleteDialog({
  open,
  onOpenChange,
  tickers,
  busy,
  onConfirm,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly tickers: readonly string[]
  readonly busy: boolean
  readonly onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card rounded-xl sm:max-w-[420px]">
        <AlertDialogHeader className="place-items-start text-left">
          <span className="bg-danger-subtle text-danger mb-2 flex size-10 items-center justify-center rounded-md">
            <TriangleAlert aria-hidden className="size-5" />
          </span>
          <AlertDialogTitle className="text-xl leading-7">
            종목 {tickers.length}개를 삭제할까요?
          </AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            선택한 {tickers.join(', ')}을 관심 종목에서 삭제해요. 이 작업은
            되돌릴 수 없어요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel disabled={busy}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant="danger"
            disabled={busy}
            onClick={event => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {busy ? '삭제 중…' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

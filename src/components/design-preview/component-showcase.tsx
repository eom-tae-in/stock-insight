'use client'

import { useState, type ReactNode } from 'react'
import { Plus, Trash2, Inbox, Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ListRow,
} from '@/components/ui/table'
import { ChangeBadge, ChangeText } from '@/components/shared/change-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { MetricTile } from '@/components/shared/metric-tile'
import { Sparkline } from '@/components/shared/sparkline'
import { Segmented } from '@/components/shared/segmented'
import { SelectChip } from '@/components/shared/select-chip'
import { AlertBanner } from '@/components/shared/alert-banner'
import { Kbd } from '@/components/shared/kbd'
import { TickerLogo } from '@/components/shared/ticker-logo'
import { EmptyState } from '@/components/shared/empty-state'
import { IconButton } from '@/components/shared/icon-button'
import { SeriesToggle } from '@/components/shared/series-toggle'
import { TextField } from '@/components/shared/text-field'
import { SearchField } from '@/components/shared/search-field'
import { ThemeSelector } from '@/components/shared/theme-selector'
import {
  formatDisplayPrice,
  formatInterest,
  formatVolume,
  formatWeek,
} from '@/lib/format/display'

const options = [
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
  { value: 'disabled', label: '선택 불가', disabled: true },
] as const
const points = [18, 21, 19, 27, 23, 31, 34, 29, 38, 43, 41, 48] as const
function Section({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section className="bg-card space-y-5 rounded-lg border p-4 md:p-6">
      <h2 className="text-base leading-6 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function ComponentShowcase() {
  const [period, setPeriod] = useState('1y')
  const [series, setSeries] = useState(true)
  const [checked, setChecked] = useState(false)
  const [notice, setNotice] = useState('선택한 기간: 1Y')
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-8 font-bold">공통 컴포넌트</h1>
          <p className="text-text-secondary mt-2 text-[13px] leading-5">
            UI-2 · 개발 전용 상태 미리보기
          </p>
        </div>
        <div className="w-full sm:w-64">
          <ThemeSelector />
        </div>
      </header>
      <Section title="버튼 · 아이콘 버튼">
        <div className="flex flex-wrap items-center gap-3">
          {(['primary', 'secondary', 'ghost', 'danger'] as const).map(
            variant => (
              <Button
                key={variant}
                variant={variant}
                data-qa={variant}
                onClick={() => setNotice(variant + ' 선택')}
              >
                <Plus aria-hidden />
                {variant}
              </Button>
            )
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="secondary">
            작은 버튼
          </Button>
          <Button size="mobile" variant="secondary">
            모바일 버튼
          </Button>
          <IconButton label="다운로드" variant="secondary">
            <Download aria-hidden />
          </IconButton>
          <IconButton label="작은 다운로드" size="sm">
            <Download aria-hidden />
          </IconButton>
          <IconButton label="모바일 다운로드" size="mobile">
            <Download aria-hidden />
          </IconButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(['primary', 'secondary', 'ghost', 'danger'] as const).map(
            variant => (
              <Button key={variant} variant={variant} disabled>
                {variant} 비활성
              </Button>
            )
          )}
          <IconButton label="비활성 다운로드" disabled>
            <Download aria-hidden />
          </IconButton>
        </div>
        <p
          role="status"
          data-qa="notice"
          className="text-text-secondary text-xs"
        >
          {notice}
        </p>
      </Section>
      <Section title="선택 · 탭">
        <div className="flex flex-wrap items-center gap-4">
          <Segmented
            label="기간"
            value={period}
            onValueChange={setPeriod}
            options={options}
          />
          <SelectChip
            label="기간 선택"
            value={period}
            onValueChange={setPeriod}
            options={options}
          />
          <SelectChip
            label="비활성 조건"
            value="1y"
            onValueChange={setPeriod}
            options={options}
            disabled
          />
        </div>
        <Segmented
          label="비활성 기간"
          value="1y"
          onValueChange={setPeriod}
          options={options}
          disabled
        />
        <div className="flex flex-wrap gap-3">
          <SeriesToggle
            tone="interest"
            selected={series}
            onSelectedChange={setSeries}
          >
            검색 관심도
          </SeriesToggle>
          <SeriesToggle
            tone="price"
            selected={!series}
            onSelectedChange={value => setSeries(!value)}
          >
            주가
          </SeriesToggle>
          <SeriesToggle
            tone="ma13"
            selected={false}
            onSelectedChange={setSeries}
            disabled
          >
            13주선 비활성
          </SeriesToggle>
        </div>
        <Tabs defaultValue="chart">
          <TabsList aria-label="분석 보기">
            <TabsTrigger value="chart">차트</TabsTrigger>
            <TabsTrigger value="table">데이터 표</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              선택 불가
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chart">
            <Sparkline
              values={points}
              kind="interest"
              size="card"
              label="관심도 추이"
            />
          </TabsContent>
          <TabsContent value="table">선택한 기간의 데이터 표</TabsContent>
        </Tabs>
      </Section>
      <Section title="검색 · 입력 · 체크박스">
        <div className="grid gap-6 md:grid-cols-2">
          <SearchField
            label="종목 검색"
            placeholder="종목, 티커, 키워드 검색"
          />
          <SearchField
            label="비활성 검색"
            placeholder="검색할 수 없어요"
            disabled
          />
          <TextField
            label="이메일"
            type="email"
            placeholder="name@example.com"
            help="가입한 이메일을 입력하세요."
          />
          <TextField
            label="입력 오류"
            error="입력한 내용을 확인해 주세요."
            defaultValue="잘못된 값"
          />
          <TextField
            label="비활성 입력"
            disabled
            help="현재 수정할 수 없어요."
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-[13px]">
            <Checkbox
              checked={checked}
              onCheckedChange={value => setChecked(value === true)}
            />
            비교 표시
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <Checkbox defaultChecked disabled />
            선택 비활성
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <Checkbox disabled />
            해제 비활성
          </label>
        </div>
      </Section>
      <Section title="등락 · 상태 · 숫자">
        <div className="flex flex-wrap gap-3">
          {[2.35, -1.82, 0, null].map((value, index) => (
            <ChangeBadge key={index} value={value} />
          ))}
          {[2.35, -1.82, 0, null].map((value, index) => (
            <ChangeText key={index} value={value} />
          ))}
          <ChangeText value={48.2} kind="ratio" />
          <ChangeText value={6} kind="points" />
        </div>
        <div className="flex flex-wrap gap-3">
          {(['success', 'warning', 'danger', 'brand', 'neutral'] as const).map(
            tone => (
              <StatusBadge key={tone} tone={tone} dot>
                {tone}
              </StatusBadge>
            )
          )}
          <StatusBadge tone="neutral">점 없음</StatusBadge>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricTile
            label="13주 이동평균"
            value={formatDisplayPrice(172.4, 'USD')}
            change={<ChangeText value={2.35} />}
            caption="현재가 대비"
            info="최근 13주 종가 평균이에요."
          />
          <MetricTile
            label="검색 관심도"
            size="lg"
            value={
              <>
                {formatInterest(78)}{' '}
                <span className="text-tertiary text-xs font-normal">/100</span>
              </>
            }
            change={<ChangeText value={6} kind="points" />}
            caption="지난주 대비"
          />
          <MetricTile
            label="주간 거래량"
            value={formatVolume(1.21e9)}
            caption={formatWeek('2026-09-28')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {['NVDA', 'AAPL', 'MSFT', 'TSLA', '005930.KS'].map(ticker => (
            <div key={ticker} className="flex items-center gap-2">
              <TickerLogo ticker={ticker} />
              <span className="text-xs">{ticker}</span>
            </div>
          ))}
          <TickerLogo ticker="NVDA" size="sm" />
          <Kbd>⌘K</Kbd>
        </div>
        <div className="flex flex-wrap gap-6">
          <Sparkline values={points} label="주가 추이" />
          <Sparkline values={points} kind="interest" label="관심도 추이" />
          <Sparkline values={[1, 2, null, 3, 4]} label="결측 구간" />
          <Sparkline values={[null, null]} label="데이터 부족" />
        </div>
      </Section>
      <Section title="안내 · 빈 상태">
        <AlertBanner
          tone="warning"
          title="요청 제한에 도달했어요"
          action={
            <Button variant="secondary" size="sm">
              다시 시도
            </Button>
          }
        >
          잠시 후 다시 요청해 주세요.
        </AlertBanner>
        <AlertBanner
          tone="error"
          title="데이터를 불러오지 못했어요"
          action={
            <Button variant="secondary" size="sm">
              다시 시도
            </Button>
          }
        >
          현재 결과를 확인할 수 없어요.
        </AlertBanner>
        <AlertBanner tone="info" title="샘플 데이터를 보고 있어요">
          저장된 분석의 표시 예시예요.
        </AlertBanner>
        <EmptyState
          icon={<Inbox />}
          title="저장한 종목이 없어요"
          description="종목을 조회하고 관심 종목으로 저장해 보세요."
          action={<Button variant="secondary">종목 조회</Button>}
        />
      </Section>
      <Section title="대화상자 · 팝오버 · 메뉴">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">삭제 대화상자</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <div className="bg-danger-subtle text-danger rounded-panel flex size-10 items-center justify-center">
                  <Trash2 aria-hidden className="size-5" />
                </div>
                <DialogTitle>항목을 삭제할까요?</DialogTitle>
                <DialogDescription>
                  개발 미리보기예요. 실제 데이터는 삭제하지 않아요.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">삭제</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">도움말 팝오버</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="rounded-control flex min-h-9 items-center gap-2 px-2 text-[13px]">
                <Info aria-hidden className="size-4" />
                표시 기준을 확인하세요.
              </p>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">항목 메뉴</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setNotice('최신화 선택')}>
                최신화
              </DropdownMenuItem>
              <DropdownMenuItem disabled>사용할 수 없는 항목</DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setNotice('삭제 선택')}
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>
      <Section title="목록 · 데이터 표">
        <ListRow href="#table-example">
          <TickerLogo ticker="NVDA" />
          <span className="flex-1 text-sm">NVDA</span>
          <ChangeBadge value={2.35} />
          <Sparkline values={points} label="NVDA 주가" />
        </ListRow>
        <div id="table-example">
          <Table>
            <caption className="text-text-secondary py-2 text-left text-xs">
              주간 데이터 · 가격(USD)
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>주차</TableHead>
                <TableHead>종가</TableHead>
                <TableHead>등락률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[2.35, -1.82, 0, null].map((value, index) => (
                <TableRow key={index}>
                  <TableCell>W{40 - index}</TableCell>
                  <TableCell>187.62</TableCell>
                  <TableCell>
                    <ChangeText value={value} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </main>
  )
}

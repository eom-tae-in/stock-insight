import type { ReactNode } from 'react'
import { GuideChart } from './guide-chart'
import type { GuideCard } from '@/lib/guides/navigation'

function Panel({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <div className="bg-surface-raised space-y-2 rounded-md p-4">
      <p className="text-sm leading-5 font-semibold">{title}</p>
      <p className="text-text-secondary text-sm leading-[22px]">{children}</p>
    </div>
  )
}
function ExampleAction({ children }: { readonly children: ReactNode }) {
  return (
    <p className="bg-primary text-primary-foreground flex min-h-11 items-center justify-center rounded-md px-3.5 py-3 text-center text-[13px] leading-5">
      {children}
    </p>
  )
}
function MetricsExample() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="검색 관심도">68 / 100</Panel>
        <Panel title="종가 · 예시">$210.00</Panel>
      </div>
      <GuideChart name="intro" />
      <p className="text-text-secondary text-xs leading-4">
        주간 데이터 · 서로 다른 단위와 축을 확인하세요
      </p>
    </>
  )
}
export function GuideIllustration({
  visual,
}: {
  readonly visual: GuideCard['visual']
}) {
  const examples: Record<GuideCard['visual'], ReactNode> = {
    0: <MetricsExample />,
    1: (
      <>
        <h3 className="text-xl font-semibold">종목 검색</h3>
        <Panel title="AAPL">Apple Inc. · 종목 조회</Panel>
        <ExampleAction>조회</ExampleAction>
        <Panel title="저장 전 조회 결과">
          5년 주간 가격 · 데이터 기준 확인
        </Panel>
        <Panel title="관심 종목에 저장">
          저장 후 관심 종목 상세에서 다시 확인해요
        </Panel>
      </>
    ),
    2: (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="검색 관심도">68 / 100</Panel>
          <Panel title="종가 · 예시">$210.00</Panel>
        </div>
        <GuideChart name="metrics" />
        <p className="text-text-secondary text-xs">
          주간 데이터 · 서로 다른 단위와 축을 확인하세요
        </p>
      </>
    ),
    3: (
      <>
        <h3 className="text-2xl font-bold">Apple</h3>
        <Panel title="분석 조건">전체 지역 / 웹 검색 / 5년</Panel>
        <GuideChart name="keyword" />
        <ExampleAction>키워드 저장</ExampleAction>
        <p className="text-text-secondary text-sm">
          저장 후: 내 키워드 → Apple → 조건별 분석
        </p>
      </>
    ),
    4: (
      <>
        <Panel title="1. 임시 비교">Apple 관심도 + AAPL 주가</Panel>
        <GuideChart name="comparison" />
        <ExampleAction>커스텀 차트 저장</ExampleAction>
        <Panel title="2. 저장한 연동 차트">
          현재 분석 조건 아래 AAPL 카드가 남아요
        </Panel>
      </>
    ),
    5: (
      <>
        <Panel title="내 차트 · AAPL 1년">
          종가 + 13주 MA / 이 브라우저에 저장
        </Panel>
        <GuideChart name="exports" />
        <div className="grid gap-4 sm:grid-cols-3">
          {['PNG 이미지', 'Excel 표', 'CSV 비교'].map(title => (
            <p
              key={title}
              className="bg-surface-raised flex min-h-11 items-center justify-center rounded-md border px-3 text-[13px]"
            >
              {title}
            </p>
          ))}
        </div>
      </>
    ),
    6: (
      <>
        <Panel title="기준 주차">완료된 주 기준 · 마지막 갱신일 확인</Panel>
        <Panel title="데이터 없음 ≠ 조회 실패">
          빈 결과와 요청 제한·오류를 구분해요
        </Panel>
        <Panel title="저장 목록에서 복원">
          관심 종목 / 내 키워드에서 이어 봐요
        </Panel>
      </>
    ),
    7: (
      <>
        <Panel title="정민서 · 테마 투자자">
          이번 주 내 관심 대상에 뭐가 달라졌지?
        </Panel>
        <Panel title="박준호 · 리서치 실무자">
          이 비교를 설명할 근거와 출처가 있나?
        </Panel>
        <Panel title="김소연 · 입문 투자자">
          무엇부터 보고, 이 숫자는 어떻게 읽지?
        </Panel>
      </>
    ),
    8: (
      <>
        <p className="text-brand-text text-xs">목표 디자인</p>
        <Panel title="이번 주에 달라진 것">
          관심도와 주가가 엇갈린 대상을 먼저 확인해요
        </Panel>
        <GuideChart name="briefing" />
        <Panel title="요약에서 비교 근거로">
          저장한 키워드 → 연결 종목 → 차트·표
        </Panel>
      </>
    ),
    9: (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="검색 관심도">68 / 100</Panel>
          <Panel title="종가 · 예시">$210.00</Panel>
        </div>
        <GuideChart name="evidence" />
        <p className="text-text-secondary text-xs">
          주간 데이터 · 서로 다른 단위와 축을 확인하세요
        </p>
      </>
    ),
    10: (
      <>
        <Panel title="PC · 넓게 분석">기간 · 시리즈 · 차트 · 비교 종목</Panel>
        <GuideChart name="mobile" />
        <Panel title="Mobile · 빠르게 확인">
          핵심 요약 → 관심 목록 → 상세 근거
        </Panel>
      </>
    ),
    11: (
      <>
        <p className="text-warning text-xs">설계 · 부분 구현</p>
        <Panel title="Next.js · BFF">화면 · 서버 세션</Panel>
        <Panel title="Gateway · Eureka">API 라우팅 · 서비스 탐색</Panel>
        <Panel title="분석 관리 / 시장 데이터">
          저장·소유권 / 공급자 시계열
        </Panel>
        <Panel title="RabbitMQ → Python worker">
          수집 요청·결과 · 현재 fixture 전용
        </Panel>
      </>
    ),
    12: (
      <>
        <Panel title="화면 · 반영 중">공통 토큰·셸·종목 목록·상세</Panel>
        <Panel title="서비스 · 기반 구현">OIDC 세션·작업·메시지 계약</Panel>
        <Panel title="실제 연동 · 검증 예정">
          Google 수집·계정·데이터 이전
        </Panel>
      </>
    ),
  }
  return (
    <figure className="bg-surface-sunken min-w-0 space-y-4 rounded-lg p-4 sm:p-6">
      <figcaption className="text-text-tertiary text-xs leading-4">
        설명용 예시 · 실제 계정 정보 없음
      </figcaption>
      {examples[visual]}
    </figure>
  )
}

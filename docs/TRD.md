# StockInsight TRD

## 1. 기술 목표

이 문서는 StockInsight의 목표 아키텍처, 코드 컨벤션, 테스트 전략을 정의한다. 현재 프로젝트는 Next.js App Router, Supabase Auth/PostgreSQL, Yahoo Finance, Google Trends, Recharts를 사용한다. 앞으로의 개선은 기능 추가보다 구조 통합과 테스트 가능성을 우선한다.

## 2. 목표 아키텍처

### 2.1 계층 구조

```
src/app
  ├─ pages and layouts
  └─ api routes

src/components
  ├─ ui
  ├─ layout
  ├─ auth
  ├─ stock
  └─ keyword

src/lib
  ├─ services
  ├─ repositories
  ├─ calculations
  ├─ providers
  ├─ supabase
  ├─ validation
  └─ export

src/types
  ├─ database
  ├─ domain
  ├─ api
  └─ ui
```

역할:

- `app`: 라우팅, 서버 컴포넌트 조립, API endpoint.
- `components`: UI와 상호작용. DB 직접 접근 금지.
- `services`: 유스케이스 단위 orchestration.
- `repositories`: Supabase CRUD. 외부 API 호출 금지.
- `providers`: Yahoo Finance, Google Trends 같은 외부 데이터 제공자.
- `calculations`: 순수 계산 함수. 외부 상태 접근 금지.
- `validation`: Zod 입력 스키마.
- `types`: DB row, domain model, DTO를 분리.

### 2.2 API Route 원칙

API Route는 얇아야 한다.

1. 인증 검증
2. 입력 검증
3. 서비스 호출
4. 표준 응답 반환

API Route 안에서 복잡한 DB 조합, 외부 API 변환, 차트 계산을 직접 수행하지 않는다.

예상 구조:

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const auth = await requireApiUser(supabase)
  const input = parseJson(SearchKeywordSchema, await request.json())
  const result = await keywordAnalysisService.create(
    auth.userId,
    input,
    supabase
  )
  return createSuccessResponse(result, 201)
}
```

### 2.3 서비스 레이어

권장 서비스:

- `stockService`
  - ticker 검색
  - 주가 수집
  - 종목 저장/갱신
  - 종목 상세 DTO 생성
- `keywordAnalysisService`
  - keyword upsert
  - analysis upsert
  - Trends 수집/계산/저장
  - 조건별 분석 조회
- `overlayService`
  - analysis별 오버레이 추가/삭제/정렬
  - 오버레이 시계열 정규화
- `exportService`
  - Excel/PNG에 필요한 DTO 생성

### 2.4 Repository 레이어

Repository는 Supabase 쿼리만 담당한다.

권장 repository:

- `stockRepository`
- `keywordRepository`
- `keywordAnalysisRepository`
- `overlayRepository`

규칙:

- 모든 repository 함수는 `userId` 또는 소유권 검증 가능한 parent id를 받는다.
- RLS에만 의존하지 않고 코드상 필터도 명시한다.
- `.single()` 사용 시 not found와 DB error를 구분한다.
- DB row를 그대로 UI에 반환하지 않는다.

### 2.5 Provider 레이어

외부 API는 provider 인터페이스 뒤에 숨긴다.

```typescript
export interface TrendsProvider {
  fetch(input: TrendsFetchInput): Promise<RawTrendsPoint[]>
}

export interface StockProvider {
  fetchWeeklyPrices(ticker: string): Promise<RawPricePoint[]>
  searchTicker(query: string): Promise<TickerSearchResult[]>
}
```

로컬/테스트/프로덕션 provider를 분리할 수 있어야 한다.

## 3. 데이터 모델

### 3.1 목표 테이블

`searches`

- 사용자별 저장 종목.
- unique: `(user_id, ticker)`.

`stock_price_data`

- `search_id`에 연결된 주간 OHLCV.
- unique: `(search_id, date)`.

`keywords`

- 사용자별 키워드 이름 컨테이너.
- unique: `(user_id, normalized_name)`.
- `normalized_name`은 앞뒤 공백 제거와 연속 공백 축소만 적용한다.
- 대소문자, 언어, 내부 단어 구분은 보존한다.

`keyword_analysis`

- 조건 조합별 트렌드 분석.
- unique: `(keyword_id, region, period, search_type)`.

`keyword_stock_overlays`

- analysis별 종목 오버레이.
- `searches`와 독립적인 키워드 분석 전용 오버레이 메타데이터.
- 필수 필드: `analysis_id`, `ticker`, `company_name`, `display_order`.
- 선택 필드: `exchange`, `currency`, `provider`, `last_refreshed_at`.
- unique: `(analysis_id, ticker)`.

`overlay_chart_timeseries`

- 오버레이 차트용 정규화 주가 시계열.
- unique: `(overlay_id, date)`.

### 3.2 Legacy 처리

다음 모델은 최종 구조에서 제거 대상이다.

- `keyword_searches`
- `keyword_chart_timeseries`
- `keyword_temporary_overlays`

앱 실행 경로에서는 legacy read/write를 허용하지 않는다. 테이블 제거는 별도 DB 마이그레이션으로 처리한다.

### 3.3 날짜와 시계열

- 모든 주간 데이터의 기준 날짜는 ISO week 시작일이다.
- 날짜 문자열은 `YYYY-MM-DD`로 저장한다.
- 외부 API 원본 날짜를 UI에서 직접 사용하지 않는다.
- 시계열 정렬은 항상 ascending이다.
- 계산 함수는 정렬되지 않은 입력을 받아도 내부에서 정렬하거나 명시적으로 거부한다.

## 4. 인증과 보안

- 보호된 페이지는 middleware에서 인증을 확인한다.
- API Route는 middleware와 별도로 인증을 다시 확인한다.
- Supabase RLS는 모든 사용자 데이터 테이블에 활성화한다.
- public env에는 anon key와 URL만 둔다.
- server env에는 외부 API 키, provider URL, service role key를 둔다.
- service role key는 일반 API Route에서 사용하지 않는다.
- 프로덕션 UI는 내부 에러 메시지와 stack trace를 표시하지 않는다.

## 5. 코드 컨벤션

### 5.1 TypeScript

- `strict` 모드를 유지한다.
- `any` 사용 금지. 불가피하면 좁은 범위에서 이유를 주석으로 남긴다.
- DB row type, domain type, API DTO를 분리한다.
- nullable 필드는 `null`과 `undefined` 의미를 구분한다.
- 외부 API 응답은 Zod 또는 type guard로 검증한다.

### 5.2 네이밍

- 파일/폴더: kebab-case.
- React component: PascalCase.
- hook: `use*`.
- service/repository 함수: 동사로 시작한다. 예: `createAnalysis`, `getAnalysisByFilters`.
- DB 컬럼: snake_case.
- TS domain field: camelCase.

### 5.3 React

- Server Component를 기본으로 사용한다.
- 브라우저 상태, 이벤트, chart interaction이 필요한 곳만 Client Component로 둔다.
- Client Component에서 직접 Supabase DB write를 수행하지 않는다.
- `useCallback`, `useMemo`는 성능/참조 안정성이 필요한 곳에만 사용하고 dependency 경고를 방치하지 않는다.
- 페이지 컴포넌트는 데이터 조립만 하고 복잡한 UI는 feature component로 분리한다.

### 5.4 API와 Validation

- 모든 request body와 query param은 Zod schema로 검증한다.
- API 응답은 `ApiResponse<T>` 또는 `ApiErrorResponse`만 사용한다.
- 같은 오류는 같은 code를 사용한다.
- 외부 API 실패는 502, timeout은 504, 인증 실패는 401, 권한 없음은 403, not found는 404를 사용한다.

### 5.5 Error Handling

- repository는 원본 DB error를 domain error로 변환하거나 그대로 throw하되 route에서 표준화한다.
- 서비스는 재시도 가능 오류와 사용자 입력 오류를 구분한다.
- 빈 배열을 성공으로 반환해 실패를 숨기지 않는다.
- 사용자 메시지는 짧고 행동 가능해야 한다.

### 5.6 Styling

- Tailwind와 shadcn/ui 패턴을 유지한다.
- 공통 UI는 `components/ui`에서만 관리한다.
- 도메인 UI는 `components/stock`, `components/keyword`로 분리한다.
- 페이지 섹션을 중첩 카드로 만들지 않는다.
- 차트/테이블/툴바는 모바일에서 고정 높이와 overflow 처리를 명확히 한다.

## 6. 테스트 전략

### 6.1 테스트 피라미드

1. Unit
   - 계산 함수, 날짜 정규화, DTO 변환, validation schema.
2. Integration
   - service + repository mock.
   - API Route with mocked provider.
3. E2E
   - 실제 브라우저 사용자 여정.

### 6.2 권장 도구

- Unit/Integration: Vitest.
- React component: React Testing Library.
- E2E: Playwright.
- Mocking: MSW 또는 provider interface mock.

### 6.3 필수 단위 테스트

- `calculateMA13`
- `calculateYoY`
- `normalizeToISOWeekStart`
- `mergePriceAndTrendsByWeek`
- `normalizeOverlaySeries`
- keyword/region/search_type validation.

### 6.4 필수 API 테스트

- 미인증 요청은 401.
- 다른 사용자 데이터 접근은 404 또는 403.
- 잘못된 입력은 400.
- Trends provider timeout은 504.
- 외부 provider 실패는 502.
- analysis upsert는 중복 레코드를 만들지 않는다.
- overlay 중복 추가는 409.

### 6.5 필수 E2E 테스트

- 로그인 후 대시보드 진입.
- 종목 검색과 상세 페이지 표시.
- 키워드 분석 생성과 조건별 조회.
- 분석별 종목 오버레이 추가/삭제/정렬.
- 새로고침 후 데이터 유지.
- Excel/PNG 다운로드 버튼 동작.

### 6.6 테스트 데이터

- 테스트 전용 Supabase 프로젝트 또는 local mock repository를 사용한다.
- 외부 API는 기본적으로 mock한다.
- E2E에서 실제 외부 API를 호출하는 테스트는 smoke test로 분리하고 기본 CI에서는 제외한다.

## 7. 품질 게이트

기본 게이트:

```bash
npm run typecheck
npm run lint
npm run build
```

테스트 도입 후 게이트:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

PR 수락 기준:

- 관련 문서 갱신.
- 관련 단위/통합/E2E 테스트 추가 또는 갱신.
- 새 ESLint 경고 없음.
- DB 변경이 있으면 migration과 rollback note 포함.
- env 변경이 있으면 `.env.example`과 TRD 갱신.

## 8. 권장 리팩터링 순서

1. 문서 기준선 확정.
2. DB 목표 모델과 migration 정리.
3. repository/service/provider 레이어 도입.
4. Trends provider 단일화.
5. keyword analysis API 재작성.
6. overlay API 재작성.
7. 프론트엔드 컴포넌트 도메인별 정리.
8. 테스트 도구와 핵심 테스트 도입.
9. lint/build 경고 정리.

## 9. 현재 코드에서 우선 해결할 기술 부채

- 키워드 정규화 정책 적용 후 Supabase migration 반영 필요.
- 일부 DB 조회가 코드상 `user_id` 필터를 명시하지 않음.
- React hook dependency 경고와 unused handler가 누적됨.
- 프로덕션 에러 화면에서 내부 메시지 노출 가능성.

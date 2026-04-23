# StockInsight Current Status

작성 기준: 2026-04-20

이 문서는 리팩터링 시작 전 현재 구현 상태를 고정하기 위한 점검 리포트다. 목적은 “무엇이 어디에 구현되어 있고, 어떤 흐름이 현재 기준이며, 무엇을 정리해야 하는지”를 명확히 하는 것이다.

## 1. 검증 기준선

최근 확인 결과:

- `npm run typecheck`: 통과
- `npm run lint`: 통과, 경고 0개
- `npm run build`: 통과

키워드 도메인 legacy route 제거 후 build route 목록에서 `/api/keyword-searches...`, `/api/keyword-analysis...`가 빠진 것을 확인했다.

## 2. 현재 주요 기능 맵

### 2.1 인증

화면/파일:

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/set-password/page.tsx`
- `src/components/auth/*`

인프라:

- `src/middleware.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/middleware-client.ts`

현재 흐름:

1. middleware가 보호 경로 접근을 확인한다.
2. 미인증 사용자는 `/login`으로 이동한다.
3. API Route는 `validateApiAuth()`를 통해 인증을 다시 확인한다.

개선 필요:

- middleware public path와 API 인증 정책을 RESTful API 기준으로 재점검한다.
- API Route마다 인증 방식이 일관적인지 확인한다.

### 2.2 종목 분석

화면/컴포넌트:

- `src/app/(app)/search/page.tsx`
- `src/app/(app)/analysis/[id]/page.tsx`
- `src/app/(app)/analysis/[id]/table/page.tsx`
- `src/components/search-form.tsx`
- `src/components/unified-chart.tsx`
- `src/components/custom-chart-builder.tsx`
- `src/components/custom-chart-view.tsx`

API:

- `GET /api/searches`
- `POST /api/searches`
- `GET /api/searches/[id]`
- `DELETE /api/searches/[id]`
- `GET /api/stocks/search`
- `GET /api/stocks/[ticker]`

서비스/DB:

- `src/lib/services/stock-service.ts`
- `src/lib/calculations.ts`
- `src/lib/indicators.ts`
- `src/lib/db/queries.ts`
- `src/lib/adapters/db.ts`

DB 테이블:

- `searches`
- `stock_price_data`

현재 흐름:

1. 사용자가 ticker를 검색한다.
2. `POST /api/stock-previews`가 Yahoo Finance 데이터를 수집하고 Redis preview를 만든다.
3. preview 페이지와 preview 표 페이지는 같은 Redis preview 데이터를 읽는다.
4. 사용자가 저장 버튼을 누르면 `POST /api/searches`가 preview를 `searches`와 `stock_price_data`에 저장한다.
5. 저장 후 상세 페이지에서 저장 데이터를 조회해 차트와 지표를 표시한다.

현재 상태:

- 저장 종목은 `/api/searches` 계열로 처리한다.
- 저장 전 종목 분석은 `/api/stock-previews`로 처리한다.
- 외부 ticker/company 검색은 `/api/stocks/search`로 통합했다.
- 키워드 오버레이용 주가 미리보기는 `/api/stocks/[ticker]`로 통합했다.
- `/api/stock`, `/api/stock/save`, `/api/stock-data`, `/api/ticker-search`는 제거됐다.

### 2.3 Google Trends

API/스크립트:

- `GET /api/trends` — Next.js keyword trends preview route
- `POST /api/pytrends` — Vercel Python serverless (`api/pytrends.py`)
- `GET/POST /api/trends-internal` — Next.js route, 환경 분기 호출
- `src/lib/get_trends.py` — pytrends 호출 단일 진실
- `src/lib/services/trends-service.ts`
- `src/server/trends-internal-service.ts` — 환경 분기 (local spawn / Vercel fetch)

환경:

- `package.json`의 기본 `npm run dev`는 Next.js만 실행한다.
- 로컬: `.venv/bin/python3 src/lib/get_trends.py`를 `child_process` spawn 으로 직접 실행한다.
- Vercel: `api/pytrends.py` Python serverless function 으로 실행되며, Next.js route는 `https://${VERCEL_URL}/api/pytrends`로 fetch 한다.

현재 흐름:

- `src/server/trends-internal-service.ts` 의 `fetchInternalTrendsData()`가 단일 진입점이다.
  - `process.env.VERCEL === '1'` 이면 Vercel Python function 호출 (fetch).
  - 그 외(로컬)에서는 `.venv/bin/python3 src/lib/get_trends.py` 를 spawn.
- `api/pytrends.py` 는 `src/lib/get_trends.py.get_trends()` 를 sys.path 확장 후 import 하여 동일 로직을 재사용한다 (코드 중복 없음).
- `requirements.txt` 는 `pytrends` 만 명시하고, `.python-version` 은 `3.12` 로 고정한다.
- `vercel.json` 은 `functions.api/**/*.py.excludeFiles` 로 `__pycache__`, `*.pyc`, `.venv` 를 번들에서 제외한다.
- Trends provider 실패나 빈 결과는 200 + 빈 배열로 숨기지 않고 4xx/5xx 오류로 반환한다.

개선 필요:

- 단일 API 계약은 유지하되, 배포 전 Vercel `/api/pytrends` 동작 확인이 필요하다.

### 2.4 키워드 검색/오버레이 흐름

화면/컴포넌트:

- `src/app/(app)/trends/page.tsx`
- `src/app/(app)/trends/search/page.tsx`
- `src/app/(app)/keywords/search/page.tsx`
- `src/components/keyword-trends/keyword-trends-client.tsx`
- `src/components/keyword-search-page/keyword-search-page-client.tsx`

API:

- `GET /api/keywords`
- `POST /api/keywords`
- `GET /api/keywords/[keywordId]`
- `DELETE /api/keywords/[keywordId]`
- `GET /api/keywords/[keywordId]/overlays`
- `POST /api/keywords/[keywordId]/overlays`
- `PATCH /api/keywords/[keywordId]/overlays`
- `DELETE /api/keywords/[keywordId]/overlays/[overlayId]`
- `GET /api/keywords/[keywordId]/analyses`
- `POST /api/keywords/[keywordId]/analyses`
- `GET /api/analyses/[analysisId]`
- `PATCH /api/analyses/[analysisId]`
- `DELETE /api/analyses/[analysisId]`
- `GET /api/analyses/[analysisId]/overlays`
- `POST /api/analyses/[analysisId]/overlays`
- `PATCH /api/analyses/[analysisId]/overlays`
- `DELETE /api/analyses/[analysisId]/overlays/[overlayId]`

DB 테이블:

- `keywords`
- `keyword_analysis`
- `keyword_stock_overlays`
- `overlay_chart_timeseries`

현재 상태:

- 클라이언트 직접 호출은 `/api/keywords` 계열로 이전됐다.
- `GET/POST/PATCH /api/keywords`와 `GET/DELETE /api/keywords/[keywordId]`는 `keyword_searches` route 재수출이 아니라 `keywords` 테이블 기반 서비스 함수를 직접 호출한다.
- `/api/keywords/[keywordId]/overlays...` 하위 route도 legacy route 재수출을 제거했고, `src/server/keyword-overlays-service.ts`의 공통 구현을 직접 호출한다.
- `/api/keywords/[keywordId]/analyses`, `/api/analyses/[analysisId]`, `/api/analyses/[analysisId]/overlays...` route를 추가했고 클라이언트 분석/오버레이 호출을 해당 route로 이전했다.
- `/api/keyword-analysis...`, `/api/keyword-searches...` legacy route는 제거됐다.
- `src/app/api/keyword-batch/route.ts`는 더 이상 `keyword_searches` 조회 함수를 사용하지 않고 기본 `keyword_analysis`를 읽으며, 주가 조회는 Redis 캐시 경로를 사용한다.
- `src/app/(app)/keywords/[keywordId]/overlays/[overlayId]/page.tsx`는 더 이상 `keyword_chart_timeseries`를 읽지 않고 `keyword_analysis.trends_data`에서 차트 데이터를 구성한다.
- `src/lib/db/queries.ts`, `src/lib/adapters/db.ts`에서 사용되지 않는 legacy `keyword_searches` CRUD와 `keyword_chart_timeseries` 함수 정의를 제거했다.
- `keyword_temporary_overlays` 직접 코드 참조는 제거됐다.
- 삭제/배치 삭제/최신화 API는 요청한 keyword의 overlay인지 확인한 뒤 신형 테이블을 조작한다.

결론:

- 키워드 API 실행 경로는 RESTful route와 신형 DB 모델 기준으로 정리됐다.

### 2.5 키워드 분석 신형 흐름

화면/컴포넌트:

- `src/app/(app)/keywords/[keywordId]/page.tsx`
- `src/components/keyword-detail/keyword-detail-client.tsx`
- `src/components/keyword-detail/keyword-standalone-chart.tsx`
- `src/components/keyword-detail/overlay-card.tsx`

API:

- `GET /api/keywords/[keywordId]/analyses`
- `POST /api/keywords/[keywordId]/analyses`
- `GET /api/analyses/[analysisId]`
- `PATCH /api/analyses/[analysisId]`
- `DELETE /api/analyses/[analysisId]`
- `GET /api/analyses/[analysisId]/overlays`
- `POST /api/analyses/[analysisId]/overlays`
- `PATCH /api/analyses/[analysisId]/overlays`
- `DELETE /api/analyses/[analysisId]/overlays/[overlayId]`

DB 테이블:

- `keywords`
- `keyword_analysis`
- `keyword_stock_overlays`
- `overlay_chart_timeseries`

현재 흐름:

1. 키워드 상세 페이지에서 region/searchType 조건을 선택한다.
2. `GET /api/keywords/[keywordId]/analyses`로 조건별 analysis를 조회한다.
3. 없으면 `POST /api/keywords/[keywordId]/analyses`로 생성한다.
4. 프론트/API/DB는 `GLOBAL`, `5Y`, `WEB` 같은 대문자 내부 표준값을 사용한다.
5. 생성 과정에서 서버는 `src/lib/parsers/trends-parsers.ts`를 통해 내부 표준값을 pytrends 요청값으로 변환한다.
6. 서버 서비스 함수로 Google Trends 데이터를 조회한다.
7. Google Trends와 Yahoo Finance 주간 데이터는 월요일 week key로 정규화하고, 완료된 전주까지만 포함한다.
8. analysis별 overlay는 `keyword_stock_overlays.analysis_id` 기준으로 저장한다.
9. 주가 5년 주간 데이터는 선택적으로 Upstash Redis REST 캐시를 사용한다. 캐시 키는 ticker와 완료된 전주 week key를 포함하고, 기본 TTL은 24시간이다.
10. pytrends 조회 결과는 선택적으로 Upstash Redis REST 캐시를 사용한다. 캐시 키는 키워드, region, period, search type, 완료된 전주 week key를 포함하고, 기본 TTL은 24시간이다.
11. analysis overlay 저장 API는 프론트가 `price_data`를 보내지 않아도 서버에서 Redis/Yahoo를 통해 주가 데이터를 확보해 저장한다.
12. 오버레이 상세 페이지와 keyword batch API도 기본 analysis 기준으로 동작한다.

현재 상태:

- legacy `/api/keyword-analysis...` route는 제거됐다.
- 키워드 분석 오버레이는 저장 종목(`searches`)과 독립되어 있다.

## 3. 현재 DB 모델 상태

### 기준으로 유지할 모델

- `searches`
- `stock_price_data`
- `keywords`
- `keyword_analysis`
- `keyword_stock_overlays`
- `overlay_chart_timeseries`

### 제거 완료된 legacy 모델

- `keyword_searches`
- `keyword_chart_timeseries`
- `keyword_temporary_overlays`

정리 마이그레이션:

- 사전 확인: `docs/sql/20260422_drop_legacy_keyword_tables_precheck.sql`
- 적용 파일: `migrations/20260422_drop_legacy_keyword_tables.sql`
- 적용 상태: Supabase SQL Editor에서 적용 완료

### 즉시 확인해야 할 스키마 위험

1. legacy route는 제거됐고, 앱 실행 경로는 `keyword_searches`, `keyword_chart_timeseries`, `keyword_temporary_overlays`를 사용하지 않는다.
2. 키워드 공백 정규화 unique 마이그레이션은 작성됐고, DB 적용 전에는 새 컬럼을 사용할 수 없다.
3. `docs/sql/20260421_keyword_normalized_names_precheck.sql`로 기존 중복 후보를 먼저 확인한다.

## 4. 현재 라우트 구조 문제

### 중복 또는 action성 API

- `/api/stocks/search`
- `/api/keyword-batch`
- `/api/trends-internal`

### 정리 방향

- 조회 리소스와 저장 리소스를 분리한다.
- action이 필요한 경우에도 RESTful 하위 리소스 또는 상태 변경 PATCH로 표현한다.
- 내부 전용 API는 route handler가 아니라 service/provider 함수로 이동한다.

## 5. 환경 변수 상태

현재 `.env.example` 기준:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STOCK_DATA_CACHE_TTL_SECONDS`
- `TRENDS_CACHE_TTL_SECONDS`
- `PREVIEW_CACHE_TTL_SECONDS`

Vercel 환경에서 자동 주입되는 변수 (검증/타입만 명시, .env 작성 X):

- `VERCEL` (`1` 이면 Vercel 런타임)
- `VERCEL_URL` (현재 deployment hostname, scheme 없음)

문제:

- 없음. `api/pytrends.py` 는 Vercel Python serverless function 으로 정착되었다.

## 6. 우선 리팩터링 순서

1. Vercel 배포 전 `/api/pytrends` 동작 확인.
2. Vercel 환경 변수에 Redis 값을 설정.
3. 테스트 도구 도입.

## 7. 리팩터링 중 안전 규칙

- 한 PR/커밋에서 public API와 DB 스키마를 동시에 크게 바꾸지 않는다.
- route를 제거하기 전 사용처를 `rg`로 확인한다.
- DB drop은 precheck/백업 확인 후 적용한다.
- 외부 API 호출은 mock 가능한 provider로 감싼 뒤 테스트한다.
- 각 단계마다 `typecheck`, `lint`, `build`를 확인한다.

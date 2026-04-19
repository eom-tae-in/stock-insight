# StockInsight Current Status

작성 기준: 2026-04-19

이 문서는 리팩터링 시작 전 현재 구현 상태를 고정하기 위한 점검 리포트다. 목적은 “무엇이 어디에 구현되어 있고, 어떤 흐름이 현재 기준이며, 무엇을 정리해야 하는지”를 명확히 하는 것이다.

## 1. 검증 기준선

최근 기준선 커밋:

```text
d35c06c chore: 현재 아키텍처 기준선 정리
```

최근 확인 결과:

- `npm run typecheck`: 통과
- `npm run lint`: 통과, 경고 32개
- `npm run build`: 통과

남은 린트 경고의 대부분은 unused 변수/함수와 React hook dependency 경고다. 구조 리팩터링 과정에서 제거한다.

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
- `GET /api/stock`
- `GET /api/stock-data`
- `POST /api/stock/save`
- `GET /api/ticker-search`

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
2. `POST /api/searches`가 Yahoo Finance 데이터를 수집한다.
3. 지표를 계산한다.
4. `searches`와 `stock_price_data`에 저장한다.
5. 상세 페이지에서 저장 데이터를 조회해 차트와 지표를 표시한다.

개선 필요:

- `stock`, `stock-data`, `stock/save`, `ticker-search`, `stocks/search`가 역할상 중복된다.
- RESTful 기준으로 `stocks`, `searches` 또는 `watchlist` 리소스 경계를 재정의해야 한다.

### 2.3 Google Trends

API/스크립트:

- `GET /api/trends`
- `GET/POST /api/trends-internal`
- `api/trends.py`
- `src/lib/get_trends.py`
- `src/lib/services/trends-service.ts`

환경:

- `.env.example`의 `TRENDS_API_URL=http://localhost:5000/api/trends`
- `package.json`의 Flask 실행 포트는 `5001`

현재 흐름:

- `/api/trends`는 `TRENDS_API_URL`로 POST 요청을 보낸다.
- `/api/trends-internal`은 `.venv/bin/python3 src/lib/get_trends.py`를 직접 실행한다.
- `api/trends.py`는 Flask 로컬 서버와 Vercel Python handler 역할을 동시에 가진다.

개선 필요:

- 포트 불일치가 있다. 기본 env는 `5000`, dev script는 `5001`.
- Trends provider가 3개 경로로 분산되어 있다.
- 실패 시 빈 배열을 성공처럼 반환하는 경로가 있다.
- 목표는 단일 `TrendsProvider` 인터페이스와 단일 API 계약이다.

### 2.4 키워드 검색 legacy 흐름

화면/컴포넌트:

- `src/app/(app)/trends/page.tsx`
- `src/app/(app)/trends/search/page.tsx`
- `src/app/(app)/keywords/search/page.tsx`
- `src/components/keyword-trends/keyword-trends-client.tsx`
- `src/components/keyword-search-page/keyword-search-page-client.tsx`

API:

- `GET /api/keyword-searches`
- `POST /api/keyword-searches`
- `DELETE /api/keyword-searches?id=...`
- `GET /api/keyword-searches/[keywordId]/overlays`
- `POST /api/keyword-searches/[keywordId]/overlays`
- `PATCH /api/keyword-searches/[keywordId]/overlays`
- `DELETE /api/keyword-searches/[keywordId]/overlays/[overlayId]`
- `POST /api/keyword-searches/[keywordId]/overlays/[overlayId]/refresh`
- `POST /api/keyword-searches/[keywordId]/overlays/batch-delete`

DB 테이블:

- `keyword_searches`
- `keyword_chart_timeseries`
- `keyword_temporary_overlays` 사용 코드 있음

현재 문제:

- `keyword_temporary_overlays`는 코드에서 사용하지만 현재 마이그레이션에 `CREATE TABLE` 정의가 없다.
- `keyword_searches`는 새 마이그레이션에서 `(user_id, keyword, region, search_type)` unique로 바뀌었지만 adapter는 아직 `onConflict: 'user_id,keyword'`를 쓴다.
- legacy route가 계속 신규 기능처럼 사용되고 있다.

결론:

- 이 흐름은 최종 구조가 아니라 migration/compatibility 대상으로 분류한다.

### 2.5 키워드 분석 신형 흐름

화면/컴포넌트:

- `src/app/(app)/keywords/[keywordId]/page.tsx`
- `src/components/keyword-detail/keyword-detail-client.tsx`
- `src/components/keyword-detail/keyword-standalone-chart.tsx`
- `src/components/keyword-detail/overlay-card.tsx`

API:

- `GET /api/keyword-analysis`
- `POST /api/keyword-analysis`
- `GET /api/keyword-analysis/[analysisId]`
- `PATCH /api/keyword-analysis/[analysisId]`
- `DELETE /api/keyword-analysis/[analysisId]`
- `GET /api/keyword-analysis/[analysisId]/overlays`
- `POST /api/keyword-analysis/[analysisId]/overlays`
- `PATCH /api/keyword-analysis/[analysisId]/overlays`
- `DELETE /api/keyword-analysis/[analysisId]/overlays/[overlayId]`

DB 테이블:

- `keywords`
- `keyword_analysis`
- `keyword_stock_overlays`
- `overlay_chart_timeseries`

현재 흐름:

1. 키워드 상세 페이지에서 region/searchType 조건을 선택한다.
2. `GET /api/keyword-analysis`로 조건별 analysis를 조회한다.
3. 없으면 `POST /api/keyword-analysis`로 생성한다.
4. 생성 과정에서 `/api/trends-internal`을 서버에서 다시 호출한다.
5. analysis별 overlay는 `keyword_stock_overlays.analysis_id` 기준으로 저장한다.

개선 필요:

- `keywordId`는 실제로 legacy `keyword_searches.id`와 new `keywords.id` 의미가 섞일 수 있다.
- `keyword-detail-client.tsx`에 console debug 로그와 unused handler가 많다.
- `POST /api/keyword-analysis`가 내부 HTTP로 `/api/trends-internal`을 호출한다. service 함수 호출로 바꿔야 한다.
- overlay API는 신형 모델에 맞지만 repository/service 레이어 없이 route에서 직접 Supabase를 조작한다.
- 키워드 분석 오버레이는 저장 종목(`searches`)과 독립되어야 한다. 현재 `search_id` FK와 `/api/searches` 선저장 흐름은 목표 도메인 모델과 충돌한다.

## 3. 현재 DB 모델 상태

### 기준으로 유지할 모델

- `searches`
- `stock_price_data`
- `keywords`
- `keyword_analysis`
- `keyword_stock_overlays`
- `overlay_chart_timeseries`

### 정리 대상 모델

- `keyword_searches`
- `keyword_chart_timeseries`
- `keyword_temporary_overlays`
- `keyword_stock_overlays.keyword_search_id`
- `keyword_stock_overlays.search_id`

### 즉시 확인해야 할 스키마 위험

1. `keyword_temporary_overlays` 생성 마이그레이션 없음.
2. `keyword_searches` unique 제약과 adapter upsert conflict target 불일치.
3. `keyword_stock_overlays`는 migration 20260410에서 재생성되지만 legacy 코드 일부는 `keyword_search_id` 기반 사고방식을 유지한다.
4. `keyword_stock_overlays.search_id -> searches.id` 때문에 키워드 분석 오버레이가 사용자 저장 종목 도메인에 묶여 있다.
5. `keywords.name`은 존재하지만 normalized name unique 정책이 아직 명확하지 않다.

## 4. 현재 라우트 구조 문제

### 중복 또는 action성 API

- `/api/stock`
- `/api/stock-data`
- `/api/stock/save`
- `/api/ticker-search`
- `/api/stocks/search`
- `/api/keyword-batch`
- `/api/trends-internal`
- `/api/keyword-searches/[keywordId]/overlays/batch-delete`
- `/api/keyword-searches/[keywordId]/overlays/[overlayId]/refresh`

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
- `TRENDS_API_URL`
- `TRENDS_API_TIMEOUT`

문제:

- `src/env.d.ts`에는 `NEXT_PUBLIC_*`, `TRENDS_API_*` 타입 선언이 없다.
- `src/lib/env.ts`는 Supabase만 검증한다.
- `TRENDS_API_URL` 기본 포트와 dev script 포트가 다르다.

## 6. 우선 리팩터링 순서

1. RESTful API 규칙과 목표 라우트 구조 확정.
2. keyword 최종 DB 모델 확정.
3. legacy keyword route를 compatibility 대상으로 격리.
4. Trends provider 단일화.
5. `keyword-analysis`와 `overlays` API를 service/repository 기반으로 재작성.
6. `keyword-detail-client.tsx` 디버그 로그, unused handler, hook dependency 정리.
7. 테스트 도구 도입.

## 7. 리팩터링 중 안전 규칙

- 한 PR/커밋에서 public API와 DB 스키마를 동시에 크게 바꾸지 않는다.
- route를 제거하기 전 사용처를 `rg`로 확인한다.
- legacy route는 즉시 삭제하지 않고 먼저 deprecated 문서화 후 사용처를 신형 route로 이동한다.
- 외부 API 호출은 mock 가능한 provider로 감싼 뒤 테스트한다.
- 각 단계마다 `typecheck`, `lint`, `build`를 확인한다.

# StockInsight TRD

## 1. 목적

이 문서는 현재 StockInsight의 실제 기술 구조, 런타임 흐름, 데이터 저장 방식, 운영상 주의점을 정리한 기술 기준 문서다.

이 문서는 “미래 목표”보다 “현재 코드 기준으로 실제 어떻게 동작하는가”를 우선한다.

## 2. 핵심 스택

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui, Radix UI, lucide-react
- Recharts
- Supabase Auth + PostgreSQL + RLS
- Upstash Redis REST
- Yahoo Finance via `yahoo-finance2`
- Google Trends via `pytrends`
- Vercel + Vercel Python Function

## 3. 런타임 구조

### 3.1 앱 구조

```text
src/app
  (app)/            인증이 필요한 주요 화면
  (auth)/           로그인, 회원가입, 비밀번호 설정
  api/              Next API routes

src/components
  admin/            운영 대시보드 UI
  auth/             인증 UI
  stock/            종목 분석 UI
  keyword/          키워드 분석 UI
  overlays/         오버레이 상세 UI
  shared/           공통 클라이언트 컴포넌트
  ui/               shadcn/ui 기반 UI

src/server
  admin-service.ts
  cached-stock-service.ts
  stock-preview-service.ts
  trends-internal-service.ts
  keywords-service.ts
  keyword-analyses-service.ts
  analysis-overlays-service.ts

src/lib
  supabase/
  db/
  adapters/
  export/
  parsers/
  utils/
  get_trends.py

api/
  pytrends.py       Vercel Python Function

migrations/
  Supabase schema and view migrations
```

### 3.2 화면 라우트

주요 보호 화면:

- `/`
- `/search`
- `/stock-analysis`
- `/stock-analysis/[id]`
- `/stock-analysis/[id]/table`
- `/stock-analysis/preview/[id]`
- `/stock-analysis/preview/[id]/table`
- `/keyword-analysis`
- `/keyword-analysis/new`
- `/keyword-analysis/search`
- `/keywords/search`
- `/keywords/[keywordId]`
- `/keywords/[keywordId]/overlays/[overlayId]`
- `/admin`

인증 화면:

- `/login`
- `/signup`
- `/set-password`

## 4. 인증 및 권한 구조

- 미들웨어가 보호된 페이지/보호된 API를 구분한다.
- 공개 페이지는 `/login`, `/signup`이다.
- 공개 API는 `/api/auth/callback`, `/api/health`이다.
- 보호 페이지는 미인증 시 `/login?next=...`로 이동한다.
- 보호 API는 미인증 시 401 JSON을 반환한다.
- 인증된 사용자가 `/login` 또는 `/signup`에 접근하면 `next` 또는 `/`로 이동한다.
- `/api/pytrends`는 내부 Python Function이므로 미들웨어 인증을 우회하고 자체 secret 검증을 수행한다.
- `/admin`과 `/api/admin/summary`는 `ADMIN_EMAILS` 기반 관리자 이메일만 접근할 수 있다.

## 5. 데이터 흐름

### 5.1 종목 검색/미리보기/저장 흐름

1. 사용자가 `/search`에서 티커 또는 회사명을 입력한다.
2. `/api/stocks/search`가 Yahoo Finance search 결과를 반환한다.
3. 사용자가 종목을 선택하면 `/api/stock-previews`가 실행된다.
4. `stock-preview-service`가 `fetchCachedStockData()`를 호출한다.
5. Redis stock cache miss 시 Yahoo Finance에서 5년 주간 데이터를 수집한다.
6. preview payload를 Redis에 `preview:{id}`로 저장한다.
7. 사용자는 `/stock-analysis/preview/[id]`에서 미리보기를 확인한다.
8. 저장 시 preview를 `searches`, `stock_price_data`에 저장한다.
9. 저장된 종목은 `/stock-analysis`, `/stock-analysis/[id]`에서 재사용한다.

중요:

- 종목 데이터 캐시 키는 마지막 완료 주를 포함한다.
- 종목 미리보기 캐시는 Redis가 필요하다.
- `.KS` 티커는 현재 주가 수집 서비스에서 명시적으로 거부한다.

### 5.2 저장 종목 최신화 흐름

1. 사용자가 저장 종목 최신화를 요청한다.
2. `/api/searches/[id]/refreshes`가 실행된다.
3. Yahoo Finance/Redis 캐시에서 최신 5년 주간 데이터를 가져온다.
4. `searches`의 지표와 `stock_price_data`를 갱신한다.

### 5.3 키워드 Trends 조회 흐름

1. 사용자가 `/keyword-analysis/new`에서 키워드를 입력한다.
2. 클라이언트가 `/keyword-analysis/search?...`로 이동한다.
3. 결과 페이지 클라이언트 컴포넌트가 `/api/trends`를 호출한다.
4. `trends-internal-service`가 입력을 정규화하고 Redis Trends cache를 조회한다.
5. cache miss 시 현재 요청 host 기준으로 `/api/pytrends`를 self-fetch한다.
6. `api/pytrends.py`가 `src/lib/get_trends.py`의 `get_trends()`를 실행한다.
7. Python runtime이 pytrends로 Google Trends 데이터를 수집한다.
8. Next 서버가 raw Trends 데이터에 MA13/YoY를 계산해 응답한다.
9. cache miss 결과는 Redis에 저장한다.

### 5.4 키워드 저장/분석 흐름

1. 저장 시 `keywords`에 키워드 이름을 저장한다.
2. 키워드 이름은 공백 정규화 값으로 중복을 방지한다.
3. 조건별 분석은 `keyword_analysis`에 저장한다.
4. 현재 분석 생성 시 원본 기간은 5Y로 고정한다.
5. 화면 기간 선택은 저장된 5Y 데이터를 잘라 보는 view filter다.
6. 분석 목록은 `display_order`로 정렬할 수 있다.

### 5.5 오버레이 흐름

1. 사용자가 특정 analysis에 종목 오버레이를 추가한다.
2. API는 analysis 소유권을 확인한다.
3. 클라이언트가 보낸 region, period, search_type이 실제 analysis와 다르면 409를 반환한다.
4. `keyword_stock_overlays`에 오버레이를 저장한다.
5. `overlay_chart_timeseries`에 raw price와 0-100 normalized price를 저장한다.
6. 오버레이 목록은 analysis_id 기준으로 조회/정렬/삭제/최신화한다.

## 6. Trends 런타임 상세

### 6.1 단일 실행 경로

현재 키워드 Trends 수집은 `/api/pytrends` Python Function 경로를 기준으로 정리되어 있다.

- Next 서버는 로컬 Python 스크립트를 직접 실행하지 않는다.
- 모든 환경에서 Next -> `/api/pytrends` HTTP 호출을 사용한다.
- 배포와 동일한 구조로 로컬 검증하려면 `vercel dev`를 사용한다.

### 6.2 내부 인증

- Next 서버는 `PYTRENDS_INTERNAL_SECRET`를 읽는다.
- `/api/pytrends`도 같은 `PYTRENDS_INTERNAL_SECRET`를 읽는다.
- Next는 `x-internal-api-secret` 헤더로 내부 요청을 보낸다.
- 값이 없거나 다르면 Python Function은 401 또는 500을 반환한다.
- 프로덕션에서는 `PYTRENDS_INTERNAL_SECRET`가 필수다.

### 6.3 재시도 및 캐시

- Trends 조회는 최대 2회 시도한다.
- 재시도 간 대기 시간은 3초다.
- 429, 408, 5xx 계열 오류는 재시도 대상으로 분류한다.
- Upstash Redis 캐시를 사용한다.
- 기본 TTL은 `TRENDS_CACHE_TTL_SECONDS`, 미설정 시 24시간이다.
- cache key에는 keyword, geo, timeframe, gprop, 마지막 완료 주가 포함된다.

### 6.4 로컬 실행 주의점

`next dev`만 실행하면 `/api/pytrends` Python Function이 제공되지 않을 수 있다. 이 경우 `/api/trends`는 `PYTRENDS_ROUTE_UNAVAILABLE` 계열 오류를 반환한다.

Trends까지 검증해야 할 때는 다음을 사용한다.

```bash
vercel dev
```

## 7. 저장 모델

### 7.1 종목

- `searches`
  - 사용자별 저장 종목 메타데이터
  - ticker, company_name, currency, weekly OHLC, 지표, 검색/갱신 시각
- `stock_price_data`
  - search_id별 5년 주간 OHLCV 시계열

### 7.2 키워드

- `keywords`
  - 사용자별 키워드 컨테이너
  - name, normalized_name, display_order
- `keyword_analysis`
  - 조건 조합별 분석 데이터
  - keyword_id, region, period, search_type, trends_data, ma13_data, yoy_data, display_order
- `keyword_stock_overlays`
  - analysis_id별 종목 오버레이
  - ticker, company_name, display_order, last_refreshed_at
- `overlay_chart_timeseries`
  - overlay_id별 raw price와 normalized price 시계열

### 7.3 운영 view

- `admin_recent_keyword_analysis`
- `admin_recent_keyword_stock_overlays`

관리자 대시보드는 위 view와 주요 테이블 count를 조합해 읽기 전용 요약을 만든다.

## 8. API 구조

### 8.1 응답 원칙

- API 응답은 `createSuccessResponse`, `createErrorResponse` 형식을 사용한다.
- 보호 API는 `validateApiAuth()` 또는 동일한 인증 검증을 거친다.
- 관리자 API는 `validateAdminApiAuth()`를 사용한다.
- 내부 오류는 프로덕션 응답에 직접 노출하지 않는다.
- 외부 API 실패를 빈 배열 성공으로 숨기지 않는다.

### 8.2 주요 API

종목:

- `GET /api/stocks/search`
- `GET /api/stocks/[ticker]`
- `POST /api/stock-previews`
- `GET|POST /api/searches`
- `GET|DELETE /api/searches/[id]`
- `POST /api/searches/[id]/refreshes`

키워드/Trends:

- `GET /api/trends`
- `GET|POST /api/trends-internal`
- `GET|POST|PATCH /api/keywords`
- `GET|DELETE /api/keywords/[keywordId]`
- `POST /api/keywords/[keywordId]/refreshes`
- `GET|POST /api/keywords/[keywordId]/analyses`
- `PATCH /api/keywords/reorder`
- `POST /api/keyword-batch`

분석/오버레이:

- `GET|PATCH|DELETE /api/analyses/[analysisId]`
- `POST /api/analyses/[analysisId]/refreshes`
- `PATCH /api/analyses/reorder`
- `GET|POST|PATCH /api/analyses/[analysisId]/overlays`
- `DELETE /api/analyses/[analysisId]/overlays/[overlayId]`
- `POST /api/analyses/[analysisId]/overlays/[overlayId]/refreshes`
- `GET|POST|PATCH /api/keywords/[keywordId]/overlays`
- `DELETE /api/keywords/[keywordId]/overlays/[overlayId]`

운영:

- `GET /api/health`
- `GET /api/admin/summary`
- `POST /api/pytrends`

## 9. 환경 변수

필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PYTRENDS_INTERNAL_SECRET` in production

선택/권장:

- `SUPABASE_SECRET_KEY`
- `ADMIN_EMAILS`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STOCK_DATA_CACHE_TTL_SECONDS`
- `TRENDS_CACHE_TTL_SECONDS`
- `PREVIEW_CACHE_TTL_SECONDS`

주의:

- `SUPABASE_SECRET_KEY`가 없으면 관리자 대시보드는 현재 관리자 세션에서 조회 가능한 범위만 표시한다.
- Redis가 없으면 일반 주가/Trends 캐시는 우회되지만, 종목 미리보기 저장 흐름은 preview cache unavailable 오류가 날 수 있다.

## 10. 배포 기준

- 배포는 Vercel 기준이다.
- 빌드 명령은 `npm run build`다.
- Python runtime은 `api/pytrends.py`다.
- Python 의존성은 `requirements.txt`로 관리한다.
- `vercel.json`은 Python Function 번들에서 pycache/venv 파일을 제외한다.

배포 확인 포인트:

1. Supabase 환경 변수 설정
2. `PYTRENDS_INTERNAL_SECRET` 설정
3. 필요 시 Redis 환경 변수 설정
4. 필요 시 `SUPABASE_SECRET_KEY`, `ADMIN_EMAILS` 설정
5. Supabase migrations 적용
6. `/api/trends` -> `/api/pytrends` 내부 호출 정상 여부
7. `/admin`의 운영 상태 표시 정상 여부

## 11. 현재 기술 부채

- Trends 경로는 안정화됐지만 self-fetch hop 비용이 있다.
- 키워드 결과 페이지는 Trends 조회 외에 저장 키워드/분석 관련 부가 API를 호출한다.
- 인증 체크가 미들웨어, 페이지, API에서 일부 중복된다.
- API route와 service/db 레이어의 책임 분리가 일부 경로에서 균일하지 않다.
- 테스트 자동화가 부족해 핵심 회귀를 수동 확인에 의존한다.
- 문서와 코드가 자주 어긋났던 만큼 문서 유지가 중요하다.

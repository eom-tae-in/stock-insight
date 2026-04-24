# StockInsight TRD

## 1. 목적

이 문서는 현재 StockInsight의 실제 기술 구조, 런타임 흐름, 데이터 저장 방식, 운영상 주의점을 정리한 기술 기준 문서다.

이 문서는 “미래 목표”보다 “현재 코드 기준으로 실제 어떻게 동작하는가”를 우선한다.

## 2. 핵심 스택

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase Auth + PostgreSQL
- Upstash Redis REST
- Yahoo Finance
- pytrends
- Vercel + Python Function

## 3. 런타임 구조

### 3.1 앱 구조

```text
src/app
  (app)/            보호된 주요 화면
  (auth)/           인증 화면
  api/              Next API routes

src/components
  auth/             인증 UI
  stock/            종목 분석 UI
  keyword/          키워드 분석 UI
  ui/               공통 UI

src/server
  trends-internal-service.ts
  기타 서버 유스케이스

src/lib
  supabase/
  db/
  adapters/
  export/
  get_trends.py

api/
  pytrends.py       Vercel Python Function
```

### 3.2 인증 구조

- 미들웨어가 보호된 페이지/보호된 API를 구분한다.
- 보호 페이지는 미인증 시 `/login?next=...` 로 이동한다.
- 보호 API는 미인증 시 401 JSON을 반환한다.
- 로그인 후 `next` 경로로 복귀한다.
- `/api/pytrends` 는 내부 호출용이므로 미들웨어에서 우회한다.

## 4. 데이터 흐름

### 4.1 종목 분석 흐름

1. 사용자가 `/search` 에서 티커 또는 회사명 입력
2. `/api/stocks/search` 또는 `/api/stock-previews` 호출
3. Yahoo Finance 데이터 수집
4. Supabase에 저장 또는 preview 생성
5. `/stock-analysis`, `/stock-analysis/[id]` 에서 재사용

### 4.2 키워드 분석 흐름

1. 사용자가 `/keyword-analysis/new` 에서 키워드 입력
2. 클라이언트가 `/keyword-analysis/search?...` 로 이동
3. 결과 페이지의 클라이언트 컴포넌트가 `/api/trends` 호출
4. `src/server/trends-internal-service.ts` 가 실행됨
5. Upstash Redis에서 Trends 캐시 조회
6. cache miss 시 현재 요청 host 기준으로 `/api/pytrends` self-fetch
7. `api/pytrends.py` 가 `src/lib/get_trends.py` 실행
8. `pytrends` 가 Google Trends 데이터 수집
9. 결과를 Redis에 저장 후 클라이언트에 반환

### 4.3 키워드 결과 페이지 UI 상태

현재 키워드 검색 결과 페이지는 세 상태를 구분한다.

- 조회 중
- 조회 성공
- 조회 실패 / rate limit

즉 사용자는 결과 페이지 진입 후 로딩 UI를 보고, 실패 시에는 실패 카드와 재시도 버튼을 본다.

## 5. Trends 런타임 상세

### 5.1 단일 실행 경로

현재 키워드 Trends 수집은 `/api/pytrends` Python Function 경로를 기준으로 정리되어 있다.

- Next 서버는 직접 로컬 Python을 실행하지 않는다.
- 배포와 동일한 구조로 검증하려면 `vercel dev` 사용이 권장된다.

### 5.2 내부 인증

- Next 서버는 `PYTRENDS_INTERNAL_SECRET`를 읽는다.
- `/api/pytrends` 도 같은 `PYTRENDS_INTERNAL_SECRET`를 읽는다.
- Next는 `x-internal-api-secret` 헤더로 내부 요청을 보낸다.
- 두 값이 다르면 `/api/pytrends` 는 401을 반환한다.

### 5.3 재시도 및 캐시

- Trends 조회는 현재 최대 2회 시도한다.
- 재시도 간 대기 시간은 3초다.
- Upstash Redis 캐시를 사용한다.
- 기본 TTL은 `TRENDS_CACHE_TTL_SECONDS`, 미설정 시 24시간이다.

### 5.4 느릴 수 있는 이유

키워드 cache miss 기준으로 다음 hop이 발생한다.

1. 브라우저 -> `/api/trends`
2. Next -> Upstash GET
3. Next -> `/api/pytrends`
4. Python -> Google Trends
5. Next -> Upstash SET

즉 현재 구조는 외부 I/O 비중이 높아서 첫 조회가 느릴 수 있다.

## 6. 저장 모델

### 6.1 종목

- `searches`
- `stock_price_data`

### 6.2 키워드

- `keywords`
- `keyword_analysis`
- `keyword_stock_overlays`
- `overlay_chart_timeseries`

현재 코드 기준으로 legacy keyword 모델은 확장 대상이 아니다.

## 7. API 원칙

- API 응답은 `createSuccessResponse`, `createErrorResponse` 형식을 사용한다.
- 보호 API는 `validateApiAuth()` 또는 동일한 인증 검증을 거친다.
- 내부 오류는 프로덕션 응답에 직접 노출하지 않는다.
- 외부 API 실패를 빈 배열 성공으로 숨기지 않는다.

## 8. 환경 변수

필수 핵심 값:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `PYTRENDS_INTERNAL_SECRET`

선택:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STOCK_DATA_CACHE_TTL_SECONDS`
- `TRENDS_CACHE_TTL_SECONDS`
- `PREVIEW_CACHE_TTL_SECONDS`

## 9. 배포 기준

- 배포는 Vercel 기준
- Python runtime은 `api/pytrends.py`
- `requirements.txt` 로 Python 의존성을 설치
- `vercel.json` 에서 Python 번들 제외 규칙을 사용

배포 확인 포인트:

1. `PYTRENDS_INTERNAL_SECRET` 환경 변수 설정
2. `requirements.txt` 반영 여부
3. `/api/trends` -> `/api/pytrends` 내부 호출 정상 여부

## 10. 현재 기술 부채

- Trends 경로는 안정화됐지만 self-fetch hop 비용이 있다.
- 키워드 페이지는 Trends 조회 외에 저장된 키워드 목록 API도 추가 호출한다.
- 인증 체크가 미들웨어, 페이지, API에서 일부 중복된다.
- 문서와 코드가 자주 어긋났던 만큼 문서 유지가 중요하다.

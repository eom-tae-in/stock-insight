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
  stock-analysis-service.ts
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
- `/stock-analysis/search`
- `/stock-analysis/search/table`
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

### 5.1 종목 검색/조회/저장 흐름

1. 사용자가 `/search`에서 티커 또는 회사명을 입력한다.
2. `/api/stocks/search`가 Yahoo Finance search 결과를 반환한다.
3. 사용자가 종목을 선택하면 `/api/stock-data?ticker={ticker}&period=5Y&interval=1wk`가 실행된다.
4. `stock-analysis-service`가 `fetchCachedStockData()`를 호출한다.
5. Redis stock cache miss 시 Yahoo Finance에서 5년 주간 데이터를 수집한다.
6. 결과는 `stock-data:v1:{ticker}:5y:1wk:{completedWeek}` 캐시에 저장된다.
7. 사용자는 `/stock-analysis/search?ticker={ticker}&period=5Y&interval=1wk`에서 캐시 기반 조회 결과를 확인한다.
8. 저장 시 화면에 표시된 companyName, currency, priceData를 `POST /api/searches`로 보내 `searches`, `stock_price_data`에 영구 저장한다.
9. 저장된 종목은 `/stock-analysis`, `/stock-analysis/[id]`에서 재사용한다.

중요:

- 종목 데이터 캐시 키는 마지막 완료 주를 포함한다.
- Redis가 없어도 종목 조회는 외부 API 직접 조회로 fallback한다.
- 저장은 Redis 재조회가 아니라 화면에 표시된 데이터 payload를 검증해 영구 저장한다.
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

## 8. 설계 결정 배경

이 섹션은 현재 구조를 바꾸거나 디버깅할 때 자주 생기는 "왜 이렇게 했는가?"를 정리한다. 평소에는 접힌 제목만 훑고, 특정 결정의 배경이 필요할 때만 펼쳐서 확인한다.

### 8.1 데이터 모델과 저장 단위

<details>
<summary>왜 키워드와 분석을 분리하는가?</summary>

`keywords`는 사용자가 저장한 키워드 이름 컨테이너이고, `keyword_analysis`는 조건 조합별 분석 결과다. 같은 키워드라도 region, period, search_type이 달라지면 Google Trends의 기준 모집단과 검색 속성이 달라진다. 따라서 "같은 keyword의 다른 상태"가 아니라 "같은 keyword 아래의 독립 분석"으로 모델링한다.

분석 단위는 `(keyword_id, region, period, search_type)` 조합이다. 이 조합을 유일한 분석 기준으로 두면 저장, 복원, 최신화, 삭제, 정렬, 오버레이 연결이 모두 같은 단위를 기준으로 동작한다.

</details>

<details>
<summary>왜 keyword normalization을 하는가?</summary>

사용자는 같은 키워드를 조금씩 다르게 입력할 수 있다. 예를 들어 `tesla`, `tesla  `, `tesla   stock`처럼 앞뒤 공백이나 중간 공백이 달라져도 사용자가 의도한 키워드는 같은 경우가 많다.

keyword normalization은 이런 입력 차이를 저장 기준에서 정리하는 과정이다. 공백을 정리한 `normalized_name`을 함께 저장하면 같은 사용자의 키워드 목록에 사실상 같은 키워드가 여러 개 생기는 일을 막을 수 있다. 또한 저장된 키워드를 다시 찾거나 중복 여부를 확인할 때 화면 입력 모양이 조금 달라도 같은 키워드로 판단할 수 있다.

즉 normalization은 검색어 의미를 바꾸는 처리가 아니라, 사용자가 실수로 넣은 공백 차이 때문에 저장 데이터와 목록 UX가 지저분해지는 것을 막기 위한 최소한의 정리다.

</details>

<details>
<summary>왜 오버레이를 analysis_id 기준으로 저장하는가?</summary>

오버레이는 `keyword_id`가 아니라 `analysis_id` 기준으로 저장한다. 같은 키워드라도 `GLOBAL / WEB` 분석과 `US / YOUTUBE` 분석은 비교 맥락이 다르며, 연결된 종목도 달라질 수 있다. 오버레이를 keyword에 직접 붙이면 조건 변경 시 이전 조건의 종목이 섞여 보일 위험이 있다.

오버레이 저장 시 filter mismatch를 검증하는 이유도 같다. 클라이언트 화면에서 사용자가 조건을 바꾸는 중이거나 오래된 요청이 뒤늦게 도착하면, 다른 analysis에 종목이 저장될 수 있다. 서버는 클라이언트가 보낸 region, period, search_type이 실제 analysis와 같은지 확인해 이 상태를 409로 막는다.

</details>

<details>
<summary>왜 5Y 원본 저장과 view filter 방식을 쓰는가?</summary>

현재 키워드 분석 원본 데이터는 5Y 기준으로 저장한다. 기간 변경마다 Trends를 재조회하면 rate limit, 응답 지연, 외부 API 변동으로 인해 같은 분석 화면 안에서도 데이터 기준이 달라질 수 있다.

그래서 화면의 기간 변경은 저장된 5Y 데이터를 잘라 보는 view filter로 처리한다. 이 방식은 빠르고, 같은 원본 데이터에서 파생된 화면을 보여주며, 다운로드와 차트가 같은 기준을 공유하게 만든다.

</details>

<details>
<summary>왜 주간 축으로 정규화하는가?</summary>

종목 가격과 Google Trends는 함께 비교되어야 하므로 모두 주간 축에 맞춘다. Yahoo Finance 주간 데이터 날짜는 거래소/응답 형태에 따라 기준 요일이 다를 수 있어 ISO week start로 정규화한다. 이렇게 해야 주가, Trends, MA13, YoY, 오버레이가 같은 주차 기준으로 정렬된다.

</details>

<details>
<summary>왜 raw price와 normalized price를 둘 다 저장하는가?</summary>

여기서 오버레이는 특정 키워드 분석 차트 위에 겹쳐 보는 종목 오버레이를 뜻한다. 예를 들어 `tesla / GLOBAL / 5Y / WEB` 분석에 `AAPL`을 추가하면, `keyword_stock_overlays`에는 `AAPL` 오버레이 자체의 메타데이터가 저장되고, `overlay_chart_timeseries`에는 그 `AAPL` 오버레이를 차트에 그리기 위한 주간 가격 포인트가 저장된다.

`keyword_stock_overlays`에는 analysis_id, ticker, company_name, display_order 같은 연결 정보만 둔다. 날짜별 raw price와 normalized price는 `overlay_chart_timeseries`에 `overlay_id` 기준으로 저장한다. raw price는 실제 가격 확인과 다운로드에 필요하고, normalized price는 서로 다른 가격 단위의 종목을 0-100 범위에서 같은 차트에 비교하기 위해 필요하다.

이렇게 분리하면 `AAPL` 오버레이를 삭제할 때 해당 `overlay_id`의 시계열을 함께 제거하기 쉽고, `AAPL`만 최신화할 때도 그 오버레이의 주간 포인트만 교체하면 된다. 또한 오버레이 생성 중 시계열 저장이 실패하면 방금 만든 overlay row를 롤백해 차트 데이터 없는 오버레이가 남는 것을 막을 수 있다. 운영 관점에서도 "오버레이는 있는데 차트 포인트가 0개인 상태" 같은 이상 데이터를 점검하기 쉽다.

</details>

### 8.2 검색, 조회, 캐시

<details>
<summary>왜 종목 조회는 preview cache가 아니라 조건 기반 lookup cache를 쓰는가?</summary>

종목 검색은 저장보다 자주 일어난다. 사용자는 여러 티커를 검색해 보고, 회사명이나 가격 흐름을 확인한 뒤 저장하지 않을 수 있다. 이때 검색할 때마다 바로 DB에 영구 저장하면 저장하지 않은 후보 데이터가 사용자 데이터 모델에 섞이고, 나중에 정리해야 할 임시 데이터가 늘어난다.

그래서 종목 조회 화면은 DB 저장 없이 Yahoo Finance 조회 결과를 보여준다. 이 결과는 `stock-data:v1:{ticker}:5y:1wk:{completedWeek}` Redis 캐시에 저장되며, 같은 완료 주에 같은 ticker, period, interval 조건을 다시 조회하는 사용자는 외부 API를 다시 호출하지 않고 캐시를 재사용한다.

저장 버튼을 누르면 별도 `preview:{id}` 객체를 읽는 것이 아니라 현재 화면에 표시된 companyName, currency, priceData를 `searches`와 `stock_price_data`에 영구 저장한다. 즉 Redis의 역할은 저장 전 후보 스냅샷 보관이 아니라, 조건 기반 반복 조회 최적화다.

</details>

<details>
<summary>왜 캐시 키에 마지막 완료 주를 넣고 TTL을 24시간으로 두는가?</summary>

주가와 Trends cache key에는 마지막 완료 주를 포함한다. 주간 분석 제품에서 같은 키워드/티커라도 새 주가 완료되면 데이터 기준이 바뀌므로, 완료 주가 바뀔 때 자연스럽게 새 데이터를 조회하게 하기 위한 선택이다.

기본 TTL은 24시간이다. 주간 데이터 제품에서는 분 단위 최신성이 핵심이 아니고, Google Trends와 Yahoo Finance 호출 비용 및 rate limit 위험이 더 크다. 24시간 TTL은 반복 조회 체감을 개선하면서도 다음 운영일에 새 데이터를 다시 확인할 수 있는 보수적인 기준이다.

Redis cache miss 시 외부 API를 재조회하는 구조는 캐시를 원천 데이터 저장소가 아니라 성능/안정성 보조 계층으로 보기 때문이다. Redis가 없거나 miss가 발생해도 가능한 경로는 외부 API를 통해 결과를 만들고, 성공한 결과만 다시 캐시에 저장한다.

</details>

<details>
<summary>왜 Trends 결과를 캐시하고 일부 실패만 재시도하는가?</summary>

Trends 결과는 Redis에 저장한다. Google Trends는 응답이 느리고 rate limit 가능성이 있으며, 같은 키워드/조건을 반복 조회하는 사용 흐름이 많기 때문이다.

조회에는 retry 정책을 둔다. 429, 408, 5xx는 일시 실패일 가능성이 있어 재시도하고, 입력 오류나 데이터 없음 계열은 재시도해도 성공 가능성이 낮으므로 즉시 실패로 처리한다. 실패를 빈 성공 응답으로 숨기지 않는 이유는 사용자가 "데이터가 0인 상태"와 "조회가 실패한 상태"를 다르게 판단해야 하기 때문이다.

</details>

### 8.3 런타임과 보안

<details>
<summary>왜 Python Function self-fetch 구조를 유지하는가?</summary>

Next 서버는 Python을 직접 실행하지 않고 `/api/pytrends`를 self-fetch한다. 배포 기준이 Vercel이고, pytrends는 Python 런타임 의존성을 가진다. Python Function으로 분리하면 Node/Next 런타임과 Python 의존성을 분리할 수 있고, 로컬도 `vercel dev` 기준으로 배포와 같은 호출 경로를 검증할 수 있다.

self-fetch 구조는 성능과 단순성 면에서 단점이 있다. HTTP 경계를 한 번 더 지나기 때문에 지연, 직렬화 비용, 실패 지점이 늘어난다. 그럼에도 현재는 Vercel 단일 프로젝트 안에서 Node/Next 런타임과 pytrends Python 런타임을 분리해 배포하기 위한 현실적인 선택으로 유지한다. 이 비용은 기술 부채로 보고, cache hit 비율 개선이나 별도 Python 서비스 분리를 장기 개선 후보로 둔다.

`/api/pytrends`는 미들웨어 auth를 우회하므로 자체 internal secret 검증이 필요하다. 이 엔드포인트는 브라우저 사용자가 직접 호출할 공개 API가 아니라 Next 서버가 호출하는 내부 런타임 경계다.

</details>

<details>
<summary>왜 RLS와 API auth를 함께 유지하는가?</summary>

사용자별 격리는 Supabase RLS를 중심으로 둔다. DB 레벨에서 소유권을 강제해야 API 구현 실수나 클라이언트 조작에도 데이터 경계가 유지된다.

동시에 API auth 검증도 유지한다. RLS는 데이터 접근의 최종 방어선이고, API auth는 빠른 실패 응답, 명확한 오류 형식, 불필요한 서비스 로직 실행 방지를 담당한다. 둘 중 하나만으로는 사용자 경험과 방어 깊이가 부족하다.

</details>

<details>
<summary>왜 관리자 권한과 운영 범위를 이렇게 제한하는가?</summary>

관리자 접근은 `ADMIN_EMAILS` 기반이다. 현재 제품의 관리자 요구사항은 소수 운영자의 읽기 전용 점검이므로 별도 role 테이블보다 환경 변수 기반 허용 목록이 단순하고 배포 환경에서 관리하기 쉽다.

관리자 권한 실패는 403 대신 not found처럼 처리한다. 운영 화면의 존재 자체를 일반 사용자에게 드러낼 필요가 없기 때문이다. 이 방식은 보안의 핵심 장치는 아니지만 내부 운영 경로의 노출 신호를 줄인다.

`SUPABASE_SECRET_KEY`가 있으면 service role client로 전체 운영 데이터를 조회한다. 없으면 현재 관리자 세션에서 RLS가 허용하는 범위만 보여주는 session scope로 fallback한다. secret 누락 때문에 관리자 화면 전체가 깨지는 것을 피하고, 로컬/제한 환경에서도 최소한의 상태 확인을 가능하게 하기 위한 선택이다.

</details>

### 8.4 사용자 제어와 문서 기준

<details>
<summary>왜 키워드, 분석, 오버레이에 각각 display_order를 두는가?</summary>

키워드, 분석, 오버레이에는 각각 `display_order`를 둔다. 세 목록은 사용자가 반복적으로 보는 작업 단위가 다르며, 사용자가 중요하게 보는 순서도 다르다. 서버 저장 순서를 명시적으로 두면 목록 복원과 드래그 정렬이 안정적으로 동작한다.

</details>

<details>
<summary>왜 문서는 현재 runtime 구조를 우선하는가?</summary>

이 문서는 미래 희망사항보다 현재 runtime 구조를 우선 기록한다. 이 프로젝트는 Next, Supabase, Redis, Python Function, 외부 API가 함께 움직이므로 문서가 실제 코드와 어긋나면 장애 원인 파악과 기능 수정이 어려워진다.

</details>

## 9. API 구조

### 9.1 응답 원칙

- API 응답은 `createSuccessResponse`, `createErrorResponse` 형식을 사용한다.
- 보호 API는 `validateApiAuth()` 또는 동일한 인증 검증을 거친다.
- 관리자 API는 `validateAdminApiAuth()`를 사용한다.
- 내부 오류는 프로덕션 응답에 직접 노출하지 않는다.
- 외부 API 실패를 빈 배열 성공으로 숨기지 않는다.

### 9.2 주요 API

종목:

- `GET /api/stocks/search`
- `GET /api/stocks/[ticker]`
- `GET /api/stock-data`
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

## 10. 환경 변수

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

주의:

- `SUPABASE_SECRET_KEY`가 없으면 관리자 대시보드는 현재 관리자 세션에서 조회 가능한 범위만 표시한다.
- Redis가 없으면 주가/Trends 조회 캐시는 우회되고 외부 API를 직접 조회한다.

## 11. 배포 기준

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

## 12. 현재 기술 부채

- Trends 경로는 안정화됐지만 self-fetch hop 비용이 있다.
- 키워드 결과 페이지는 Trends 조회 외에 저장 키워드/분석 관련 부가 API를 호출한다.
- 인증 체크가 미들웨어, 페이지, API에서 일부 중복된다.
- API route와 service/db 레이어의 책임 분리가 일부 경로에서 균일하지 않다.
- 테스트 자동화가 부족해 핵심 회귀를 수동 확인에 의존한다.
- 문서와 코드가 자주 어긋났던 만큼 문서 유지가 중요하다.

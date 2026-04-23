# StockInsight API Conventions

이 문서는 앞으로 RESTful하게 API를 정리하기 위한 규칙이다. 기존 API를 한 번에 삭제하지 않고, 목표 구조를 먼저 정의한 뒤 단계적으로 마이그레이션한다.

## 1. 기본 원칙

- URL은 리소스를 나타낸다.
- HTTP method는 동작을 나타낸다.
- 동사는 URL에 넣지 않는다.
- 단수 동작 endpoint보다 컬렉션/하위 리소스를 우선한다.
- 인증 필요한 API는 모든 route에서 동일하게 `validateApiAuth()` 또는 `requireApiUser()`를 사용한다.
- 응답은 항상 `ApiResponse<T>` 또는 `ApiErrorResponse`를 사용한다.
- 입력은 Zod schema로 검증한다.

## 2. 메서드 규칙

| Method   | 의미      | 규칙                           |
| -------- | --------- | ------------------------------ |
| `GET`    | 조회      | side effect 금지               |
| `POST`   | 생성      | 컬렉션에 새 리소스 생성        |
| `PATCH`  | 부분 수정 | 순서 변경, refresh 상태 변경   |
| `PUT`    | 전체 교체 | 전체 리소스 교체가 명확할 때   |
| `DELETE` | 삭제      | 단건 또는 query 없는 명확 삭제 |

batch 작업은 가능하면 body를 받는 collection 하위 route로 둔다.

## 3. 응답 규칙

성공:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-04-19T00:00:00.000Z"
}
```

실패:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "입력값을 확인해주세요."
  },
  "timestamp": "2026-04-19T00:00:00.000Z"
}
```

## 4. 오류 코드 기준

| HTTP | code               | 의미              |
| ---- | ------------------ | ----------------- |
| 400  | `INVALID_INPUT`    | 입력 검증 실패    |
| 401  | `UNAUTHORIZED`     | 로그인 필요       |
| 403  | `FORBIDDEN`        | 접근 권한 없음    |
| 404  | `NOT_FOUND`        | 리소스 없음       |
| 409  | `CONFLICT`         | 중복 또는 충돌    |
| 502  | `UPSTREAM_FAILED`  | 외부 API 실패     |
| 504  | `UPSTREAM_TIMEOUT` | 외부 API 타임아웃 |
| 500  | `INTERNAL_ERROR`   | 서버 내부 오류    |
| 500  | `DB_ERROR`         | DB 오류           |

## 5. 목표 리소스 구조

### Auth

Supabase Auth callback은 유지한다.

| Method | Route                | 설명           |
| ------ | -------------------- | -------------- |
| `GET`  | `/api/auth/callback` | OAuth callback |

### Stocks

저장 종목은 `/api/searches`, 저장 전 분석 미리보기는 `/api/stock-previews`, 외부 종목 검색은 `/api/stocks/search`, 키워드 오버레이용 주가 미리보기는 `/api/stocks/[ticker]`로 분리한다.

목표:

| Method | Route                      | 설명                         |
| ------ | -------------------------- | ---------------------------- |
| `GET`  | `/api/stocks/search?q=...` | 외부 ticker/company 검색     |
| `GET`  | `/api/stocks/[ticker]`     | 외부 종목 메타/주가 미리보기 |

### Stock Previews

저장 전 종목 분석은 임시 preview 리소스로 다룬다. preview 데이터는 Redis에 TTL 기반으로 보관하며, 저장 버튼을 누르면 `/api/searches`가 preview를 저장 종목으로 승격한다.

| Method | Route                 | 설명                             |
| ------ | --------------------- | -------------------------------- |
| `POST` | `/api/stock-previews` | ticker 수집 후 임시 preview 생성 |

### Saved Stock Searches

현재 `searches`는 저장된 종목 리소스다. 이름은 장기적으로 `saved-stocks` 또는 `watchlist-items`가 더 명확하지만, 기존 URL 호환을 고려해 먼저 내부 구조를 정리한다.

현재 유지:

| Method   | Route                | 설명                         |
| -------- | -------------------- | ---------------------------- |
| `GET`    | `/api/searches`      | 저장 종목 목록 조회          |
| `POST`   | `/api/searches`      | preview를 저장 종목으로 생성 |
| `GET`    | `/api/searches/[id]` | 저장 종목 상세 조회          |
| `DELETE` | `/api/searches/[id]` | 저장 종목 삭제               |

추후 검토:

| Method  | Route                          | 설명                    |
| ------- | ------------------------------ | ----------------------- |
| `PATCH` | `/api/searches/[id]`           | 메타 정보 수정          |
| `POST`  | `/api/searches/[id]/refreshes` | 데이터 재수집 요청 생성 |

### Trends

외부 Trends 수집은 provider로 이동한다. 외부 공개 API가 필요하면 preview endpoint만 둔다.

목표:

| Method | Route         | 설명                       |
| ------ | ------------- | -------------------------- |
| `GET`  | `/api/trends` | 키워드 트렌드 preview 조회 |

제거/내부화 대상:

- `/api/trends-internal`

### Keywords

목표 모델은 `keywords`와 `keyword_analysis`를 분리한다.
키워드 중복 판단은 `trim + 연속 공백 1개 축소` 기준으로만 수행한다. 대소문자, 언어, 내부 단어 구분은 사용자의 검색 의도로 보고 보존한다.

목표:

| Method   | Route                | 설명               |
| -------- | -------------------- | ------------------ |
| `GET`    | `/api/keywords`      | 키워드 목록 조회   |
| `POST`   | `/api/keywords`      | 키워드 생성/upsert |
| `GET`    | `/api/keywords/[id]` | 키워드 조회        |
| `DELETE` | `/api/keywords/[id]` | 키워드 삭제        |

legacy:

- 제거됨. 새 코드와 클라이언트는 `/api/keywords`만 사용한다.

### Keyword Analyses

조건 조합별 분석은 keyword의 하위 리소스로 표현한다.

프론트와 DB는 pytrends 값을 직접 저장하지 않고 내부 표준값을 저장한다. 예를 들어 `GLOBAL`, `5Y`, `WEB`처럼 대문자 값을 API에 전달하고, 서버는 `src/lib/parsers/trends-parsers.ts`에서 pytrends 요청값인 `''`, `today 5-y`, `''`로 변환한다. 프론트 옵션, API body/query, DB 저장값은 이 parser 입력값과 싱크를 맞춘다.

pytrends 조회 결과는 키워드 엔티티가 아니라 조회 결과 캐시로만 Redis에 저장한다. 캐시 키는 정규화된 키워드, region, period, search type, 완료된 전주 week key를 포함하며 기본 TTL은 24시간이다.

목표:

| Method   | Route                                | 설명                  |
| -------- | ------------------------------------ | --------------------- |
| `GET`    | `/api/keywords/[keywordId]/analyses` | 조건별 분석 목록/조회 |
| `POST`   | `/api/keywords/[keywordId]/analyses` | 분석 생성/upsert      |
| `GET`    | `/api/analyses/[analysisId]`         | 분석 상세 조회        |
| `PATCH`  | `/api/analyses/[analysisId]`         | 분석 메타/데이터 수정 |
| `DELETE` | `/api/analyses/[analysisId]`         | 분석 삭제             |

legacy:

- 제거됨. 새 코드와 클라이언트는 `/api/keywords/[keywordId]/analyses`, `/api/analyses/[analysisId]`만 사용한다.

### Analysis Overlays

오버레이는 반드시 analysis 하위 리소스다.
키워드 분석 오버레이는 저장 종목 리소스가 아니므로 `search_id`를 요구하지 않는다. 클라이언트는 실제 시장 데이터 검색 결과의 `ticker`, `companyName`, 필요 시 `currency`/`exchange`를 전달하고, 서버는 analysis 소유권과 `(analysisId, ticker)` 중복만 검증한다.

목표:

| Method   | Route                                      | 설명               |
| -------- | ------------------------------------------ | ------------------ |
| `GET`    | `/api/analyses/[analysisId]/overlays`      | 오버레이 목록 조회 |
| `POST`   | `/api/analyses/[analysisId]/overlays`      | 오버레이 추가      |
| `PATCH`  | `/api/analyses/[analysisId]/overlays`      | 오버레이 순서 수정 |
| `DELETE` | `/api/analyses/[analysisId]/overlays/[id]` | 오버레이 삭제      |

batch delete가 필요하면:

| Method | Route                                          | 설명              |
| ------ | ---------------------------------------------- | ----------------- |
| `POST` | `/api/analyses/[analysisId]/overlay-deletions` | 여러 개 삭제 요청 |

## 6. 금지 패턴

새 코드에서 금지:

- `/api/*/save`
- `/api/*/refresh`를 단순 action route로 추가
- `/api/*/batch-delete` 직접 추가
- route handler 안에서 외부 HTTP로 같은 앱의 internal route 호출
- route handler 안에서 큰 계산/정규화 로직 직접 작성
- Supabase 쿼리를 Client Component에서 직접 실행
- 실패를 빈 배열 성공 응답으로 숨기기

## 7. 단계적 마이그레이션 전략

1. 신형 RESTful route를 추가한다.
2. 프론트 사용처를 신형 route로 이동한다.
3. 모든 사용처가 사라지면 legacy route를 제거한다.
4. DB 테이블 제거는 별도 마이그레이션으로 다룬다.

## 8. 다음 작업의 기준

새 API 또는 리팩터링은 이 문서를 기준으로 한다. 예외가 필요하면 해당 route 파일 상단에 이유를 남기고 `docs/API_CONVENTIONS.md`도 갱신한다.

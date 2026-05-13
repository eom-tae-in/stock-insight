# StockInsight API Conventions

이 문서는 현재 StockInsight API가 따라야 하는 최소 규약을 정리한다.

목표는 “지금 코드와 맞는 규칙”을 유지하는 것이다. 미래 구조 제안은 이 문서에 길게 넣지 않는다.

## 1. 기본 원칙

- URL은 리소스 중심으로 유지한다.
- HTTP method는 동작을 나타낸다.
- 성공/실패 응답 형식은 일관되게 유지한다.
- 보호 API는 인증 실패 시 리다이렉트가 아니라 401 JSON을 반환한다.
- 입력 검증 실패와 외부 API 실패를 구분한다.
- 실패를 빈 배열 성공 응답으로 숨기지 않는다.

이 원칙의 목적은 클라이언트가 성공/실패를 추측하지 않게 하는 것이다. 특히 Trends나 Yahoo Finance 같은 외부 API 실패는 "결과가 비어 있음"과 의미가 다르므로 명시적인 실패 응답으로 전달한다.

## 2. 응답 형식

### 성공

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-04-24T00:00:00.000Z"
}
```

`timestamp`는 클라이언트 로그, 운영 대시보드, 사용자 문의 상황에서 응답 시점을 맞추기 위해 포함한다.

### 실패

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "입력값을 확인해주세요."
  },
  "timestamp": "2026-04-24T00:00:00.000Z"
}
```

프로덕션 응답에는 내부 exception message, secret, 외부 API 원문 오류를 그대로 노출하지 않는다. 사용자가 보는 `message`는 짧고 행동 가능해야 하며, 원인 분석에 필요한 상세는 서버 로그에 남긴다.

## 3. 주요 오류 코드

| HTTP | code                      | 의미                            |
| ---- | ------------------------- | ------------------------------- |
| 400  | `INVALID_INPUT`           | 입력 검증 실패                  |
| 401  | `UNAUTHORIZED`            | 로그인 필요 또는 내부 인증 실패 |
| 404  | `NOT_FOUND`               | 리소스 없음                     |
| 409  | `CONFLICT`                | 중복 또는 충돌                  |
| 500  | `DB_ERROR`                | DB 처리 오류                    |
| 500  | `SERVER_ERROR`            | 내부 서버 오류                  |
| 502  | `TRENDS_FETCH_FAILED`     | Trends 상위 수집 실패           |
| 502  | `PYTRENDS_REQUEST_FAILED` | pytrends 요청 실패              |
| 429  | `PYTRENDS_RATE_LIMIT`     | Google Trends rate limit        |

## 4. 인증 규칙

- 보호 API는 `validateApiAuth()` 또는 동일 수준의 인증 검증을 사용한다.
- 미들웨어는 보호 API 요청을 로그인 페이지로 보내지 않고 401 JSON으로 처리한다.
- 내부 전용 Python 엔드포인트 `/api/pytrends` 는 `x-internal-api-secret` 헤더를 사용한다.
- RLS는 데이터 접근의 최종 방어선이고, API auth는 빠른 실패 응답과 표준 오류 형식을 담당한다. 둘을 함께 유지한다.
- 관리자 API는 권한 없는 사용자에게 운영 경로 존재를 드러내지 않기 위해 404 스타일 응답을 사용할 수 있다.

## 5. 현재 핵심 API 분류

### 인증

- `GET /api/auth/callback`
- `GET /api/health`

### 종목

- `GET /api/stocks/search`
- `GET /api/stocks/[ticker]`
- `POST /api/stock-previews`
- `GET /api/searches`
- `POST /api/searches`
- `GET /api/searches/[id]`
- `DELETE /api/searches/[id]`
- `POST /api/searches/[id]/refreshes`

### 키워드

- `GET /api/trends`
- `GET|POST /api/trends-internal`
- `GET /api/keywords`
- `POST /api/keywords`
- `PATCH /api/keywords`
- `GET /api/keywords/[keywordId]`
- `DELETE /api/keywords/[keywordId]`
- `POST /api/keywords/[keywordId]/refreshes`
- `GET|POST /api/keywords/[keywordId]/analyses`
- `GET|POST|PATCH /api/keywords/[keywordId]/overlays`
- `DELETE /api/keywords/[keywordId]/overlays/[overlayId]`
- `POST /api/keywords/reorder`
- `POST /api/keyword-batch`

### 분석/오버레이 상세

- `GET|PATCH|DELETE /api/analyses/[analysisId]`
- `POST /api/analyses/[analysisId]/refreshes`
- `GET|POST|PATCH /api/analyses/[analysisId]/overlays`
- `DELETE /api/analyses/[analysisId]/overlays/[overlayId]`
- `POST /api/analyses/[analysisId]/overlays/[overlayId]/refreshes`

## 6. 구현 규칙

- API route는 가능하면 다음 순서를 따른다.
  1. 인증
  2. 입력 확인
  3. 서비스/DB 호출
  4. 표준 응답 반환
- route 안에서 복잡한 계산을 길게 작성하지 않는다.
- 사용자가 보는 메시지는 짧고 행동 가능해야 한다.
- 내부 로그에는 민감한 secret을 남기지 않는다.

## 7. 예외

- 현재 Trends 경로는 구조상 Next 서버가 `/api/pytrends` 를 HTTP self-fetch 한다.
- 이건 일반 규칙으로 권장되는 패턴은 아니지만, 현재 배포 구조의 실제 동작 방식으로 유지 중이다.

새 예외가 생기면 이 문서에 짧게 추가한다.

# Trends 비동기 작업 계약

이슈 #18의 백엔드 구현 계약이다. 기존 Next API와 웹 인증은 아직 이 API로
전환하지 않았다. 워커 공급자는 `fixture-v1`이며 실제 Google Trends 수집이 아니다.
아래 계약의 실제 PostgreSQL·RabbitMQ·OIDC 연동 검증은 완료 전까지 별도로 기록한다.

## HTTP API

Gateway의 `/api/v1/analysis/trends/jobs`를 사용한다. Gateway와 서비스가
OIDC 토큰을 검증하고, 서비스는 토큰의 issuer와 subject를 소유자로 사용한다.
사용자 식별자를 요청 본문으로 받지 않는다. 타인 작업과 삭제된 작업은 404다.

| 메서드와 경로                                    | 동작                                        | 정상 응답 |
| ------------------------------------------------ | ------------------------------------------- | --------- |
| `POST /api/v1/analysis/trends/jobs`              | 작업 생성 또는 동일 조건의 활성 작업 재사용 | 202       |
| `GET /api/v1/analysis/trends/jobs/{id}`          | 소유자 작업 조회                            | 200       |
| `POST /api/v1/analysis/trends/jobs/{id}/refresh` | generation 증가 및 재수집 요청              | 202       |
| `DELETE /api/v1/analysis/trends/jobs/{id}`       | tombstone 저장 및 결과 제거                 | 204       |

생성과 갱신은 `Idempotency-Key` 헤더가 필수다. 영문자·숫자·밑줄·하이픈으로
구성된 1~100자 문자열을 사용한다. 같은 소유자의 같은 키를 다른 입력이나
다른 작업에 재사용하면 409다. 생성 입력의 지문에는 UTC 완료 주가 포함되어
다음 주에 같은 키를 재사용하면 409다. 새로운 의도에는 새로운 키를 사용한다.
같은 조건의 활성 작업은 다른 키로 요청해도 재사용한다. 소유자별 활성 작업은
최대 다섯 개이며 초과 시 429다. 이미 다른 동일 조건 작업이 활성 상태인
경우 기존 작업 갱신은 409다.

생성 요청 본문:

```json
{ "keyword": "coffee", "geo": "", "timeframe": "today 5-y", "gprop": "" }
```

keyword는 공백 정규화 후 저장한다. geo는 빈 문자열 또는 대문자 국가 코드
두 글자다. 첫 계약 버전의 timeframe은 `today 5-y`만 허용한다.
gprop은 빈 문자열, youtube, images, news, froogle 중 하나다.
응답은 id, generation, state, query, requestedAt, deadline, points,
errorCode, provider를 포함한다. 완료 전 points는 비어 있다.

## 상태와 메시지

상태는 PENDING → RUNNING → SUCCEEDED 또는 FAILED다. 완료 이벤트가 먼저
도착하면 PENDING에서 바로 완료할 수 있다. 요청으로부터 300초가 deadline이며
조회 시 또는 5초 간격 만료 처리로 FAILED/DEADLINE_EXCEEDED가 된다.
갱신은 동일 id의 generation과 correlationId를 변경하고 결과를 초기화한다.
삭제는 tombstone을 남겨 늦은 메시지가 데이터를 복원하지 못하게 한다.
공유 JSON 예시는 `services/contracts/trends-requested-v1.json`과
`services/contracts/trends-result-v1.json`이며 Java와 Python 계약 테스트가
모두 같은 파일을 읽는다.

durable 큐 `trends.requests.v1`과 `trends.results.v1`을 사용하며, 잘못된
메시지는 각각 `trends.requests.dlq`와 `trends.results.dlq`로 이동한다.
메시지는 persistent JSON이다. 계약 버전은 schemaVersion=1이다.
공통 식별자는 eventId, jobId, correlationId, generation, attempt다.
요청에는 requestedAt, deadline, completedWeek, query가 추가된다.
결과에는 kind(STARTED/SUCCEEDED/FAILED), provider, points, errorCode가 추가된다.
완료 주는 요청 시각의 UTC 기준 직전 완료 월요일이며 결과는 오름차순으로
중복 없이 정렬된 월요일 날짜와 0~100 정수 값이어야 한다.

작업과 outbox는 같은 DB 트랜잭션으로 저장한다. 릴레이는 publisher confirm과
라우팅 성공을 확인한 뒤 published_at을 기록한다. 응답이 모호하면 같은
eventId로 다시 발행될 수 있다. 워커는 결과 발행 confirm 후 요청을 ACK한다.
결과 소비자는 inbox 중복 판정과 상태 저장 트랜잭션이 완료된 뒤 ACK한다.
다른 generation/correlationId, 완료·삭제·만료 작업의 결과는 반영하지 않는다.
이는 중복 결과 반영을 막으며 외부 공급자 호출의 exactly-once를 보장하지 않는다.

## 공급자와 수동 검증

워커는 `TRENDS_PROVIDER=fixture`에서만 실행된다. fixture는 완료 주까지
65주 데이터를 생성한다. `fixture:no-data`는 NO_DATA,
`fixture:failure`는 PROVIDER_FAILED를 반환한다. 결과 provider를 확인해
fixture 데이터를 실제 공급자 데이터로 표시하지 않는다. 실제 Google 수집,
429 재시도 및 캐시 정책은 이 fixture 구현으로 검증되었다고 주장하지 않는다.

```sh
cd services
./gradlew --no-daemon :analysis-service:test :analysis-service:bootJar
cd trends-worker
uv sync --frozen
uv run ruff check
uv run basedpyright
uv run pytest
```

CI/CD는 사용자 요청으로 제거되어 위 명령은 수동 검증이다. 단위 검증 성공은
실제 broker·DB·OIDC 연동 성공을 의미하지 않는다. 기존 PostgreSQL 볼륨은
초기화 스크립트가 재실행되지 않으므로 새 migration 역할을 준비하지 않은
상태에서 시작하면 안 된다. 로컬 업그레이드 SQL과 dry-run 절차는
`infra/local/README.md`에 있다. 실제 연동 및 업그레이드 실행 검증이
완료되기 전에는 운영에 적용하지 않는다.

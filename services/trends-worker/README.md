# Trends 워커

analysis-service 요청 메시지를 처리하고 결과 이벤트를 발행한다. DB 접근
권한은 없으며 사용자 토큰이나 소유자 식별자를 메시지로 받지 않는다.
현재 구현은 명시적 fixture 공급자만 지원한다. 실제 Google Trends 수집,
외부 공급자 429 재시도와 캐시는 아직 구현하지 않았다.

Python 3.13과 uv를 사용한다. 로컬 검증:

```sh
uv sync --frozen
uv run ruff check
uv run basedpyright
uv run pytest
```

실행은 `infra/local/compose.yml`의 `trends-worker`를 사용하는 것이 기본이다.
컨테이너는 non-root로 실행하고 broker에 연결한다. 이미 준비된 로컬
RabbitMQ에 수동으로 연결할 경우 워커 디렉터리에서 다음 명령을 사용한다.
`RABBITMQ_URL`은 환경에서 주입하며 이 값을 로그나 커밋에 포함하지 않는다.

```sh
TRENDS_PROVIDER=fixture PYTHONPATH=src uv run python -m trends_worker
```

prefetch는 1이고 durable 큐와 persistent JSON을 사용한다. publisher confirm을
설정한 뒤 STARTED와 완료/실패 결과를 발행한다. 두 발행 모두 성공한 뒤
원본 요청을 ACK한다. confirm 실패는 프로세스로 전파하며 ACK하지 않는다.
broker 연결이 닫히면 미확인 메시지는 재전달될 수 있다. eventId는 작업 id,
generation, 결과 종류로 결정되므로 Java inbox가 중복 결과를 판정할 수 있다.
잘못된 JSON과 계약 위반 메시지는 requeue 없이 reject하여 DLQ로 이동한다.

Compose의 프로세스 재시작은 최대 세 번이다. 기한이 지난 요청은
DEADLINE_EXCEEDED로 실패한다. 지속적인 연결 실패나 DLQ는 broker 복구,
메시지 원인 확인 후 수동으로 처리해야 한다. DLQ를 무조건 원래 큐로
재발행하지 않는다. DB 만료 처리와 generation/tombstone 검증으로 과거 결과가
최신 결과를 덮지 못하게 한다.

테스트의 RecordingChannel은 confirm 실패 시 ACK하지 않는 코드 경로를
검증하는 fake다. 실제 broker의 persistence·재시작·재전달 검증을 대체하지
않는다. 계약 예시는 `../contracts/`, 상세 계약은
`../../docs/architecture/TRENDS_JOB_CONTRACT.md`에 있다.

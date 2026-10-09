# MSA migration status

## 2026-10-09 현재 범위: 디자인 우선 완료

UI-4는 PR #35로 squash 병합했다. 이슈 #36의 커스텀 차트 디자인은
PR #37로 squash 병합했다(`cfc3bd0b9b2e6ecdc4e6c66e9b4f25c7bc5cb631`). 브라우저 복구 검증 실패로 중단한 뒤
사용자 승인으로 검증의 버튼 ID 조회 순서를 수정했다. 현재 소스의8개 화면 조합,
98개 파일638개 테스트·타입·린트·포맷, OIDC 빌드·인증 브라우저 검증이 통과했다.
실제 MSA 검증은 아니다. 주 세션에서 최종 캡처·Figma·diff를 검토했으며
별도 에이전트의 독립 검토로 분류하지 않는다. 나머지 디자인 단계는 남아 있다.
실패·대응·최신 증거는 `docs/ui/UI5A_CUSTOM_CHARTS.md`를 따른다.
공통 규칙 최신화는 이슈 #39·PR #40으로 squash 병합했다
(`58255084e89d9e0963675d1495ea22222336aec8`). 자동 PR 작성·Closes 연결·
담당자와 라벨·원인 기반 재시도 최대2회·제공된 컨텍스트 사용률55% 중단을 명시했다.
현재 환경은 컨텍스트 사용률을 제공하지 않으며 수치를 만들지 않는다.
후속 이슈 #38의 편집·삭제·순서 변경 도구를 구현하고 사용자 지시로 검증을 재개했다.
기존 중단과 재개 후 첫 실패를 보존했다. KeyboardSensor 연결 시점과 smooth scroll
이동 중 상태를 관측하고 즉시 스크롤 및 브라우저 입력 순서를 적용했다.
임시 계측 제거 후 8개 화면 조합과99개 파일643개 테스트·타입·린트·포맷,
OIDC 빌드와 인증 브라우저 검증이 통과했다. 브라우저 최초 실패 뒤 차트 준비
검사 순서를 수정한 첫 재시도가 통과했다. 상세 증거와 남은 경고는 `docs/ui/UI5B_STOCK_EDIT.md`를 따른다.
이슈 #38은 PR #41로 squash 병합했고 자동으로 닫혔다
(`adeab27cb5ff154d7d7a62bd90b2b46fd6ea1b07`).
현재 이슈 #42·`feat/42/stock-list-design`은 목록 본체·표·모바일 행과 기준 주차를 적용한다.
담당자 eom-tae-in·enhancement 라벨을 지정했다. 기존 열린 #18·#34는 enhancement,
#24는 의미가 분명한 verification 라벨과 같은 담당자를 보완했다.
서버 인증·소유자 조회를 유지하고 저장된5년 분석의 종목 연결 관심도 요약만 추가한다.
SSR/client 메뉴 ID 불일치를 회귀 검사에서 발견해 기존 초기 렌더링 경계를 적용했고
첫 재시도 통과 후 최종 코드의 목록/편집 각8개 조합이 통과했다.
최종102개 파일653개 테스트·타입·린트·포맷·OIDC 빌드·인증 브라우저 검증도 통과했다.
캡처·실패·대응은 `docs/ui/UI5C_STOCK_LIST.md`를 따른다.
목록 필터·검색, 상세·조회 결과부터 UI-6~UI-10은 남아 있다.
UI-5~UI-10 디자인 전체는 아직 완료하지 않았다.

사용자는 본격적인 Spring/Eureka·클라우드 환경 구성 전에 디자인 부분을
마무리하도록 지시했다. 기존 서비스 틀을 유지하고 UI-4~UI-10을 순차 진행한다.
UI-3 PR #33은 squash 병합했다. UI-4 이슈 #34는 표시 규칙 순수 함수를 추가하며,
97개 파일631개 테스트·타입·린트·포맷과 OIDC 모드 빌드가 통과했다.
함수 구현을 실제 화면 연결이나 실제 데이터 수집 완료로 분류하지 않는다.
Docker 복구·실제 DB/broker/Keycloak 검증 보류와 기존 레거시 검증 면제는 유지한다.

## 웹 인증과 작업 화면: 이슈 #26

`feat/26/web-oidc-trends-jobs`는 OIDC 모드의 서버 Redis 세션과 Trends BFF,
작업 요청·폴링·샘플 차트·표·갱신·삭제 화면을 추가한다. 실행과 보안 경계,
기존 realm 설정 갱신 절차는 `WEB_OIDC_TRENDS.md`를 따른다.
기본 모드는 기존 경로이며 OIDC 모드는 기존 저장 API를 501로 차단한다.
계정·저장 데이터 이전 및 실제 Google 수집은 완료하지 않았다.

2026-10-08 수동 검증에서 타입·린트·포맷과 542개 테스트, OIDC 모드
프로덕션 빌드가 통과했다. 서명·state·nonce·PKCE·세션 만료·갱신 철회·
동시 갱신·로그아웃 경쟁은 독립 실제 Redis와 서명된 OIDC fixture로 확인했다.
실제 Chrome/Next/Redis 브라우저 검증에서 로그인·작업 완료·재분석·데이터
없음·폴링 중단·CSRF 거부·삭제·로그아웃·미인증 거부를 확인했다.
OIDC와 Gateway는 HTTP fixture이므로 실제 MSA E2E 통과가 아니다.

이전 브라우저 검증은 Supabase 초기화와 브라우저 미설치 때문에 두 번
실패했고, 복구 검증도 재분석의 이전 완료 문구를 즉시 읽어 세대 검사에
실패했다. 규칙대로 중단·보고한 뒤 사용자가 원인 기반 수정을 승인했다.
초기화 분기·설치된 Chrome·새 세대 응답을 기다리는 검증으로 해결했다.
React 정적 분석의 타이머 정리 오류는 단일 타이머와 중복 요청 방지 구조로
수정했다. 재검사 오류 0개이며 비동기 폴링·SSR 테마 초기화·차트 지연 로딩·
기존 링크와 Zod 호환 API 등에 관한 권고 경고는 별도 검토한다.
`npm audit`는 전체 의존성에서 42개를 보고하며 전체 보안 감사는 완료하지
않았다. Next.js는 직접 인증 검사와 함께 15.5.27 보안 패치를 적용했다.

Docker 실제 DB·브로커·Keycloak 검증은 사용자 지시대로 #24에 남긴다.
다음 기능 이관은 market-data 서비스의 주가 공급자/계산 호환성과 저장 기능이다.

## Scope and workflow

Source baseline: `6ee984024d1545d35377d3ae6214caf89b7badb1` on `develop`.
Stage 0 issue: https://github.com/eom-tae-in/stock-insight/issues/14
Stage 0 PR: https://github.com/eom-tae-in/stock-insight/pull/15
Squash merged to develop: `d5f21483beee2b94dca167e9bb2f5b9e697b54a4`.
Runtime foundation issue: https://github.com/eom-tae-in/stock-insight/issues/16
Runtime foundation PR: https://github.com/eom-tae-in/stock-insight/pull/17
Squash merged to develop: `d888e90db6ee57e6bf566e7ab4c6a912986a77a3`.
Legacy cleanup PR #20 was squash merged to develop (`a6e30a498b59bf944f98f36f960c4f252275d35b`).
Vercel cleanup issue #21 was closed by squash-merged PR #23
(`de1a71b860e5c9ffe2823db6c59ce98a5f2ab93f`).
Active issue: https://github.com/eom-tae-in/stock-insight/issues/18
Implementation branch: `feat/18/trends-job-pipeline`.
Trends backend delivery PR: https://github.com/eom-tae-in/stock-insight/pull/25
Deferred runtime verification: https://github.com/eom-tae-in/stock-insight/issues/24
Repository automation cleanup PR #22 was squash merged to develop
(`adaf86ca22444b50058f057d8d94edfbd6706b87`).
Trends backend implementation resumed after CI/CD and Vercel cleanup.

The user authorized database and configuration redesign, issue-first branches,
PRs to develop, and squash merge. Cloud deployment artifacts are in scope;
actual provisioning and production data changes remain unexecuted. Historical direction before the 2026-10-09 update:
the user replaced the original immediate-stop rule: after two verification failures,
investigate and apply the best evidence-backed fix autonomously; stop and report
only if verification of that recovery fix also fails.

## Trends backend implementation and verification

Job API, transactional outbox/inbox, generation/deletion guards, Flyway schema
and an explicit fixture-only Python consumer are implemented in delivery PR #25.
Live Google collection, web integration and runtime verification remain incomplete.
Java compilation initially failed on nested type annotations and a deprecated
AMQP confirm accessor; both corrected and second compilation passed.
Python typecheck initially failed with 12 errors; after correction its second
attempt failed with two unused queue-declaration return warnings. The original
stop rule was observed. The user authorized recovery and changed the rule above;
both queue declaration calls now explicitly discard their broker response.
Recovery verification passed: `uv run basedpyright` reports zero errors and
zero warnings. `uv run ruff check` also passes. The first pytest collection
failed because `request` is a reserved pytest fixture name; renaming the fixture
to `job_request` resolved it without weakening assertions. `uv run pytest`
now passes all seven tests. These checks ran locally on 2026-10-08.
Historical passes do not establish runtime verification of these new files.
On resuming issue #18, one request instant now determines the query key, deadline
and UTC completed week consistently, including requests crossing Monday midnight.
Polling also acquires the owner advisory lock used by other owner operations.
The Java analysis-service test/bootJar command passed with 13 tests, zero skipped,
zero failures and zero errors. Tests cover stale/deleted/terminal/expired results,
correlation mismatch, result-series validation and the UTC week boundary.
HTTP and message behavior is documented in `TRENDS_JOB_CONTRACT.md`.
Issue #18's body now uses Korean and reflects manual checks and the current
failure-recovery and commit conventions.
Runtime recovery remains blocked. On 2026-10-08 the host had 18 GiB available,
but Docker's Unix socket `_ping` timed out after five seconds with no response.
The installed host PostgreSQL 14 binary also cannot start: the ICU 74 dylib it
links to is absent (the installed ICU is version 78). No host database was changed.
A volume-preserving `docker desktop restart --timeout 45` was attempted; it did
not report completion, and a subsequent bounded `_ping` again timed out.
The waiting CLI was interrupted; this does not prove the Desktop restart was
cancelled or completed. No Docker volumes were deleted or reset. Development and
further recovery retries stopped under the user's recovery-then-stop rule.
Next resolution: inspect Docker Desktop's engine diagnostics and confirm a
successful non-destructive engine restart before running isolated runtime tests;
alternatively use a healthy isolated Docker host for manual tests. Do not claim
PostgreSQL/RabbitMQ/OIDC ownership or consumer integration passes from unit tests.
At the initial recovery stop, issue #18 remained uncommitted and unmerged;
no PR had yet been opened for the incomplete runtime increment.
At the user's request, one further engine check was attempted on 2026-10-08:
`curl --silent --show-error --max-time 5 --unix-socket
/Users/taein/.docker/run/docker.sock http://localhost/_ping` exited 28 after
five seconds without receiving a response. The engine still cannot be verified
as ready; Compose startup was not attempted. The user instructed deferring
further recovery if this retry failed, so runtime recovery remains deferred.

The user subsequently authorized skipping this PC's Docker blocker and continuing
development. No engine retry was made after that direction. Shared Java/Python
wire fixtures, service idempotency tests, MVC input-validation tests and worker
ACK-order tests were added. Latest verification on 2026-10-08:

| Verification                                               | Result   | Evidence and limit                                                                  |
| ---------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `./gradlew --no-daemon build` with Java 21                 | PASS     | Four service executables; analysis tests: 25, skipped: 0, failures: 0               |
| `uv run ruff check`                                        | PASS     | Worker and test lint                                                                |
| `uv run basedpyright`                                      | PASS     | Zero errors and warnings                                                            |
| `uv run pytest`                                            | PASS     | 14 tests: fixture processing, shared wire contracts, ACK behavior, provider refusal |
| `docker compose -f infra/local/compose.yml config --quiet` | PASS     | Configuration parsing only; no engine startup                                       |
| `sh -n infra/local/init-db.sh`                             | PASS     | Shell syntax only; no database execution                                            |
| PostgreSQL/RabbitMQ/OIDC job integration                   | DEFERRED | User waived this local blocker; follow-up issue #24                                 |
| Existing-volume role upgrade SQL execution                 | DEFERRED | Dry-run-by-default script and procedure added; needs real PostgreSQL                |

Self-review traced create/replay/conflict, refresh/generation, deletion/tombstone,
deadline expiry, outbox confirms and result transaction/ACK paths. Unit service
tests use a mocked repository, MVC tests use a fixture principal, and worker
consumer tests use RecordingChannel. None proves actual ownership SQL, JWT
verification or broker persistence. Real scenarios are tracked in
https://github.com/eom-tae-in/stock-insight/issues/24. Issue #18 stays open until
its remaining runtime acceptance criteria are observed; this increment can land
under the user's explicit local-runtime waiver. Live Google collection and web
cutover remain separate future increments. No CI/CD was recreated and GitHub
Actions permissions still report `enabled=false`.

Latest user direction: Supabase and Vercel will not be used. Their previous
Auth/hosting requirements are superseded. The user authorized proceeding
without fixing the legacy environment failures. Authentication replacement uses
the Keycloak/OIDC engineering direction in ADR-001. Legacy account mapping and
import feasibility still require validation. RAG is excluded.
Existing web authentication/hosting paths have not been cut over yet.

## Stage 1 in progress

- Java 21, Spring Boot 4.1.1, Spring Cloud 2025.1.3, Gradle Wrapper 8.14.3.
  Versions checked against official Spring compatibility/system requirements.
- Four Java applications compile and package successfully with warnings as errors.
  Current analysis unit/contract tests are recorded above; this is not evidence
  of full runtime behavior.
- Compose configuration and PostgreSQL init shell syntax checks pass.
- First `docker compose -f infra/local/compose.yml up -d --build` attempt FAIL:
  BuildKit cannot create its image ingest directory (`input/output error`).
  `df -h` reports the host data volume at 100%, with only 133 MiB available.
  Docker logs also report unreadable existing image metadata and unwritable
  `containerdmeta.db`; `docker system df` cannot read/write `snapshots.db`.
  Host space exhaustion is observed; Docker filesystem damage is not confirmed.
  Second attempt FAIL: containerd cannot create a temporary lease because
  `meta.db` writes return `input/output error`. Development stopped and both
  failures were reported. The user waived this local infrastructure blocker;
  replacement runtime verification will run in isolated GitHub Actions.
  Only this task's reproducible Java build directories were removed to recover
  host space after file writes failed. No Docker volumes or user data were removed.
  Local startup remains unverified. GitHub MSA Runtime run 37712814214 passed
  Java build, container startup and all eight OIDC/Gateway HTTP scenarios.
  Discovery routing, login, refresh, anonymous rejection and tampered-token
  rejection passed remotely. Business DB isolation was not exercised by these
  scenarios. Existing CI run 37712814168 also passed before PR #17 was merged.
- Trends fixture worker, jobs/outbox/inbox and the initial job Flyway migration
  are implemented. Live collection, actual new-job integration, Next auth cutover,
  legacy-data migration and cloud IaC remain incomplete. CI/CD stays removed.
- Stage 0 GitHub CI passed (run 37709736931). Legacy Vercel deployment passed;
  legacy Preview E2E was still running at merge and later failed (37709842315).
  It was not the migration gate; failure cause has not been investigated here.

## Observed baseline (2026-10-08)

- `npm run check`: PASS. Typecheck, lint, formatting, 84 Vitest files and 521 tests.
- `npm run test:integration`: PASS. Six files and 42 PostgreSQL container tests.
- `npm run test:e2e`: both attempts FAIL before browser scenarios start.
  The local web server fails in `src/lib/env.ts` because
  `NEXT_PUBLIC_SUPABASE_URL` is undefined. No local `.env.local` is present.
  Both returned exit code 1 with the same missing-URL error. Development was
  stopped at the second failure; the user subsequently waived fixing these
  legacy platform-dependent checks. No E2E scenario passed locally.
- `npm run build`: FAIL on its first attempt during prerender of `/set-password`:
  `Supabase URL is not configured.` Compilation and type validation succeeded,
  but this is not a successful production build.
- Runtime observed: Node 24.21.0, npm 11.19.0, Java 21, Docker server 29.4.3.
  Existing CI uses Node 20, so baseline environments are not identical.
- Existing GitHub develop Preview E2E run 37702587043 failed with five passed
  and five failed tests, including login navigation timeout. This is distinct
  from the local missing-environment failure and is not diagnosed as the same cause.

## Current architecture and ownership

| Current source                                     | Observed role                                                 | Migration destination                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/app/api`, SSR pages in `src/app/(app)`        | Authentication and business calls                             | Thin Next BFF and authenticated Gateway calls                                                      |
| `src/server/*-service.ts`                          | Saved stocks, keywords, analyses, overlays, ordering, refresh | analysis-service                                                                                   |
| `src/server/repositories/supabase-*.ts`            | Wired by runtime service factories                            | analysis-owned persistence                                                                         |
| `src/server/repositories/postgres-*.ts`            | Direct SQL implementations exercised by integration tests     | Reference for persistence port; not proof of runtime JDBC wiring                                   |
| `src/lib/services/stock-service.ts`                | Yahoo Finance Node collector                                  | market-data provider; Java adapter needs fixture parity first                                      |
| `src/server/cached-stock-service.ts`               | Five-year weekly stock Redis cache                            | market-data-service                                                                                |
| `src/server/trends-internal-service.ts`            | Redis, internal HTTP Python call, indicators, retries         | analysis job API plus worker; one retry budget                                                     |
| `api/pytrends.py`, `src/lib/get_trends.py`         | HTTP function and Python Trends collection                    | RabbitMQ trends-worker                                                                             |
| `src/lib/calculations.ts`, `src/lib/indicators.ts` | OHLC, MA13 and MA13-based YoY                                 | Golden compatibility fixtures before porting                                                       |
| `src/lib/supabase`, middleware, auth components    | Supabase Auth and SSR/session handling                        | Replace with OIDC session flow; forward verified access tokens; account migration decision pending |
| `src/server/admin-service.ts`                      | Read-only operational summary                                 | Authorized service API aggregation                                                                 |

Saved stock prices belong to analysis-service as saved snapshots; market-data
owns reusable public source data, not users' saved records. Keywords, analyses,
overlays, and their timeseries remain together with local foreign keys.
Analysis will additionally own jobs, outbox, inbox, generation, and idempotency.
Worker publishes results and cannot write analysis tables. Market and analysis
use isolated schemas/accounts without cross-service foreign keys or joins.

## Preservation checklist

All items below are requirements, not completed migration claims:

- Login, signup, password setting, callback, logout, SSR refresh and guest rules.
- Verified subject ownership on every saved entity and job; administrator access.
- Stock search, five-year weekly preview, explicit save, detail, refresh, delete.
- Keyword normalization, conditions, save, restore, sorting, and refresh.
- Analysis-specific overlays, normalized price, sorting, refresh and deletion.
- Chart/table views, currency, Excel and PNG downloads, health/admin reporting.
- UUIDs, owners, timestamps, display order, unique conditions and relationships.
- ISO week starts, completed weeks, missing data, rounding and numeric parity.
  Stock summary YoY currently falls back to zero; Trends/weekly YoY may be null.
  MA13 needs 13 observations; MA13-based 52-week YoY needs 65 observations.

## Planned increments

Stage 0 document verification: all 25 Next route paths/methods compared with the
inventory; PASS. Prettier initially flagged two documents; formatting corrected
and second check PASS. `git diff --check` and scripts ignore verification PASS.
Source runtime remains unchanged; this is not a passing replacement build/E2E.

0. Endpoint/auth/wiring inventory and DDD specification recorded in
   `DOMAIN_BOUNDARIES.md`; runtime/identity decisions in ADR-001. Review these
   documents, then PR and squash merge. No runtime change is claimed here.
1. Pin compatible official Spring versions; create service contracts, ADRs,
   isolated persistence, Gradle Wrapper, Dockerfiles, Compose and fixture profiles.
2. Implement Trends request -> transactional outbox -> RabbitMQ -> worker ->
   inbox/result transaction -> authorized job polling and chart display.
3. Verify Yahoo provider parity and move stock search/cache and saved operations.
4. Verify ownership, authentication, exports, migration dry-run and rollback.
5. Add observability, manual verification, minimal cloud IaC and recovery runbooks.

Each increment needs its own issue before its branch. Service shells, auth
diagnostics and fixture job APIs exist; saved business APIs remain unported. Do not classify
HTTP-mocked Playwright as full-stack MSA E2E.

## Next verification and prerequisite

Do not request Supabase credentials or rerun its failed baseline solely to
restore the old platform. Build the new container runtime and replacement auth
with isolated local fixtures and dedicated test accounts. Preserve useful tests
from `npm run check` and `npm run test:integration`. Replace the legacy build/E2E
environment as affected paths migrate, while keeping the failure evidence above.

The user superseded the previous cleanup scope: remove ALL CI/CD, including
MSA Runtime, and delete the Vercel project. Issue #21 removes the remaining
workflow and Playwright's platform bypass headers. GitHub Actions
is disabled for the entire repository (`actions/permissions.enabled = false`).
Legacy Preview run 37713291297 still displays queued. GitHub rejected normal
cancellation and force-cancellation (409: re-run has not yet queued). Do not
claim it was cancelled or retry cancellation without new evidence.
Keep test sources and manual commands; do not recreate automated workflows
without a new user instruction. Historical run 37713976094 passed 521 unit,
42 PostgreSQL integration and eight OIDC/Gateway scenarios before retirement.
After the user logged into Vercel, the project was matched to the repository:
team `eom-tae-ins-projects`, project `stock-insight`, ID
`prj_DzttC6D01h1O47XONaKMqjHP5GyT`, GitHub link `eom-tae-in/stock-insight`.
On 2026-10-08 the authorized project DELETE returned HTTP 204. A subsequent
complete team project listing confirmed its absence and that the unrelated
`doc-insight` project remains. The temporary `vercel.json` deployment opt-out
is now removed. No Vercel account, shared GitHub app installation or unrelated
project was deleted. Existing application source still has legacy runtime paths;
this cleanup retires deployments, not the remaining business/auth migration.
GitHub develop/prod rulesets were inspected: both contain deletion protection
only, with no required status checks. No required-check rule is bypassed.
Never classify removed checks as passing or call mocked HTTP tests full-stack.
Do not use the nonexistent `check-all` script from older docs.

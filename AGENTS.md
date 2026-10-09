# StockInsight development rules

## Authorized migration

Migrate the existing application to a cloud-ready monorepo containing Next.js,
Spring Cloud Eureka/Gateway, analysis-service, market-data-service, and a Python
Trends worker using RabbitMQ. Preserve product behavior. The user superseded
the original prompt's Supabase Auth and Vercel hosting requirements: neither
platform is a target dependency. Replacement authentication and account
migration must be explicitly designed; do not silently drop access controls.
RAG is outside this migration's scope. Use DDD bounded contexts and business
invariants for service ownership; infrastructure and workers are not contexts.
Database schemas and application configuration may be redesigned. Preserve
existing data through explicit migration, comparison, cutover, and rollback.
Do not execute production migrations, paid cloud provisioning, or DNS changes
without explicit authorization for those operations.

## GitHub workflow

- Create a GitHub issue before creating each development branch.
- Use `feat/<issue-number>/<short-task-name>` for development branches.
- Open PRs against `develop`; `dev` in conversation means `develop`.
- 작업 범위의 구현과 필요한 검증이 끝나면 추가 확인을 기다리지 않고 PR을 작성한다.
  PR 본문에 `Closes #<작업 이슈 번호>`를 넣어 병합 시 작업 이슈가 닫히도록 연결한다.
  PR 작성만으로 이슈를 먼저 닫지 않는다. 검증 실패·미완료 작업을 완료로 표시하지 않는다.
- 이슈와 PR을 생성할 때 모두 담당자와 작업 목적에 맞는 라벨을 지정한다.
  담당자가 별도로 정해지지 않으면 해당 저장소에 권한이 있는 현재 GitHub 계정을 사용한다.
  기존 라벨의 의미를 확인해 선택하고, 맞는 라벨이 없으면 의미가 분명한 라벨을 만든다.
  기존에 진행 중인 작업의 누락된 담당자·라벨도 채운다.
- Merge only with squash merge after required checks pass. Do not bypass checks.
- 일반 개발 커밋 제목은 `type: 한글 요약`으로 작성한다.
  예: `feat: 게시판 기능 구현`. 타입은 feat, fix, chore, docs, test,
  refactor 등 변경 목적에 맞는 소문자를 사용한다. 커밋 본문을 작성할
  경우에도 한글로 작성한다. 코드 식별자와 명령어는 원문을 유지한다.
- 이슈와 PR 제목은 반드시 `[TYPE] 한글 요약`으로 작성한다.
  예: `[CHORE] 전체 GitHub CI/CD와 Vercel 배포 연결 제거`.
  TYPE은 FEATURE, FIX, CHORE, DOCS, TEST, REFACTOR 등 변경 목적에
  맞는 대문자를 사용한다. 이슈와 PR 본문은 한글로 작성하며 문제,
  변경 범위, 검증 결과와 남은 사항을 실제 확인한 내용으로 기록한다.
- Squash merge 커밋 제목은 `[TYPE] 한글 요약(#PR번호)`로 명시적으로
  지정한다. 병합 시점의 PR 제목 뒤에 실제 PR 번호를 공백 없이 붙인다.
  예: `[CHORE] 전체 GitHub CI/CD와 Vercel 배포 연결 제거(#23)`.
  이슈 번호가 아닌 PR 번호를 사용한다. 이슈와 PR 제목에는 이 접미사를
  붙이지 않는다.
  Squash 커밋 본문도 한글로 작성하고, 영문 개발 커밋 목록이 기본
  본문으로 들어가지 않도록 병합 시 제목과 본문을 직접 지정한다.
  일반 개발 커밋의 `type: 한글 요약` 규칙과 혼용하지 않는다.
- Keep local `scripts/` ignored. Do not commit credentials or local prompts.
- The user requested removing every CI/CD workflow, including MSA Runtime,
  and disabling GitHub Actions for this repository. Do not recreate or enable
  automated workflows without a new user instruction. Keep manual test commands.

## Execution checkpoints and verification recovery

2026-10-09 사용자의 최신 지시로 기존 복구 후 중단 기준을 아래 규칙으로 대체한다.
작업 도중의 정기 중단 기준은 다음 두 가지이며, 그 외에는 승인된 범위를 계속 진행한다.
작업 완료에 따른 결과 보고와 기존 보안·파괴적 작업의 승인 경계는 유지한다.

- 같은 테스트·검증의 최초 실행이 실패하면 원인을 조사하고 근거 있는 최소 수정 후
  재시도한다. 최초 실행은 재시도0회이며 재시도는 최대2회다.
  재시도2회 후에도 실패하면 추가 개발·실행을 멈추고 정확한 명령·시도별 실패·
  확인한 원인과 미확정 가설·적용한 수정·남은 오류·다음 해결 방법을 보고한다.
  재시도가 통과하면 작업을 계속한다. 명령 이름을 바꾸거나 같은 검증을 쪼개
  실패 횟수를 숨기지 않는다. 원인 조사만 하는 읽기·계측은 검증 재시도와 구분한다.
  사용자가 중단된 작업의 재개를 지시하면 새 실행 구간의 재시도 횟수를0으로
  시작하되 이전 실패와 복구 기록은 보존한다.
- 도구나 실행 환경이 제공한 컨텍스트 사용량이55% 이상이면 새 작업을 시작하지 않고
  진행 상태·변경 파일·이슈/PR·검증 증거·남은 문제와 다음 작업을 기록한 뒤 멈춘다.
  해당 실행에서 생성한 서버·브라우저 등은 안전하게 정리한다.
  사용률이 제공되지 않으면 확인 불가로 기록하며 임의의 수치나 도달 여부를 만들지 않는다.

근거 없는 반복 실행·검사 완화·가짜 자격 증명은 금지한다. 실패·보류·통과를
구분하고 미커밋 파일과 미병합 PR을 그대로 보고한다. 단지 한 단계가 끝났다는
이유로 추가 확인을 요구하거나 멈추지 말고 다음 승인된 작업을 이어간다.

The user authorized continuing past the legacy Supabase/Vercel baseline failures
without repairing or repeating those checks. Record them as failed legacy
checks, never as passing. Keep useful calculation, ownership, and data tests;
add replacement build, authentication, and full-stack checks for the new runtime.
The retry limit above applies to replacement verifications.

The user also waived the two local Docker startup failures caused by host disk
exhaustion. GitHub Actions was subsequently disabled at the user's request.
Record historical remote passes separately from new, unexecuted runtime checks;
do not retry the broken local Docker environment or claim a new runtime pass.
The retry limit above applies to manual replacement verifications.

On 2026-10-08 the user explicitly deferred the unresponsive local Docker engine
and authorized continuing development. Do not retry Docker recovery without new
direction. Record new DB/broker/OIDC runtime checks as deferred, not passing;
retain their acceptance criteria as follow-up work. Available compilation,
lint, type and unit/contract checks still apply. This waiver does not permit
production deployment or classify the fixture backend as a complete migration.

## Continuity

Read `docs/architecture/MIGRATION_STATUS.md` before resuming the migration.
Record implementation separately from verified behavior. Existing TypeScript
calculation results are the compatibility oracle for Java/Python ports.

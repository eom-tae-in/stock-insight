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

## Verification failure recovery

If the same test or verification fails twice, investigate the root cause
autonomously and choose the smallest evidence-backed fix. Apply that fix and
run the affected verification again. If this recovery verification still fails,
stop development and further retries, then report the exact commands, original
failures, diagnosed cause, applied fix, remaining error and next resolution.
Do not perform blind retries, hide failure counts, weaken checks or invent
credentials. Security boundaries and destructive-operation authorization still
apply. Preserve work and report uncommitted files and unmerged PRs honestly.

The user authorized continuing past the legacy Supabase/Vercel baseline failures
without repairing or repeating those checks. Record them as failed legacy
checks, never as passing. Keep useful calculation, ownership, and data tests;
add replacement build, authentication, and full-stack checks for the new runtime.
The recovery-then-stop rule applies to replacement verifications.

The user also waived the two local Docker startup failures caused by host disk
exhaustion. GitHub Actions was subsequently disabled at the user's request.
Record historical remote passes separately from new, unexecuted runtime checks;
do not retry the broken local Docker environment or claim a new runtime pass.
The recovery-then-stop rule applies to manual replacement verifications.

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

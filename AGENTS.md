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
- Keep local `scripts/` ignored. Do not commit credentials or local prompts.

## Verification failure limit

If the same test or verification fails on its second attempt, stop development
and further retries immediately. Report the exact command, both outcomes,
evidence for the cause, unresolved uncertainty, and a concrete resolution with
the command to verify it. Do not weaken tests or invent credentials to pass.
Preserve the work and report uncommitted files and unmerged PRs honestly.

The user authorized continuing past the legacy Supabase/Vercel baseline failures
without repairing or repeating those checks. Record them as failed legacy
checks, never as passing. Keep useful calculation, ownership, and data tests;
add replacement build, authentication, and full-stack checks for the new runtime.
The two-failure stop rule still applies to the replacement verifications.

The user also waived the two local Docker startup failures caused by host disk
exhaustion. Validate the new container runtime in isolated GitHub Actions;
record local startup as failed, not passed. New CI failures retain the limit.

## Continuity

Read `docs/architecture/MIGRATION_STATUS.md` before resuming the migration.
Record implementation separately from verified behavior. Existing TypeScript
calculation results are the compatibility oracle for Java/Python ports.

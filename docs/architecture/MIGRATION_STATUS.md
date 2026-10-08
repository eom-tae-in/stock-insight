# MSA migration status

## Scope and workflow

Source baseline: `6ee984024d1545d35377d3ae6214caf89b7badb1` on `develop`.
Stage 0 issue: https://github.com/eom-tae-in/stock-insight/issues/14
Stage 0 PR: https://github.com/eom-tae-in/stock-insight/pull/15
Squash merged to develop: `d5f21483beee2b94dca167e9bb2f5b9e697b54a4`.
Runtime foundation issue: https://github.com/eom-tae-in/stock-insight/issues/16
Runtime foundation PR: https://github.com/eom-tae-in/stock-insight/pull/17
Squash merged to develop: `d888e90db6ee57e6bf566e7ab4c6a912986a77a3`.
Active cleanup issue: https://github.com/eom-tae-in/stock-insight/issues/19
Working branch: `feat/19/remove-legacy-ci`.
Trends backend issue #18 and branch `feat/18/trends-job-pipeline` are paused
before implementation while retiring legacy CI/CD, as the user requested.

The user authorized database and configuration redesign, issue-first branches,
PRs to develop, and squash merge. Cloud deployment artifacts are in scope;
actual provisioning and production data changes remain unexecuted. Two failures
of the same verification require stopping and reporting before continuing.

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
  This build has no Java test source yet and is not evidence of runtime behavior.
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
- Trends worker, jobs/outbox/inbox, business migration, Next auth cutover,
  replacement CI and cloud IaC are not implemented.
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
5. Add observability, CI, minimal cloud IaC and operational recovery runbooks.

Each increment needs its own issue before its branch. Service shells and auth
diagnostics exist; business APIs are not implemented yet. Do not classify
HTTP-mocked Playwright as full-stack MSA E2E.

## Next verification and prerequisite

Do not request Supabase credentials or rerun its failed baseline solely to
restore the old platform. Build the new container runtime and replacement auth
with isolated local fixtures and dedicated test accounts. Preserve useful tests
from `npm run check` and `npm run test:integration`. Replace the legacy build/E2E
environment as affected paths migrate, while keeping the failure evidence above.

The user explicitly requested retiring the legacy CI/CD before further migration.
Issue #19 removes the Supabase-dependent CI and Vercel deployment-status Preview
E2E workflows. Useful lint/typecheck/unit/PostgreSQL integration checks move to
MSA Runtime; the legacy web build and platform Preview E2E are retired, not passed.
`vercel.json` contains only the automatic Git deployment opt-out, so the installed
Vercel GitHub app cannot trigger new automatic deployments from these commits.
The external Vercel project/app itself is not deleted. Manual deployment and
previously created deployments are outside this repository switch.
GitHub develop/prod rulesets were inspected: both contain deletion protection
only, with no required status checks. No required-check rule is bypassed.
Never classify removed checks as passing or call mocked HTTP tests full-stack.
Do not use the nonexistent `check-all` script from older docs.

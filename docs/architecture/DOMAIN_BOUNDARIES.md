# Domain boundaries and migration inventory

Status: implementation specification, not implemented services.
Source: develop `6ee984024d1545d35377d3ae6214caf89b7badb1`.
Supabase and Vercel are removal targets; RAG is excluded.

## Language and bounded contexts

| Term          | Business meaning and invariant                                               |
| ------------- | ---------------------------------------------------------------------------- |
| Saved stock   | Owner's explicitly saved ticker and price snapshot; one ticker per owner     |
| Keyword       | Owner's normalized name, distinct from conditions and results                |
| Analysis      | One keyword/region/period/search-type combination; currently five years only |
| Overlay       | Ticker comparison belonging to an analysis, not every condition of a keyword |
| Source series | Public data reusable across owners; reuse grants no saved-result access      |
| Generation    | Monotonic version rejecting stale refresh results                            |
| Job           | Owner-authorized request with deadline, bounded attempts and terminal state  |
| Principal     | Verified issuer/subject mapped to a stable application owner UUID            |

Analysis Management is the core context: saved stocks, keywords, analyses,
overlays, snapshots, ordering, jobs and result acceptance. Market Data is a
supporting context: ticker search, provider adaptation and normalized source
series. Identity and Access is generic and implemented by an OIDC server;
business authorization remains in the owning service.

Next web is presentation/BFF. Eureka and Gateway are routing infrastructure.
Python worker is an execution adapter, not a new user-data context. Redis and
RabbitMQ are infrastructure. Do not create services for tables or indicators.

Context relationships use published HTTP/event contracts. Analysis consumes
Market through a provider adapter (anti-corruption layer) and owns saved
snapshots. Both business services consume verified OIDC identity through an
identity adapter. Workers publish results without database access or bearer
tokens in messages. Admin aggregates APIs, not cross-service database joins.

## Aggregates and local transactions

| Aggregate or command | Invariant and transaction                                                           |
| -------------------- | ----------------------------------------------------------------------------------- |
| SavedStock           | Owner/ticker uniqueness; metadata and price snapshot committed together             |
| Keyword              | Owner/normalized-name uniqueness; preserve whitespace normalization                 |
| KeywordAnalysis      | Keyword ownership, unique conditions, generation and result snapshot                |
| Overlay              | Analysis parent, analysis/ticker uniqueness, timeseries and refreshed timestamp     |
| Register job         | Validate ownership/idempotency/active constraint, then job and outbox in one commit |
| Accept result        | Inbox dedupe, generation check, result and job state in one commit                  |
| Reorder              | Validate every owner/parent before atomic ordering updates                          |
| Delete               | Invalidate generation/cancel jobs and cascade local children atomically             |

Reference other aggregates by ID. One analysis service/database does not imply
one unbounded ORM object graph. Ordering/deletion may coordinate local aggregates
transactionally. Keep cancellation/tombstone evidence until messages expire so a
late result cannot recreate deleted data.

## Data ownership

The `analysis` schema owns application owners and verified identity mappings,
saved stocks/prices, keywords/analyses, overlays/timeseries, jobs, outbox and
inbox. Market owns durable provider metadata if needed; Redis is not a permanent
result store. OIDC uses a separate database/account. Runtime roles cannot access
other services' schemas; migration credentials are separate. No cross-service FK.

Owner UUID is independent of subject format. Preserve imported owner IDs and
uniquely map `(issuer, subject)` through verified login or validated migration,
never email-only matching. Do not replay Supabase `auth.users` FKs or platform
roles/functions into the target. Migration requires dry-run counts, ownership,
UUID/relation/sample comparisons, backup, write cutover and rollback. No production
operation is executed by this specification.

## Endpoint migration inventory

Methods were read from route implementations. Business routes are protected by
middleware, often with route-level user checks too. Preserve protected API 401
JSON and page login redirects. Names below are source compatibility paths, not
a mandate to duplicate them in the new versioned API.

| Existing path                                               | Methods            | Target responsibility                                                           |
| ----------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `/api/stock-data`                                           | GET                | Market weekly series, synchronous preview                                       |
| `/api/stocks/search`                                        | GET                | Market candidates plus Analysis saved suggestions through composition           |
| `/api/stocks/[ticker]`                                      | GET                | Market series adapted to overlay date/price                                     |
| `/api/searches`                                             | GET, POST          | Analysis saved stocks; legacy priceData adapter then versioned result reference |
| `/api/searches/[id]`                                        | GET, DELETE        | Analysis owner-scoped detail/delete                                             |
| `/api/searches/[id]/refreshes`                              | POST               | Analysis refresh consuming Market results                                       |
| `/api/trends`                                               | GET                | Legacy lookup replaced by explicit versioned job contract and UI polling        |
| `/api/trends-internal`                                      | GET, POST          | Retire HTTP self-fetch after worker cutover                                     |
| `/api/keyword-batch`                                        | POST               | Bounded Analysis/Market composition, preserve partial success                   |
| `/api/keywords`                                             | GET, POST, PATCH   | Analysis list/create/rename including initial analysis creation                 |
| `/api/keywords/[keywordId]`                                 | GET, DELETE        | Analysis owner-scoped detail/delete                                             |
| `/api/keywords/reorder`                                     | PATCH              | Analysis atomic owner ordering                                                  |
| `/api/keywords/[keywordId]/refreshes`                       | POST               | Analysis refresh orchestration                                                  |
| `/api/keywords/[keywordId]/analyses`                        | GET, POST          | Analysis condition list/detail/create                                           |
| `/api/keywords/[keywordId]/overlays`                        | GET, POST, PATCH   | Analysis compatibility adapter validating resolved condition/parent             |
| `/api/keywords/[keywordId]/overlays/[overlayId]`            | DELETE             | Analysis owner/parent-scoped delete                                             |
| `/api/analyses/[analysisId]`                                | GET, PATCH, DELETE | Analysis detail/update/delete                                                   |
| `/api/analyses/reorder`                                     | PATCH              | Analysis atomic condition ordering                                              |
| `/api/analyses/[analysisId]/refreshes`                      | POST               | Analysis generation-guarded refresh                                             |
| `/api/analyses/[analysisId]/overlays`                       | GET, POST, PATCH   | Analysis list/create/order overlays                                             |
| `/api/analyses/[analysisId]/overlays/[overlayId]`           | DELETE             | Analysis owner/parent delete                                                    |
| `/api/analyses/[analysisId]/overlays/[overlayId]/refreshes` | POST               | Analysis refresh with Market results                                            |
| `/api/admin/summary`                                        | GET                | Authorized service API aggregation, preserve concealed unauthorized policy      |
| `/api/health`                                               | GET                | Separate liveness/readiness with redacted details                               |
| `/api/auth/callback`                                        | GET                | OIDC callback with state/nonce/PKCE validation                                  |
| `/api/pytrends` (Python Function)                           | POST               | Retire after RabbitMQ worker cutover                                            |

Keep current envelopes from `src/lib/api-helpers.ts`. Do not silently change a
200 data response to a 202 job. New job API includes state, result/error, attempt
and deadline. Validate mapped owner on every entity/job access.

## SSR, authentication and collection

Saved stock list/detail/table, keyword list/detail/overlay detail, and admin SSR
pages directly call business services. Stock preview/table SSR fetch provider
data directly. Migrate these to Gateway calls too; relocating routes alone is
insufficient. New/search keyword pages also read the user. Replace middleware,
callback, login/signup, password setting, user menu and browser/server clients
with OIDC session handling, preserving user navigation and role behavior.

Java cannot import Node's `yahoo-finance2`. Verify a Java adapter against source
fixtures or temporarily isolate the existing Node provider with removal criteria.
Stock cache keys include ticker/5Y/1wk/completed week; Trends encode keyword/geo/
timeframe/gprop/completed week. Add explicit calculation version without conflating
provider conditions. Bound concurrent external calls when Redis is unavailable.

Current ISO week logic uses local date-fns week starts and excludes the current
week. Specify the target timezone and verify boundaries. MA13 needs 13 samples,
MA13-based 52-week YoY needs 65; values round to two decimals. Stock summary
fallback is zero while weekly/Trends YoY can be null. Golden fixtures must cover
missing/zero values, denominators, OHLC, normalized prices and rounding.

Baseline evidence: [MIGRATION_STATUS.md](./MIGRATION_STATUS.md). Target services
are not implemented yet; configuration skeletons and mock-only browser tests
cannot count as full-stack migration completion.

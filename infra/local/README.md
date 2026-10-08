# Local MSA runtime (in development)

This is a local fixture environment, not a production deployment. It does not
use Supabase or Vercel. The existing Next web has not yet switched to this API.
Known sample passwords are for isolated local development only. Do not publish
this Compose file or its test realm to the public internet.

## Build and start

Install Java 21 and Docker Compose. From the repository root:

```sh
cd services
./gradlew --no-daemon build
cd ..
docker compose -f infra/local/compose.yml up -d --build
docker compose -f infra/local/compose.yml ps
```

Set `JAVA_HOME` to a Java 21 installation if the system launcher uses another JDK.
The wrapper verifies the Gradle distribution checksum. Every Java app can be
built independently, for example `./gradlew :analysis-service:build`.

Gateway: `http://localhost:8080`. OIDC: `http://localhost:8180/realms/stock-insight`.
The web OIDC client uses code flow with mandatory PKCE S256; password grants are
disabled. Its local callback is `http://localhost:3000/api/auth/callback`.
The fixture account is `local-user` / `local-user-only`. Keycloak management uses
`local-admin` / `local-admin-only`. Change credentials through local `.env` for
manual environments; the realm's fixture user is imported only on first creation.
Email recovery requires SMTP configuration and is not verified by importing a realm.

`/api/v1/analysis/principal` and `/api/v1/market/principal` are authentication
diagnostics, not completed product APIs. They require a signed, unexpired token
with the configured issuer and `stock-insight-api` audience. Eureka, business
services, DB, Redis and broker have no host-published ports. Java validates the
public issuer while retrieving keys over the internal network.

PostgreSQL creates independent identity, analysis and market databases/accounts
and revokes public CONNECT. Analysis uses separate `analysis_migration` and
`analysis_app` roles; Flyway runs as the migration role, while runtime receives
schema usage and table DML privileges. Identity and market role separation
remains incomplete.
Redis AOF, PostgreSQL and RabbitMQ volumes persist across normal stop/start.
The new Trends schema and fixture-only Python consumer are implemented but their
complete runtime integration has not yet been verified. See
[the job contract](../../docs/architecture/TRENDS_JOB_CONTRACT.md).
The new migration role is created only on first volume initialization. Existing
volumes require a data-preserving upgrade before starting this revision; do not
delete volumes or use the initialization script as an upgrade script.

## 기존 analysis 볼륨의 역할 업그레이드

`upgrades/001-analysis-migration-role.sql`은 기존 analysis DB와 업무 테이블을
보존하고 migration/runtime 역할을 분리한다. 먼저 DB 백업을 확보하고 업무
서비스·워커를 중지한 뒤 관리자로 실행한다. 기본 동작은 ROLLBACK이며
`apply=true`일 때만 COMMIT한다. 현재 로컬 Docker 장애로 실제 실행 검증은
미완료이므로 아래 절차를 운영에 적용하지 않는다.

기존 postgres 컨테이너에 `ANALYSIS_MIGRATION_PASSWORD`가 없으면 셸에서 값을
설정하고 `docker compose exec -e ANALYSIS_MIGRATION_PASSWORD`로 전달한다.
자격증명 파일을 커밋하지 않는다. 다음 예시는 로컬 컨테이너 전용이다.

```sh
docker compose -f infra/local/compose.yml exec -T postgres sh -c \
  'exec psql --username postgres --dbname analysis --set=analysis_migration_password="$ANALYSIS_MIGRATION_PASSWORD" --set=apply=false' \
  < infra/local/upgrades/001-analysis-migration-role.sql
```

dry-run 결과와 백업을 확인한 후 동일 명령의 `apply=false`를 `apply=true`로
변경하여 적용한다. 초기화 스크립트를 다시 실행하거나 볼륨을 삭제하지 않는다.
Flyway는 다음 서비스 시작 시 새 migration 역할로 업무 스키마를 생성한다.

## Stop and inspect

After startup, run the dedicated runtime checks from the repository root:

```sh
node --test infra/local/runtime-smoke.test.mjs
```

GitHub Actions and all workflows were removed at the user's request. These
commands are manual checks. They exercise real OIDC code/PKCE login, token refresh,
Gateway routing and token rejection through HTTP; they are not browser product
E2E tests. This suite is separate from the default Vitest unit suite.

```sh
docker compose -f infra/local/compose.yml logs --tail 100 api-gateway
docker compose -f infra/local/compose.yml stop
docker compose -f infra/local/compose.yml down
```

These commands preserve volumes. Do not delete volumes containing user data.
First startup imports the realm and initializes databases; it does not migrate
existing volumes on later starts. Production needs a versioned migration path,
TLS, restricted management routes, real secrets, backup/restore and readiness.

Versions: Spring Boot 4.1.1 / Cloud 2025.1.3 per the
[Spring matrix](https://spring.io/projects/spring-cloud/) and Java 21 per
[Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html).
Keycloak 26.8.0 per [official releases](https://www.keycloak.org/downloads).
Build configuration success is not a full-stack product E2E pass.

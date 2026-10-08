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
and revokes public CONNECT. These local business roles currently own their DBs;
separate Flyway migration/runtime roles must be implemented before production.
Redis AOF, PostgreSQL and RabbitMQ volumes persist across normal stop/start.
There is no Python consumer or business schema yet.

## Stop and inspect

After startup, run the dedicated runtime checks from the repository root:

```sh
node --test infra/local/runtime-smoke.test.mjs
```

The MSA Runtime GitHub workflow builds and starts the same Compose environment
and runs these checks. They exercise real OIDC code/PKCE login, token refresh,
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

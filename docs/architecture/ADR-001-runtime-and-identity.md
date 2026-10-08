# ADR 001: container runtime and OIDC identity

Status: selected engineering direction, not verified runtime or account import.
Cloud vendor and production cutover remain unselected.

## Context and decision

The user removed Supabase and Vercel and authorized schema/configuration redesign.
Preserve product access controls while making the target independently runnable.
Use Next, Spring and Python containers, isolated PostgreSQL roles, Redis and
RabbitMQ. Select Keycloak as the initial self-hosted OIDC implementation behind
an identity adapter. This is an engineering selection, not a user-named product.
Pin its version and a compatible Spring stack during the runtime increment.

Use Authorization Code with PKCE S256, state and nonce. Keycloak documents code
flow token issuance and discovery/certificate/logout endpoints. Keep browser
sessions HttpOnly and server-managed; services validate issuer, audience,
signature, expiry and roles. Configure a canonical issuer reachable by browsers
and containers, with explicit internal JWKS routing rather than relaxed issuer
checks. Source: [Keycloak OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers).

## Alternatives and consequences

Spring Authorization Server would require more account administration and recovery
implementation here. Managed OIDC adds an external provider dependency before
cloud selection. Custom passwords/JWT issuance expands security-sensitive work.
Keycloak adds a container, database, backups, upgrades and email configuration.
Business services cannot access its database. Preserve application owner UUIDs
independently of token subjects, and verify legacy mappings before account import.
Password/OAuth migration feasibility is unverified; do not auto-link email or
promise transparent password migration. Local test accounts unblock development.

## Hosting and verification

Start with cloud-neutral Compose. Single-VM Compose is a minimum-cost candidate
with a single point of failure, not HA. Compare managed alternatives before IaC.
AWS is a candidate, not an approved provider. No resource provisioning or real
account/data cutover is authorized by this ADR. RAG is excluded.

Verify real login, signup/recovery, refresh/logout, invalid state/nonce/PKCE,
issuer/audience/expiry, CSRF, owner isolation, roles and restart persistence.
Realm configuration alone is not completed auth integration. Choose Spring
versions from the [official compatibility matrix](https://spring.io/projects/spring-cloud/)
before generating Gradle builds; major numbers alone do not establish compatibility.

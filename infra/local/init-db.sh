#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=identity_password="$IDENTITY_DB_PASSWORD" \
  --set=analysis_password="$ANALYSIS_DB_PASSWORD" \
  --set=analysis_migration_password="$ANALYSIS_MIGRATION_PASSWORD" \
  --set=market_password="$MARKET_DB_PASSWORD" <<'SQL'
CREATE ROLE identity_app LOGIN PASSWORD :'identity_password';
CREATE ROLE analysis_app LOGIN PASSWORD :'analysis_password';
CREATE ROLE analysis_migration LOGIN PASSWORD :'analysis_migration_password';
CREATE ROLE market_app LOGIN PASSWORD :'market_password';
CREATE DATABASE identity OWNER identity_app;
CREATE DATABASE analysis OWNER analysis_migration;
CREATE DATABASE market OWNER market_app;
REVOKE CONNECT ON DATABASE identity FROM PUBLIC;
REVOKE CONNECT ON DATABASE analysis FROM PUBLIC;
REVOKE CONNECT ON DATABASE market FROM PUBLIC;
GRANT CONNECT ON DATABASE analysis TO analysis_app;
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname analysis <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO analysis_app;
ALTER DEFAULT PRIVILEGES FOR ROLE analysis_migration IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO analysis_app;
SQL

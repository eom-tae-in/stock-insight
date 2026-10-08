\set ON_ERROR_STOP on
\if :{?apply}
\else
\set apply false
\endif

BEGIN;
SELECT format('CREATE ROLE analysis_migration LOGIN PASSWORD %L', :'analysis_migration_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analysis_migration')
\gexec
ALTER ROLE analysis_migration LOGIN PASSWORD :'analysis_migration_password';
ALTER DATABASE analysis OWNER TO analysis_migration;
ALTER SCHEMA public OWNER TO analysis_migration;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE analysis TO analysis_app;
GRANT USAGE ON SCHEMA public TO analysis_app;

SELECT format('ALTER TABLE public.%I OWNER TO analysis_migration', tablename)
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN
    ('trends_jobs', 'job_requests', 'job_outbox', 'job_inbox', 'flyway_schema_history')
\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO analysis_app', tablename)
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN
    ('trends_jobs', 'job_requests', 'job_outbox', 'job_inbox')
\gexec
ALTER DEFAULT PRIVILEGES FOR ROLE analysis_migration IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO analysis_app;

\if :apply
COMMIT;
\else
ROLLBACK;
\endif

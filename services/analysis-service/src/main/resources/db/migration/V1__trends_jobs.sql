CREATE TABLE trends_jobs (
    id uuid PRIMARY KEY,
    issuer text NOT NULL,
    subject text NOT NULL,
    query jsonb NOT NULL,
    query_key text NOT NULL,
    generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
    state text NOT NULL CHECK (state IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    requested_at timestamptz NOT NULL,
    deadline timestamptz NOT NULL,
    correlation_id uuid NOT NULL,
    result jsonb,
    error_code text,
    provider text,
    deleted_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX trends_active_query ON trends_jobs (issuer, subject, query_key)
    WHERE deleted_at IS NULL AND state IN ('PENDING', 'RUNNING');
CREATE INDEX trends_deadline ON trends_jobs (deadline)
    WHERE deleted_at IS NULL AND state IN ('PENDING', 'RUNNING');

CREATE TABLE job_requests (
    issuer text NOT NULL,
    subject text NOT NULL,
    request_key text NOT NULL,
    fingerprint text NOT NULL,
    job_id uuid NOT NULL REFERENCES trends_jobs(id),
    PRIMARY KEY (issuer, subject, request_key)
);
CREATE TABLE job_outbox (
    event_id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES trends_jobs(id),
    generation integer NOT NULL,
    payload jsonb NOT NULL,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_pending ON job_outbox (created_at) WHERE published_at IS NULL;
CREATE TABLE job_inbox (
    event_id uuid PRIMARY KEY,
    job_id uuid NOT NULL,
    generation integer NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
);

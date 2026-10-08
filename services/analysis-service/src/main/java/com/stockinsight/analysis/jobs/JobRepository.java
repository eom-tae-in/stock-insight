package com.stockinsight.analysis.jobs;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
public class JobRepository {
    private final JdbcTemplate jdbc;
    private final JsonMapper json;

    public JobRepository(JdbcTemplate jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public record Stored(JobView view, UUID correlationId, boolean deleted) {}
    public record Request(String fingerprint, UUID jobId) {}

    public void lockOwner(JobService.Owner owner) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
            rs -> {}, owner.issuer() + "|" + owner.subject());
    }

    public Optional<Request> request(JobService.Owner owner, String key) {
        return jdbc.query("SELECT fingerprint, job_id FROM job_requests WHERE issuer=? AND subject=? AND request_key=?",
            (rs, row) -> new Request(rs.getString(1), rs.getObject(2, UUID.class)),
            owner.issuer(), owner.subject(), key).stream().findFirst();
    }

    public Optional<Stored> owned(JobService.Owner owner, UUID id) {
        return jdbc.query("SELECT * FROM trends_jobs WHERE id=? AND issuer=? AND subject=? AND deleted_at IS NULL FOR UPDATE",
            this::stored, id, owner.issuer(), owner.subject()).stream().findFirst();
    }

    public Optional<Stored> lock(UUID id) {
        return jdbc.query("SELECT * FROM trends_jobs WHERE id=? FOR UPDATE", this::stored, id).stream().findFirst();
    }

    public Optional<Stored> active(JobService.Owner owner, String queryKey) {
        return jdbc.query("SELECT * FROM trends_jobs WHERE issuer=? AND subject=? AND query_key=? AND deleted_at IS NULL AND state IN ('PENDING','RUNNING') FOR UPDATE",
            this::stored, owner.issuer(), owner.subject(), queryKey).stream().findFirst();
    }

    public int activeCount(JobService.Owner owner) {
        return jdbc.queryForObject("SELECT count(*) FROM trends_jobs WHERE issuer=? AND subject=? AND deleted_at IS NULL AND state IN ('PENDING','RUNNING')",
            Integer.class, owner.issuer(), owner.subject());
    }

    public void insert(JobService.Owner owner, String queryKey, Stored job) {
        JobView view = job.view();
        jdbc.update("INSERT INTO trends_jobs(id,issuer,subject,query,query_key,state,requested_at,deadline,correlation_id) VALUES(?,?,?,?::jsonb,?,'PENDING',?,?,?)",
            view.id(), owner.issuer(), owner.subject(), json.writeValueAsString(view.query()), queryKey,
            java.sql.Timestamp.from(view.requestedAt()), java.sql.Timestamp.from(view.deadline()), job.correlationId());
    }

    public void recordRequest(JobService.Owner owner, String key, Request request) {
        jdbc.update("INSERT INTO job_requests(issuer,subject,request_key,fingerprint,job_id) VALUES(?,?,?,?,?)",
            owner.issuer(), owner.subject(), key, request.fingerprint(), request.jobId());
    }

    public void enqueue(JobEvents.Requested event) {
        jdbc.update("INSERT INTO job_outbox(event_id,job_id,generation,payload) VALUES(?,?,?,?::jsonb)",
            event.eventId(), event.jobId(), event.generation(), json.writeValueAsString(event));
    }

    public void refresh(Stored job, String queryKey) {
        JobView view = job.view();
        jdbc.update("UPDATE trends_jobs SET generation=?,state='PENDING',requested_at=?,deadline=?,correlation_id=?,query_key=?,result=NULL,error_code=NULL,provider=NULL,updated_at=now() WHERE id=?",
            view.generation(), java.sql.Timestamp.from(view.requestedAt()), java.sql.Timestamp.from(view.deadline()),
            job.correlationId(), queryKey, view.id());
    }

    public void delete(UUID id) {
        jdbc.update("UPDATE trends_jobs SET deleted_at=now(),result=NULL,updated_at=now() WHERE id=?", id);
    }

    public boolean inbox(JobEvents.Result event) {
        return jdbc.update("INSERT INTO job_inbox(event_id,job_id,generation) VALUES(?,?,?) ON CONFLICT DO NOTHING",
            event.eventId(), event.jobId(), event.generation()) == 1;
    }

    public void apply(JobEvents.Result event, JobEvents.State state) {
        jdbc.update("UPDATE trends_jobs SET state=?,result=?::jsonb,error_code=?,provider=?,updated_at=now() WHERE id=?",
            state.name(), json.writeValueAsString(event.points()), event.errorCode(), event.provider(), event.jobId());
    }

    public void expire(java.time.Instant now) {
        jdbc.update("UPDATE trends_jobs SET state='FAILED',error_code='DEADLINE_EXCEEDED',updated_at=now() WHERE deleted_at IS NULL AND state IN ('PENDING','RUNNING') AND deadline<=?",
            java.sql.Timestamp.from(now));
    }

    public void expireOwned(JobService.Owner owner, java.time.Instant now) {
        jdbc.update("UPDATE trends_jobs SET state='FAILED',error_code='DEADLINE_EXCEEDED',updated_at=now() WHERE issuer=? AND subject=? AND deleted_at IS NULL AND state IN ('PENDING','RUNNING') AND deadline<=?",
            owner.issuer(), owner.subject(), java.sql.Timestamp.from(now));
    }

    private Stored stored(ResultSet rs, int row) throws SQLException {
        String result = rs.getString("result");
        List<TrendsQuery.Point> points = result == null ? List.of()
            : Arrays.asList(json.readValue(result, TrendsQuery.Point[].class));
        return new Stored(new JobView(rs.getObject("id", UUID.class), rs.getInt("generation"),
            JobEvents.State.valueOf(rs.getString("state")), json.readValue(rs.getString("query"), TrendsQuery.class),
            rs.getTimestamp("requested_at").toInstant(), rs.getTimestamp("deadline").toInstant(),
            points, rs.getString("error_code"), rs.getString("provider")),
            rs.getObject("correlation_id", UUID.class), rs.getTimestamp("deleted_at") != null);
    }
}

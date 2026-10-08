package com.stockinsight.analysis.jobs;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class JobService {
    private final JobRepository repository;
    private final JsonMapper json;
    private final Clock clock;

    public JobService(JobRepository repository, JsonMapper json, Clock clock) {
        this.repository = repository;
        this.json = json;
        this.clock = clock;
    }

    public record Owner(String issuer, String subject) {
        public Owner {
            if (issuer == null || issuer.isBlank() || subject == null || subject.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Owner claims are required");
            }
        }
    }

    @Transactional
    public JobView create(Owner owner, String key, TrendsQuery query) {
        repository.lockOwner(owner);
        Instant now = clock.instant();
        repository.expireOwned(owner, now);
        String queryKey = hash(json.writeValueAsString(query) + completedWeek(now));
        var previous = repository.request(owner, key);
        if (previous.isPresent()) return replay(owner, previous.get(), "create:" + queryKey);
        var existing = repository.active(owner, queryKey);
        JobRepository.Stored job;
        if (existing.isPresent()) {
            job = existing.get();
        } else {
            if (repository.activeCount(owner) >= 5) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            job = pending(UUID.randomUUID(), 1, query, now);
            repository.insert(owner, queryKey, job);
            enqueue(job);
        }
        repository.recordRequest(owner, key, new JobRepository.Request("create:" + queryKey, job.view().id()));
        return job.view();
    }

    @Transactional
    public JobView get(Owner owner, UUID id) {
        repository.lockOwner(owner);
        repository.expireOwned(owner, clock.instant());
        return owned(owner, id).view();
    }

    @Transactional
    public JobView refresh(Owner owner, UUID id, String key) {
        repository.lockOwner(owner);
        Instant now = clock.instant();
        repository.expireOwned(owner, now);
        var previous = repository.request(owner, key);
        if (previous.isPresent()) return replay(owner, previous.get(), "refresh:" + id);
        JobRepository.Stored existing = owned(owner, id);
        if (repository.activeCount(owner) >= 5 && terminal(existing.view().state())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        }
        String queryKey = hash(json.writeValueAsString(existing.view().query()) + completedWeek(now));
        var active = repository.active(owner, queryKey);
        if (active.isPresent() && !active.get().view().id().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An equivalent job is active");
        }
        JobRepository.Stored job = pending(id, existing.view().generation() + 1, existing.view().query(), now);
        repository.refresh(job, queryKey);
        enqueue(job);
        repository.recordRequest(owner, key, new JobRepository.Request("refresh:" + id, id));
        return job.view();
    }

    @Transactional
    public void delete(Owner owner, UUID id) {
        repository.lockOwner(owner);
        repository.delete(owned(owner, id).view().id());
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void expire() { repository.expire(clock.instant()); }

    private JobView replay(Owner owner, JobRepository.Request request, String fingerprint) {
        if (!request.fingerprint().equals(fingerprint)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key has different input");
        }
        return owned(owner, request.jobId()).view();
    }

    private JobRepository.Stored owned(Owner owner, UUID id) {
        return repository.owned(owner, id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private JobRepository.Stored pending(UUID id, int generation, TrendsQuery query, Instant now) {
        return new JobRepository.Stored(new JobView(id, generation, JobEvents.State.PENDING,
            query, now, now.plusSeconds(300), List.of(), null, null), UUID.randomUUID(), false);
    }

    private void enqueue(JobRepository.Stored job) {
        JobView view = job.view();
        repository.enqueue(new JobEvents.Requested(1, UUID.randomUUID(), view.id(), job.correlationId(),
            view.generation(), 1, view.requestedAt(), view.deadline(), completedWeek(view.requestedAt()), view.query()));
    }

    static LocalDate completedWeek(Instant requestedAt) {
        return requestedAt.atZone(ZoneOffset.UTC).toLocalDate()
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
    }

    static boolean terminal(JobEvents.State state) {
        return switch (state) {
            case PENDING, RUNNING -> false;
            case SUCCEEDED, FAILED -> true;
        };
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("Required SHA-256 implementation missing", error);
        }
    }
}

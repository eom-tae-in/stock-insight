package com.stockinsight.analysis.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {
    private static final JobService.Owner OWNER = new JobService.Owner("https://issuer.example", "alice");
    private static final Instant NOW = Instant.parse("2026-10-08T00:00:00Z");
    private static final TrendsQuery QUERY = new TrendsQuery("coffee", "", "today 5-y", "");
    @Mock private JobRepository repository;
    private JobService service;

    @BeforeEach
    void setUp() {
        service = new JobService(repository, JsonMapper.builder().build(), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static JobRepository.Stored stored() {
        return new JobRepository.Stored(new JobView(UUID.randomUUID(), 3, JobEvents.State.PENDING,
            QUERY, NOW, NOW.plusSeconds(300), List.of(), null, null), UUID.randomUUID(), false);
    }

    @Test
    void returnsSameActiveJobWhenEquivalentQueryIsSubmitted() {
        var existing = stored();
        when(repository.active(eq(OWNER), any(String.class))).thenReturn(Optional.of(existing));
        var response = service.create(OWNER, "new-key", QUERY);
        assertEquals(existing.view(), response);
    }

    @Test
    void returnsConflictWhenCreateKeyWasUsedForDifferentInput() {
        when(repository.request(OWNER, "used-key"))
            .thenReturn(Optional.of(new JobRepository.Request("different-query", UUID.randomUUID())));
        var error = assertThrows(ResponseStatusException.class,
            () -> service.create(OWNER, "used-key", QUERY));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    @Test
    void returnsTooManyRequestsWhenOwnerAlreadyHasFiveActiveJobs() {
        when(repository.activeCount(OWNER)).thenReturn(5);
        var error = assertThrows(ResponseStatusException.class,
            () -> service.create(OWNER, "new-key", QUERY));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatusCode());
    }

    @Test
    void replaysRefreshWhenIdempotencyKeyIsRepeated() {
        var existing = stored();
        var id = existing.view().id();
        when(repository.request(OWNER, "refresh-key"))
            .thenReturn(Optional.of(new JobRepository.Request("refresh:" + id, id)));
        when(repository.owned(OWNER, id)).thenReturn(Optional.of(existing));
        var response = service.refresh(OWNER, id, "refresh-key");
        assertEquals(existing.view(), response);
    }

    @Test
    void returnsNotFoundWhenOwnerHasNoAccessibleJob() {
        var error = assertThrows(ResponseStatusException.class,
            () -> service.get(OWNER, UUID.randomUUID()));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void rejectsOwnerWhenTokenHasNoSubject() {
        var error = assertThrows(ResponseStatusException.class,
            () -> new JobService.Owner("https://issuer.example", null));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
    }
}

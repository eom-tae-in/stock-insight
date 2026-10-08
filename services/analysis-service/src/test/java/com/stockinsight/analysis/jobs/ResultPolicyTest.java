package com.stockinsight.analysis.jobs;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class ResultPolicyTest {
    private static final UUID JOB = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID CORRELATION = UUID.fromString("00000000-0000-4000-8000-000000000002");
    private static final Instant REQUESTED = Instant.parse("2026-10-08T00:00:00Z");
    private static final Instant DEADLINE = REQUESTED.plusSeconds(300);

    private static JobRepository.Stored job(JobEvents.State state, boolean deleted) {
        return new JobRepository.Stored(new JobView(JOB, 2, state,
            new TrendsQuery("coffee", "", "today 5-y", ""), REQUESTED, DEADLINE,
            List.of(), null, null), CORRELATION, deleted);
    }

    private static JobEvents.Result event(int generation, UUID correlation,
        JobEvents.Kind kind, List<TrendsQuery.Point> points, String error) {
        return new JobEvents.Result(1, UUID.randomUUID(), JOB, correlation, generation,
            1, kind, "fixture-v1", points, error);
    }

    @Test
    void acceptsCurrentResultWhenJobIsActive() {
        var stored = job(JobEvents.State.RUNNING, false);
        var result = event(2, CORRELATION, JobEvents.Kind.STARTED, List.of(), "");
        assertTrue(ResultPolicy.applicable(stored, result, REQUESTED));
    }

    @Test
    void rejectsResultWhenGenerationIsStale() {
        var stored = job(JobEvents.State.PENDING, false);
        var result = event(1, CORRELATION, JobEvents.Kind.STARTED, List.of(), "");
        assertFalse(ResultPolicy.applicable(stored, result, REQUESTED));
    }

    @Test
    void rejectsResultWhenCorrelationIsDifferent() {
        var stored = job(JobEvents.State.PENDING, false);
        var result = event(2, JOB, JobEvents.Kind.STARTED, List.of(), "");
        assertFalse(ResultPolicy.applicable(stored, result, REQUESTED));
    }

    @Test
    void rejectsResultWhenJobWasDeleted() {
        var stored = job(JobEvents.State.PENDING, true);
        var result = event(2, CORRELATION, JobEvents.Kind.STARTED, List.of(), "");
        assertFalse(ResultPolicy.applicable(stored, result, REQUESTED));
    }

    @ParameterizedTest
    @EnumSource(value = JobEvents.State.class, names = {"SUCCEEDED", "FAILED"})
    void rejectsLateResultWhenJobIsTerminal(JobEvents.State state) {
        var stored = job(state, false);
        var result = event(2, CORRELATION, JobEvents.Kind.STARTED, List.of(), "");
        assertFalse(ResultPolicy.applicable(stored, result, REQUESTED));
    }

    @Test
    void rejectsResultWhenDeadlineIsReached() {
        var stored = job(JobEvents.State.RUNNING, false);
        var result = event(2, CORRELATION, JobEvents.Kind.STARTED, List.of(), "");
        assertFalse(ResultPolicy.applicable(stored, result, DEADLINE));
    }

    @Test
    void acceptsOrderedCompletedWeeksWhenSuccessHasData() {
        var stored = job(JobEvents.State.RUNNING, false);
        var result = event(2, CORRELATION, JobEvents.Kind.SUCCEEDED, List.of(
            new TrendsQuery.Point(LocalDate.parse("2026-09-21"), 0),
            new TrendsQuery.Point(LocalDate.parse("2026-09-28"), 100)), "");
        assertDoesNotThrow(() -> ResultPolicy.validatePoints(stored.view(), result));
    }

    @Test
    void rejectsSeriesWhenWeekIsIncomplete() {
        var stored = job(JobEvents.State.RUNNING, false);
        var result = event(2, CORRELATION, JobEvents.Kind.SUCCEEDED,
            List.of(new TrendsQuery.Point(LocalDate.parse("2026-10-05"), 20)), "");
        assertThrows(IllegalArgumentException.class, () -> ResultPolicy.validatePoints(stored.view(), result));
    }

    @Test
    void rejectsSeriesWhenDatesAreDuplicated() {
        var stored = job(JobEvents.State.RUNNING, false);
        var point = new TrendsQuery.Point(LocalDate.parse("2026-09-28"), 20);
        var result = event(2, CORRELATION, JobEvents.Kind.SUCCEEDED, List.of(point, point), "");
        assertThrows(IllegalArgumentException.class, () -> ResultPolicy.validatePoints(stored.view(), result));
    }

    @Test
    void rejectsSuccessWhenDataIsEmpty() {
        var stored = job(JobEvents.State.RUNNING, false);
        var result = event(2, CORRELATION, JobEvents.Kind.SUCCEEDED, List.of(), "");
        assertThrows(IllegalArgumentException.class, () -> ResultPolicy.validatePoints(stored.view(), result));
    }

    @Test
    void rejectsFailureWhenErrorCodeIsMissing() {
        var stored = job(JobEvents.State.RUNNING, false);
        var result = event(2, CORRELATION, JobEvents.Kind.FAILED, List.of(), "");
        assertThrows(IllegalArgumentException.class, () -> ResultPolicy.validatePoints(stored.view(), result));
    }

    @Test
    void usesPreviousWeekWhenRequestCrossesUtcMonday() {
        assertEquals(LocalDate.parse("2026-09-28"),
            JobService.completedWeek(Instant.parse("2026-10-11T23:59:59Z")));
        assertEquals(LocalDate.parse("2026-10-05"),
            JobService.completedWeek(Instant.parse("2026-10-12T00:00:00Z")));
    }
}

package com.stockinsight.analysis.jobs;

import com.stockinsight.analysis.jobs.TrendsQuery.Point;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class JobEvents {
    private JobEvents() {}

    public enum State { PENDING, RUNNING, SUCCEEDED, FAILED }
    public enum Kind { STARTED, SUCCEEDED, FAILED }

    public record Requested(
        @Min(1) @Max(1) int schemaVersion,
        @NotNull UUID eventId,
        @NotNull UUID jobId,
        @NotNull UUID correlationId,
        @Min(1) int generation,
        @Min(1) @Max(2) int attempt,
        @NotNull Instant requestedAt,
        @NotNull Instant deadline,
        @NotNull LocalDate completedWeek,
        @NotNull @Valid TrendsQuery query
    ) {}

    public record Result(
        @Min(1) @Max(1) int schemaVersion,
        @NotNull UUID eventId,
        @NotNull UUID jobId,
        @NotNull UUID correlationId,
        @Min(1) int generation,
        @Min(1) @Max(2) int attempt,
        @NotNull Kind kind,
        @NotNull @Pattern(regexp = "fixture-v1") String provider,
        @NotNull @Size(max = 300) List<@NotNull @Valid Point> points,
        @NotNull @Pattern(regexp = "|NO_DATA|DEADLINE_EXCEEDED|PROVIDER_FAILED") String errorCode
    ) {}
}

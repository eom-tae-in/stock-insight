package com.stockinsight.analysis.jobs;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;

public final class ResultPolicy {
    private ResultPolicy() {}

    public static boolean applicable(JobRepository.Stored job, JobEvents.Result event, Instant now) {
        return !job.deleted() && job.view().generation() == event.generation()
            && job.correlationId().equals(event.correlationId())
            && !JobService.terminal(job.view().state()) && now.isBefore(job.view().deadline());
    }

    public static void validatePoints(JobView job, JobEvents.Result event) {
        if (event.kind() != JobEvents.Kind.SUCCEEDED && !event.points().isEmpty()) {
            throw new IllegalArgumentException("Non-success events cannot contain points");
        }
        if (event.kind() == JobEvents.Kind.FAILED && event.errorCode().isEmpty()) {
            throw new IllegalArgumentException("Failure events require an error code");
        }
        if (event.kind() != JobEvents.Kind.FAILED && !event.errorCode().isEmpty()) {
            throw new IllegalArgumentException("Only failure events contain an error code");
        }
        if (event.kind() == JobEvents.Kind.SUCCEEDED && event.points().isEmpty()) {
            throw new IllegalArgumentException("Success events require data");
        }
        LocalDate completedWeek = JobService.completedWeek(job.requestedAt());
        LocalDate previous = null;
        for (TrendsQuery.Point point : event.points()) {
            if (point.date().getDayOfWeek() != DayOfWeek.MONDAY || point.date().isAfter(completedWeek)
                || point.value() < 0 || point.value() > 100 || (previous != null && !point.date().isAfter(previous))) {
                throw new IllegalArgumentException("Result is not an ordered completed-week series");
            }
            previous = point.date();
        }
    }
}

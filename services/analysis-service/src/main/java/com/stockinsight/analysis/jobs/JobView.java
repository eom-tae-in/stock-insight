package com.stockinsight.analysis.jobs;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobView(
    UUID id, int generation, JobEvents.State state, TrendsQuery query,
    Instant requestedAt, Instant deadline, List<TrendsQuery.Point> points,
    String errorCode, String provider
) {}

package com.stockinsight.analysis.jobs;

import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResultService {
    private final JobRepository repository;
    private final Clock clock;

    public ResultService(JobRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public void apply(JobEvents.Result event) {
        var stored = repository.lock(event.jobId());
        if (stored.isEmpty()) return;
        JobRepository.Stored job = stored.get();
        ResultPolicy.validatePoints(job.view(), event);
        if (!repository.inbox(event) || !ResultPolicy.applicable(job, event, clock.instant())) return;
        JobEvents.State state = switch (event.kind()) {
            case STARTED -> JobEvents.State.RUNNING;
            case SUCCEEDED -> JobEvents.State.SUCCEEDED;
            case FAILED -> JobEvents.State.FAILED;
        };
        repository.apply(event, state);
    }
}

package com.stockinsight.analysis.jobs;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analysis/trends/jobs")
public class JobController {
    private final JobService jobs;

    public JobController(JobService jobs) { this.jobs = jobs; }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public JobView create(@AuthenticationPrincipal Jwt jwt,
                         @RequestHeader("Idempotency-Key") @Pattern(regexp = "[a-zA-Z0-9_-]{1,100}") String key,
                         @Valid @RequestBody TrendsQuery query) {
        return jobs.create(new JobService.Owner(jwt.getIssuer().toString(), jwt.getSubject()), key, query.normalized());
    }

    @GetMapping("/{id}")
    public JobView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return jobs.get(new JobService.Owner(jwt.getIssuer().toString(), jwt.getSubject()), id);
    }

    @PostMapping("/{id}/refresh")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public JobView refresh(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                          @RequestHeader("Idempotency-Key") @Pattern(regexp = "[a-zA-Z0-9_-]{1,100}") String key) {
        return jobs.refresh(new JobService.Owner(jwt.getIssuer().toString(), jwt.getSubject()), id, key);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        jobs.delete(new JobService.Owner(jwt.getIssuer().toString(), jwt.getSubject()), id);
    }
}

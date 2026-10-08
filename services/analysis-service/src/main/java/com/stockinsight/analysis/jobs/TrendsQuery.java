package com.stockinsight.analysis.jobs;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record TrendsQuery(
    @NotBlank @Size(max = 100) String keyword,
    @NotNull @Pattern(regexp = "|[A-Z]{2}") String geo,
    @NotNull @Pattern(regexp = "today 5-y") String timeframe,
    @NotNull @Pattern(regexp = "|youtube|images|news|froogle") String gprop
) {
    public TrendsQuery normalized() {
        return new TrendsQuery(keyword.strip().replaceAll("(?U)\\s+", " "), geo, timeframe, gprop);
    }

    public record Point(@NotNull LocalDate date, int value) {}
}

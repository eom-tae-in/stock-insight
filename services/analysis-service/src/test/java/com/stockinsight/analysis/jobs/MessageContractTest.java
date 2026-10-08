package com.stockinsight.analysis.jobs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class MessageContractTest {
    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void preservesWireTypesWhenRequestIsSerialized() throws IOException {
        String payload = Files.readString(Path.of("../contracts/trends-requested-v1.json"));
        var request = json.readValue(payload, JobEvents.Requested.class);
        String encoded = json.writeValueAsString(request);
        assertEquals(json.readTree(payload), json.readTree(encoded));
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(request).isEmpty());
        }
    }

    @Test
    void acceptsPythonResultWhenContractIsValid() throws IOException {
        String payload = Files.readString(Path.of("../contracts/trends-result-v1.json"));
        var result = json.readValue(payload, JobEvents.Result.class);
        assertEquals(JobEvents.Kind.SUCCEEDED, result.kind());
        assertEquals(84, result.points().getFirst().value());
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(result).isEmpty());
        }
    }
}

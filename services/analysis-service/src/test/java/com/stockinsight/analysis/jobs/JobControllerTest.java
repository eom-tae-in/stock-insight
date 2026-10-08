package com.stockinsight.analysis.jobs;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@ExtendWith(MockitoExtension.class)
class JobControllerTest {
    private static final String PATH = "/api/v1/analysis/trends/jobs";
    private static final String QUERY = """
        {"keyword":"coffee","geo":"","timeframe":"today 5-y","gprop":""}
        """;
    @Mock private JobService jobs;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new JobController(jobs))
            .setCustomArgumentResolvers(new FixturePrincipal()).build();
    }

    @Test
    void acceptsCreateWhenBodyAndKeyAreValid() throws Exception {
        var now = Instant.parse("2026-10-08T00:00:00Z");
        when(jobs.create(any(), any(), any())).thenReturn(new JobView(UUID.randomUUID(), 1,
            JobEvents.State.PENDING, new TrendsQuery("coffee", "", "today 5-y", ""),
            now, now.plusSeconds(300), List.of(), null, null));
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON)
            .header("Idempotency-Key", "create-1").content(QUERY))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.state").value("PENDING"))
            .andExpect(jsonPath("$.query.keyword").value("coffee"));
    }

    @Test
    void rejectsCreateWhenIdempotencyKeyIsMissing() throws Exception {
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(QUERY))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsCreateWhenIdempotencyKeyHasInvalidCharacters() throws Exception {
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON)
            .header("Idempotency-Key", "invalid key").content(QUERY))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsCreateWhenKeywordIsBlank() throws Exception {
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON)
            .header("Idempotency-Key", "create-1").content(QUERY.replace("coffee", " ")))
            .andExpect(status().isBadRequest());
    }

    private static final class FixturePrincipal implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.getParameterType() == Jwt.class;
        }

        @Override
        public Jwt resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
            NativeWebRequest request, WebDataBinderFactory binder) {
            return Jwt.withTokenValue("fixture-token").header("alg", "RS256")
                .issuer("https://issuer.example").subject("alice").build();
        }
    }
}

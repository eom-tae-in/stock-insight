package com.stockinsight.market;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PrincipalController {
    public record PrincipalView(String issuer, String subject) {}

    @GetMapping("/api/v1/market/principal")
    public PrincipalView principal(@AuthenticationPrincipal Jwt jwt) {
        return new PrincipalView(jwt.getIssuer().toString(), jwt.getSubject());
    }
}

package com.stockinsight.gateway;

import java.util.UUID;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class CorrelationFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = UUID.randomUUID().toString();
        exchange.getResponse().getHeaders().set("X-Correlation-Id", correlationId);
        return chain.filter(exchange.mutate().request(request -> request.headers(headers -> {
            headers.set("X-Correlation-Id", correlationId);
            headers.remove("X-User-Id");
            headers.remove("X-User-Email");
            headers.remove("X-Admin");
        })).build());
    }

    @Override
    public int getOrder() { return -1; }
}

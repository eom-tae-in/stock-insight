package com.stockinsight.analysis.jobs;

import java.time.Clock;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JobConfiguration {
    @Bean
    Clock clock() { return Clock.systemUTC(); }

    @Bean
    Declarables jobQueues() {
        return new Declarables(
            QueueBuilder.durable("trends.requests.v1").deadLetterExchange("")
                .deadLetterRoutingKey("trends.requests.dlq").build(),
            QueueBuilder.durable("trends.results.v1").deadLetterExchange("")
                .deadLetterRoutingKey("trends.results.dlq").build(),
            QueueBuilder.durable("trends.requests.dlq").build(),
            QueueBuilder.durable("trends.results.dlq").build()
        );
    }
}

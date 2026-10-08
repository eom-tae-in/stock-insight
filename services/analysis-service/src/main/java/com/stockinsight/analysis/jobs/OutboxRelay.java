package com.stockinsight.analysis.jobs;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxRelay {
    private final JdbcTemplate jdbc;
    private final RabbitTemplate rabbit;

    public OutboxRelay(JdbcTemplate jdbc, RabbitTemplate rabbit) {
        this.jdbc = jdbc;
        this.rabbit = rabbit;
    }

    private record Pending(UUID id, String payload) {}

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void publish() {
        var pending = jdbc.query("""
            SELECT o.event_id,o.payload FROM job_outbox o JOIN trends_jobs j ON j.id=o.job_id
            WHERE o.published_at IS NULL AND j.deleted_at IS NULL AND j.generation=o.generation
              AND j.state IN ('PENDING','RUNNING') AND j.deadline>now()
            ORDER BY o.created_at LIMIT 10 FOR UPDATE OF o SKIP LOCKED
            """, (rs, row) -> new Pending(rs.getObject(1, UUID.class), rs.getString(2)));
        for (Pending event : pending) {
            MessageProperties properties = new MessageProperties();
            properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
            properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
            properties.setMessageId(event.id().toString());
            CorrelationData confirmation = new CorrelationData(UUID.randomUUID().toString());
            rabbit.send("", "trends.requests.v1", new Message(event.payload().getBytes(StandardCharsets.UTF_8), properties), confirmation);
            try {
                if (!confirmation.getFuture().get(5, TimeUnit.SECONDS).ack() || confirmation.getReturned() != null) {
                    throw new IllegalStateException("Outbox publication was not routed and confirmed");
                }
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Outbox confirm interrupted", error);
            } catch (ExecutionException | TimeoutException error) {
                throw new IllegalStateException("Outbox confirm failed", error);
            }
            jdbc.update("UPDATE job_outbox SET published_at=now() WHERE event_id=?", event.id());
        }
    }
}

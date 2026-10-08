package com.stockinsight.analysis.jobs;

import com.rabbitmq.client.Channel;
import jakarta.validation.Validator;
import java.io.IOException;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Component
public class ResultListener {
    private final JsonMapper json;
    private final Validator validator;
    private final ResultService results;

    public ResultListener(JsonMapper json, Validator validator, ResultService results) {
        this.json = json;
        this.validator = validator;
        this.results = results;
    }

    @RabbitListener(queues = "trends.results.v1", ackMode = "MANUAL")
    public void receive(Message message, Channel channel) throws IOException {
        try {
            JobEvents.Result event = json.readValue(message.getBody(), JobEvents.Result.class);
            if (!validator.validate(event).isEmpty()) throw new IllegalArgumentException("Invalid result contract");
            results.apply(event);
        } catch (JacksonException | IllegalArgumentException error) {
            throw new AmqpRejectAndDontRequeueException("Invalid result moved to DLQ", true, error);
        }
        channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
    }
}

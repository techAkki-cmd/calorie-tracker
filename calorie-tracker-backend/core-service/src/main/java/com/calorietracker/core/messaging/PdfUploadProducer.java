package com.calorietracker.core.messaging;

import com.calorietracker.core.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.AmqpException;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
@Slf4j
public class PdfUploadProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * The queue name doubles as the routing key, which the default exchange delivers straight to
     * the identically named queue.
     */
    public void sendPdfForProcessing(UUID jobId, UUID userId, String fileReference) {
        CorrelationData correlation = new CorrelationData(jobId.toString());
        rabbitTemplate.convertAndSend("", RabbitMQConfig.PDF_UPLOAD_QUEUE,
                new PdfUploadMessage(jobId, userId, fileReference), correlation);
        try {
            CorrelationData.Confirm confirm = correlation.getFuture().get(10, TimeUnit.SECONDS);
            if (!confirm.ack()) {
                throw new AmqpException("RabbitMQ rejected PDF import " + jobId + ": " + confirm.reason());
            }
            if (correlation.getReturned() != null) {
                throw new AmqpException("RabbitMQ could not route PDF import " + jobId);
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AmqpException("Interrupted while confirming PDF import " + jobId, interrupted);
        } catch (ExecutionException | TimeoutException confirmationFailure) {
            throw new AmqpException("RabbitMQ did not confirm PDF import " + jobId, confirmationFailure);
        }
        log.debug("Broker confirmed PDF {} for job {} and user {}", fileReference, jobId, userId);
    }
}

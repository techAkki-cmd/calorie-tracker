package com.calorietracker.core.messaging;

import com.calorietracker.core.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class PdfUploadProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * The queue name doubles as the routing key, which the default exchange delivers straight to
     * the identically named queue.
     */
    public void sendPdfForProcessing(UUID userId, String fileReference) {
        rabbitTemplate.convertAndSend(RabbitMQConfig.PDF_UPLOAD_QUEUE,
                new PdfUploadMessage(userId, fileReference));
        log.debug("Queued PDF {} for user {}", fileReference, userId);
    }
}

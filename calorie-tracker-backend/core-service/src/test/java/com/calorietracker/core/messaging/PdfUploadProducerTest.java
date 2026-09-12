package com.calorietracker.core.messaging;

import com.calorietracker.core.config.RabbitMQConfig;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PdfUploadProducerTest {

    @Test
    void sendsPayloadToPdfUploadQueue() {
        RecordingRabbitTemplate rabbitTemplate = new RecordingRabbitTemplate();
        PdfUploadProducer producer = new PdfUploadProducer(rabbitTemplate);
        UUID userId = UUID.randomUUID();

        producer.sendPdfForProcessing(userId, "s3://imports/january.pdf");

        assertThat(rabbitTemplate.routingKeys).containsExactly(RabbitMQConfig.PDF_UPLOAD_QUEUE);
        assertThat(rabbitTemplate.payloads)
                .containsExactly(new PdfUploadMessage(userId, "s3://imports/january.pdf"));
    }

    /**
     * RabbitTemplate is a concrete class. A recorder subclass avoids Mockito's ByteBuddy
     * MockMaker, which some sandboxed JVMs refuse to load.
     */
    private static final class RecordingRabbitTemplate extends RabbitTemplate {

        private final List<String> routingKeys = new ArrayList<>();
        private final List<Object> payloads = new ArrayList<>();

        @Override
        public void convertAndSend(String routingKey, Object object) {
            routingKeys.add(routingKey);
            payloads.add(object);
        }
    }
}

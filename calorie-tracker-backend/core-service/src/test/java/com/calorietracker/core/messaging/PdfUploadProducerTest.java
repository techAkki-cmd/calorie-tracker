package com.calorietracker.core.messaging;

import com.calorietracker.core.config.RabbitMQConfig;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.connection.CorrelationData;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfUploadProducerTest {

    @Test
    void sendsPayloadToPdfUploadQueue() {
        RecordingRabbitTemplate rabbitTemplate = new RecordingRabbitTemplate(true);
        PdfUploadProducer producer = new PdfUploadProducer(rabbitTemplate);
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        producer.sendPdfForProcessing(jobId, userId, "s3://imports/january.pdf");

        assertThat(rabbitTemplate.routingKeys).containsExactly(RabbitMQConfig.PDF_UPLOAD_QUEUE);
        assertThat(rabbitTemplate.payloads)
                .containsExactly(new PdfUploadMessage(jobId, userId, "s3://imports/january.pdf"));
    }

    @Test
    void failsPublicationWhenBrokerNacksMessage() {
        PdfUploadProducer producer = new PdfUploadProducer(new RecordingRabbitTemplate(false));

        assertThatThrownBy(() -> producer.sendPdfForProcessing(
                UUID.randomUUID(), UUID.randomUUID(), "diary.pdf"))
                .isInstanceOf(org.springframework.amqp.AmqpException.class)
                .hasMessageContaining("rejected PDF import");
    }

    /**
     * RabbitTemplate is a concrete class. A recorder subclass avoids Mockito's ByteBuddy
     * MockMaker, which some sandboxed JVMs refuse to load.
     */
    private static final class RecordingRabbitTemplate extends RabbitTemplate {

        private final List<String> routingKeys = new ArrayList<>();
        private final List<Object> payloads = new ArrayList<>();
        private final boolean acknowledged;

        private RecordingRabbitTemplate(boolean acknowledged) {
            this.acknowledged = acknowledged;
        }

        @Override
        public void convertAndSend(String exchange, String routingKey, Object object,
                                   CorrelationData correlationData) {
            routingKeys.add(routingKey);
            payloads.add(object);
            correlationData.getFuture().complete(new CorrelationData.Confirm(
                    acknowledged, acknowledged ? null : "broker unavailable"));
        }
    }
}

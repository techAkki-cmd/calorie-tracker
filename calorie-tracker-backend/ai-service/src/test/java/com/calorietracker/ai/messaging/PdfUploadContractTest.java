package com.calorietracker.ai.messaging;

import com.calorietracker.ai.config.RabbitMQConfig;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.SmartMessageConverter;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the wire contract between core-service's producer and this service's listener. The two
 * PdfUploadMessage records are intentionally separate classes, so only the JSON shape ties them
 * together.
 */
class PdfUploadContractTest {

    private static final String CORE_TYPE_ID = "com.calorietracker.core.messaging.PdfUploadMessage";

    /** The production bean, so the TypeId mapping is what is under test. */
    private final SmartMessageConverter converter =
            (SmartMessageConverter) new RabbitMQConfig().jsonMessageConverter(JsonMapper.builder().build());

    @Test
    void deserializesMessageProducedByCoreService() {
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Message message = coreProducedMessage("""
                {"jobId":"%s","userId":"%s","fileReference":"s3://imports/january.pdf"}"""
                .formatted(jobId, userId));

        Object converted = converter.fromMessage(message);

        assertThat(converted).isInstanceOf(PdfUploadMessage.class);
        PdfUploadMessage payload = (PdfUploadMessage) converted;
        assertThat(payload.jobId()).isEqualTo(jobId);
        assertThat(payload.userId()).isEqualTo(userId);
        assertThat(payload.fileReference()).isEqualTo("s3://imports/january.pdf");
    }

    /**
     * The producer stamps __TypeId__ with a class that does not exist here. The consumer maps that
     * name onto its own record instead of trying to load the foreign class.
     */
    @Test
    void mapsForeignTypeIdHeaderToLocalRecord() {
        Message message = coreProducedMessage("""
                {"jobId":"%s","userId":"%s","fileReference":"ref"}"""
                .formatted(UUID.randomUUID(), UUID.randomUUID()));

        String typeId = message.getMessageProperties().getHeader("__TypeId__");
        assertThat(typeId).isEqualTo(CORE_TYPE_ID);

        Object converted = converter.fromMessage(message);
        assertThat(converted).isInstanceOf(PdfUploadMessage.class);
    }

    @Test
    void prefersListenerInferredTypeOverTypeIdHeader() {
        UUID userId = UUID.randomUUID();
        Message message = coreProducedMessage("""
                {"jobId":"%s","userId":"%s","fileReference":"listener-path"}"""
                .formatted(UUID.randomUUID(), userId));
        message.getMessageProperties().setInferredArgumentType(PdfUploadMessage.class);

        Object converted = converter.fromMessage(message);

        assertThat(converted).isInstanceOf(PdfUploadMessage.class);
        assertThat(((PdfUploadMessage) converted).fileReference()).isEqualTo("listener-path");
    }

    private static Message coreProducedMessage(String json) {
        MessageProperties properties = new MessageProperties();
        properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        properties.setHeader("__TypeId__", CORE_TYPE_ID);
        return new Message(json.getBytes(StandardCharsets.UTF_8), properties);
    }
}

package com.calorietracker.ai.messaging;

import com.calorietracker.ai.config.RabbitMQConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.core.MessageListener;
import static org.assertj.core.api.Assertions.assertThat;

/** Requires a disposable broker; queue names match the real production topology. */
@EnabledIfEnvironmentVariable(named = "TEST_RABBIT_PORT", matches = ".+")
class DeadLetterRoutingTest {
    @Test
    void rejectedConsumerFailureReachesDeadLetterQueue() {
        var connection = new CachingConnectionFactory("127.0.0.1",
                Integer.parseInt(System.getenv("TEST_RABBIT_PORT")));
        var listener = new SimpleMessageListenerContainer(connection);
        try {
            var config = new RabbitMQConfig();
            var admin = new RabbitAdmin(connection);
            admin.declareExchange(config.pdfDeadLetterExchange());
            admin.declareQueue(config.pdfDeadLetterQueue());
            admin.declareBinding(config.pdfDeadLetterBinding());
            admin.declareQueue(config.pdfUploadQueue());
            listener.setQueueNames(RabbitMQConfig.PDF_UPLOAD_QUEUE);
            listener.setDefaultRequeueRejected(false);
            listener.setMessageListener((MessageListener) message -> {
                throw new IllegalStateException("Simulated downstream failure");
            });
            listener.start();
            var template = new RabbitTemplate(connection);
            template.convertAndSend(RabbitMQConfig.PDF_UPLOAD_QUEUE, "failed-import");
            var deadLetter = template.receive("pdf.upload.dlq", 10000);
            assertThat(deadLetter).isNotNull();
            assertThat(deadLetter.getMessageProperties().getHeaders()).containsKey("x-death");
            assertThat(new String(deadLetter.getBody(), java.nio.charset.StandardCharsets.UTF_8))
                    .isEqualTo("failed-import");
        } finally {
            listener.stop();
            connection.destroy();
        }
    }
}

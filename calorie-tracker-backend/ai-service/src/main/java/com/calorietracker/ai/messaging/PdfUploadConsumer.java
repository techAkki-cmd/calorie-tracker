package com.calorietracker.ai.messaging;

import com.calorietracker.ai.config.RabbitMQConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class PdfUploadConsumer {

    @RabbitListener(queues = RabbitMQConfig.PDF_UPLOAD_QUEUE)
    public void receivePdfUpload(PdfUploadMessage message) {
        // Parsing arrives in the next phase; for now the receipt is only recorded.
        log.info("Received PDF upload for user {} at reference {}",
                message.userId(), message.fileReference());
    }
}

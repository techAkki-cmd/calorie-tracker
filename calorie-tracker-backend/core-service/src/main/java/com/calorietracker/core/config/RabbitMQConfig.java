package com.calorietracker.core.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class RabbitMQConfig {

    public static final String PDF_UPLOAD_QUEUE = "pdf.upload.queue";

    /**
     * Declared in both the producing and consuming service so either can start first.
     */
    @Bean
    public Queue pdfUploadQueue() {
        return QueueBuilder.durable(PDF_UPLOAD_QUEUE).build();
    }

    /**
     * Jackson 3 converter. The legacy Jackson2JsonMessageConverter also ships in spring-amqp but
     * binds to com.fasterxml.jackson.databind, which Boot 4 no longer puts on the classpath.
     */
    @Bean
    public MessageConverter jsonMessageConverter(JsonMapper jsonMapper) {
        return new JacksonJsonMessageConverter(jsonMapper);
    }
}

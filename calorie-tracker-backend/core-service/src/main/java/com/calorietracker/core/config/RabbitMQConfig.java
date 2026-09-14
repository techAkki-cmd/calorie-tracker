package com.calorietracker.core.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
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
        return QueueBuilder.durable(PDF_UPLOAD_QUEUE)
                .deadLetterExchange("pdf.upload.dlx")
                .deadLetterRoutingKey("pdf.upload.failed").build();
    }

    @Bean
    public DirectExchange pdfDeadLetterExchange() {
        return new DirectExchange("pdf.upload.dlx", true, false);
    }

    @Bean
    public Queue pdfDeadLetterQueue() {
        return QueueBuilder.durable("pdf.upload.dlq").build();
    }

    @Bean
    public Binding pdfDeadLetterBinding() {
        return BindingBuilder.bind(pdfDeadLetterQueue()).to(pdfDeadLetterExchange())
                .with("pdf.upload.failed");
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

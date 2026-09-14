package com.calorietracker.ai.config;

import com.calorietracker.ai.messaging.PdfUploadMessage;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.DefaultJacksonJavaTypeMapper;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;

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
     *
     * <p>The producer stamps {@code __TypeId__} with core-service's FQCN. That class does not exist
     * here, and it is not in the default trusted packages, so a TypeId-first conversion fails.
     * Mapping the foreign name onto this service's record lets conversion succeed even when the
     * listener has not set {@code inferredArgumentType}.
     */
    @Bean
    public MessageConverter jsonMessageConverter(JsonMapper jsonMapper) {
        JacksonJsonMessageConverter converter = new JacksonJsonMessageConverter(jsonMapper);
        DefaultJacksonJavaTypeMapper typeMapper = (DefaultJacksonJavaTypeMapper) converter.getJavaTypeMapper();
        typeMapper.setIdClassMapping(Map.of(
                "com.calorietracker.core.messaging.PdfUploadMessage", PdfUploadMessage.class));
        return converter;
    }
}

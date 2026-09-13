package com.calorietracker.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    /**
     * The key travels as a header rather than a query parameter so it stays out of request URIs,
     * access logs and exception messages.
     */
    @Bean
    WebClient geminiWebClient(WebClient.Builder builder,
                              @Value("${gemini.base-url}") String baseUrl,
                              @Value("${gemini.api.key}") String apiKey) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader("x-goog-api-key", apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Internal hop to core-service. Goes around the gateway so this service does not need a JWT.
     */
    @Bean
    WebClient coreServiceWebClient(WebClient.Builder builder,
                                   @Value("${core-service.base-url}") String baseUrl) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}

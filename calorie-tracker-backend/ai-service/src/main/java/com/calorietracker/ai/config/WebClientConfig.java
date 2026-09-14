package com.calorietracker.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.DefaultUriBuilderFactory;

@Configuration
public class WebClientConfig {

    /**
     * Built with WebClient.builder() rather than an injected Builder: Boot 4 does not always
     * expose WebClient.Builder when servlet web and webflux share the classpath.
     * EncodingMode.NONE keeps the generateContent colon unescaped; Google 404s on %3A.
     */
    @Bean
    WebClient geminiWebClient(@Value("${gemini.base-url}") String baseUrl,
                              @Value("${gemini.api.key}") String apiKey) {
        DefaultUriBuilderFactory uris = new DefaultUriBuilderFactory(baseUrl);
        uris.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.NONE);
        return WebClient.builder()
                .uriBuilderFactory(uris)
                .baseUrl(baseUrl)
                .defaultHeader("x-goog-api-key", apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Bean
    WebClient coreServiceWebClient(@Value("${core-service.base-url}") String baseUrl,
                                  @Value("${INTERNAL_API_KEY}") String internalApiKey) {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            throw new IllegalArgumentException("INTERNAL_API_KEY must not be blank");
        }
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Secret", internalApiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}

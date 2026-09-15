package com.calorietracker.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.scheduler.Schedulers;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Shared bounded retry policy for transient Gemini failures. The caller's block timeout remains
 * the total request deadline, so retries cannot hold a servlet or listener thread indefinitely.
 */
@Slf4j
final class GeminiRetryPolicy {

    private static final int MAX_RETRIES = 2;

    private GeminiRetryPolicy() {
    }

    static Retry forOperation(String operation) {
        return Retry.backoff(MAX_RETRIES, Duration.ofMillis(500))
                .maxBackoff(Duration.ofSeconds(2))
                .jitter(0.5)
                .scheduler(Schedulers.boundedElastic())
                .filter(GeminiRetryPolicy::isTransient)
                .doBeforeRetry(signal -> log.warn(
                        "Retrying Gemini {} after transient failure (attempt {} of {})",
                        operation,
                        signal.totalRetries() + 1,
                        MAX_RETRIES))
                .onRetryExhaustedThrow((spec, signal) -> signal.failure());
    }

    private static boolean isTransient(Throwable failure) {
        if (failure instanceof WebClientRequestException) {
            return true;
        }
        if (!(failure instanceof WebClientResponseException response)) {
            return false;
        }
        int status = response.getStatusCode().value();
        return status == 408 || status == 429 || status >= 500;
    }
}

package com.calorietracker.ai.client;

import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.PdfImportJobStatus;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;

@Component
public class CoreMealClient {

    private final WebClient coreServiceWebClient;

    public CoreMealClient(@Qualifier("coreServiceWebClient") WebClient coreServiceWebClient) {
        this.coreServiceWebClient = coreServiceWebClient;
    }

    public void postBulk(UUID userId, List<ImportedMealRequest> meals) {
        coreServiceWebClient.post()
                .uri("/api/meals/bulk")
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(meals)
                .retrieve()
                .toBodilessEntity()
                .block(Duration.ofSeconds(15));
    }

    public void postMeal(UUID userId, ImportedMealRequest meal) {
        coreServiceWebClient.post()
                .uri("/api/meals")
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(meal)
                .retrieve()
                .toBodilessEntity()
                .block(Duration.ofSeconds(15));
    }

    public void updateImportJobStatus(UUID jobId, PdfImportJobStatus status) {
        coreServiceWebClient.patch()
                .uri("/api/internal/import-jobs/{jobId}", jobId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("status", status.name()))
                .retrieve()
                .toBodilessEntity()
                .block(Duration.ofSeconds(15));
    }

    /**
     * Raw JSON from core-service so Gemini can summarize without an extra DTO mapping layer.
     */
    public String listMealsRaw(UUID userId, LocalDate start, LocalDate end) {
        String body = coreServiceWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/meals")
                        .queryParam("startDate", start)
                        .queryParam("endDate", end)
                        .queryParam("size", 100)
                        .build())
                .header("X-User-Id", userId.toString())
                .retrieve()
                .bodyToMono(String.class)
                .block(Duration.ofSeconds(15));
        return body == null || body.isBlank() ? "{\"content\":[]}" : body;
    }

    public Optional<String> getGoalRaw(UUID userId) {
        return coreServiceWebClient.get()
                .uri("/api/goals")
                .header("X-User-Id", userId.toString())
                .exchangeToMono(response -> {
                    if (response.statusCode().isSameCodeAs(HttpStatus.NOT_FOUND)) {
                        return response.releaseBody().thenReturn(Optional.<String>empty());
                    }
                    if (response.statusCode().isError()) {
                        return response.createException().flatMap(Mono::error);
                    }
                    return response.bodyToMono(String.class).map(Optional::ofNullable);
                })
                .blockOptional(Duration.ofSeconds(15))
                .orElseGet(Optional::empty);
    }
}

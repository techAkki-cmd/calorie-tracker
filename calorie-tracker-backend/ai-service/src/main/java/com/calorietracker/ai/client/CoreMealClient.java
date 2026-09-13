package com.calorietracker.ai.client;

import com.calorietracker.ai.dto.ImportedMealRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.UUID;

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
                .block();
    }
}

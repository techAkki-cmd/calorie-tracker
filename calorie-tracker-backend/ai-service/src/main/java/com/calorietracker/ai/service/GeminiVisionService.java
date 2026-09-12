package com.calorietracker.ai.service;

import com.calorietracker.ai.dto.GeminiGenerateContentResponse;
import com.calorietracker.ai.dto.NutritionExtractionResponse;
import com.calorietracker.ai.exception.AiExtractionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiVisionService {

    private static final String PROMPT = """
            Estimate the nutrition of the food in this image.
            Reply with JSON only: calories (kcal, integer), protein, carbs, fat (grams).""";

    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "calories", Map.of("type", "integer"),
                    "protein", Map.of("type", "number"),
                    "carbs", Map.of("type", "number"),
                    "fat", Map.of("type", "number")),
            "required", List.of("calories", "protein", "carbs", "fat"));

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public GeminiVisionService(WebClient geminiWebClient,
                               ObjectMapper objectMapper,
                               @Value("${gemini.model}") String model) {
        this.geminiWebClient = geminiWebClient;
        this.objectMapper = objectMapper;
        this.model = model;
    }

    public NutritionExtractionResponse extractNutritionFromImage(MultipartFile image) {
        String encodedImage = encode(image);

        GeminiGenerateContentResponse response = geminiWebClient.post()
                .uri("/models/{model}:generateContent", model)
                .bodyValue(requestBody(encodedImage, image.getContentType()))
                .retrieve()
                .bodyToMono(GeminiGenerateContentResponse.class)
                .block();

        String json = response == null
                ? null
                : response.firstText().orElse(null);

        if (json == null || json.isBlank()) {
            throw AiExtractionException.badGateway("The model returned no usable content for this image");
        }

        return parseNutrition(json);
    }

    private String encode(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw AiExtractionException.badRequest("An image file is required");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw AiExtractionException.badRequest("Uploaded file must be an image");
        }

        try {
            return Base64.getEncoder().encodeToString(image.getBytes());
        } catch (IOException ex) {
            throw AiExtractionException.badRequest("Uploaded image could not be read");
        }
    }

    private Map<String, Object> requestBody(String encodedImage, String mimeType) {
        return Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", PROMPT),
                        Map.of("inline_data", Map.of(
                                "mime_type", mimeType,
                                "data", encodedImage))))),
                "generationConfig", Map.of(
                        "response_mime_type", "application/json",
                        "response_schema", RESPONSE_SCHEMA));
    }

    /**
     * The candidate text is itself a JSON document, so the envelope and the payload are decoded
     * separately.
     */
    private NutritionExtractionResponse parseNutrition(String json) {
        try {
            return objectMapper.readValue(json, NutritionExtractionResponse.class);
        } catch (JacksonException ex) {
            log.warn("Gemini returned content that is not valid nutrition JSON: {}", ex.getMessage());
            throw AiExtractionException.badGateway("The model response could not be parsed as nutrition data");
        }
    }
}

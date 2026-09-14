package com.calorietracker.ai.service;

import com.calorietracker.ai.dto.GeminiGenerateContentResponse;
import com.calorietracker.ai.dto.NutritionDiaryEnvelope;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.dto.NutritionExtractionResponse;
import com.calorietracker.ai.exception.AiExtractionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class GeminiVisionService {

    private static final String IMAGE_PROMPT = """
            Estimate the nutrition of the food in this image.
            Reply with JSON only: calories (kcal, integer), protein, carbs, fat (grams).""";

    private static final String DIARY_PROMPT = """
            Parse this nutrition diary into JSON only: an array of objects with name, mealType \
            (BREAKFAST, LUNCH, DINNER, SNACKS), quantity, calories (integer kcal), \
            protein, carbs, fat (grams).""";

    private static final Map<String, Object> IMAGE_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "calories", Map.of("type", "integer"),
                    "protein", Map.of("type", "number"),
                    "carbs", Map.of("type", "number"),
                    "fat", Map.of("type", "number")),
            "required", List.of("calories", "protein", "carbs", "fat"));

    private static final Map<String, Object> DIARY_ITEM_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "name", Map.of("type", "string"),
                    "mealType", Map.of("type", "string"),
                    "quantity", Map.of("type", "string"),
                    "calories", Map.of("type", "integer"),
                    "protein", Map.of("type", "number"),
                    "carbs", Map.of("type", "number"),
                    "fat", Map.of("type", "number")),
            "required", List.of("name", "mealType", "quantity", "calories", "protein", "carbs", "fat"));

    private static final Map<String, Object> DIARY_SCHEMA = Map.of(
            "type", "array",
            "items", DIARY_ITEM_SCHEMA);

    private static final TypeReference<List<NutritionDiaryItem>> DIARY_LIST_TYPE = new TypeReference<>() {
    };

    private static final Set<String> MEAL_TYPES = Set.of("BREAKFAST", "LUNCH", "DINNER", "SNACKS");

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public GeminiVisionService(@Qualifier("geminiWebClient") WebClient geminiWebClient,
                               ObjectMapper objectMapper,
                               @Value("${gemini.model}") String model) {
        this.geminiWebClient = geminiWebClient;
        this.objectMapper = objectMapper;
        this.model = model;
    }

    public NutritionExtractionResponse extractNutritionFromImage(MultipartFile image) {
        String encodedImage = encode(image);
        String json = generateJson(imageRequestBody(encodedImage, image.getContentType()));
        return parseNutrition(json);
    }

    public List<NutritionDiaryItem> parseNutritionDiary(String text) {
        if (text == null || text.isBlank()) {
            throw AiExtractionException.badRequest("Diary text is required");
        }

        String json = generateJson(diaryRequestBody(text));
        List<NutritionDiaryItem> parsed = parseDiaryItems(json);
        List<NutritionDiaryItem> usable = retainUsableRows(parsed);
        if (usable.isEmpty()) {
            throw AiExtractionException.badGateway("The model returned no usable diary entries");
        }
        return usable;
    }

    private String generateJson(Map<String, Object> requestBody) {
        GeminiGenerateContentResponse response = geminiWebClient.post()
                .uri("/v1beta/models/{model}:generateContent", model)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(GeminiGenerateContentResponse.class)
                .block(Duration.ofSeconds(15));

        String json = response == null ? null : response.firstText().orElse(null);
        if (json == null || json.isBlank()) {
            throw AiExtractionException.badGateway("The model returned no usable content");
        }
        return json;
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

    private Map<String, Object> imageRequestBody(String encodedImage, String mimeType) {
        return Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", IMAGE_PROMPT),
                        Map.of("inline_data", Map.of(
                                "mime_type", mimeType,
                                "data", encodedImage))))),
                "generationConfig", Map.of(
                        "response_mime_type", "application/json",
                        "response_schema", IMAGE_SCHEMA));
    }

    private Map<String, Object> diaryRequestBody(String text) {
        return Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", DIARY_PROMPT + "\n\n" + text)))),
                "generationConfig", Map.of(
                        "response_mime_type", "application/json",
                        "response_schema", DIARY_SCHEMA));
    }

    private NutritionExtractionResponse parseNutrition(String json) {
        try {
            return objectMapper.readValue(stripFences(json), NutritionExtractionResponse.class);
        } catch (JacksonException ex) {
            log.warn("Gemini returned content that is not valid nutrition JSON: {}", ex.getMessage());
            throw AiExtractionException.badGateway("The model response could not be parsed as nutrition data");
        }
    }

    /**
     * The candidate text is itself a JSON document. Fence wrapping and an {@code items} envelope
     * are both treated as recoverable hallucinations.
     */
    private List<NutritionDiaryItem> parseDiaryItems(String json) {
        String stripped = stripFences(json);
        try {
            List<NutritionDiaryItem> items = objectMapper.readValue(stripped, DIARY_LIST_TYPE);
            return items == null ? List.of() : items;
        } catch (JacksonException arrayFailed) {
            try {
                NutritionDiaryEnvelope envelope = objectMapper.readValue(stripped, NutritionDiaryEnvelope.class);
                if (envelope != null && envelope.items() != null) {
                    return envelope.items();
                }
            } catch (JacksonException ignored) {
                // Fall through to the original failure.
            }
            log.warn("Gemini returned content that is not a diary JSON array: {}", arrayFailed.getMessage());
            throw AiExtractionException.badGateway("The model response could not be parsed as diary entries");
        }
    }

    private List<NutritionDiaryItem> retainUsableRows(List<NutritionDiaryItem> items) {
        List<NutritionDiaryItem> usable = new ArrayList<>();
        for (NutritionDiaryItem item : items) {
            if (item == null || item.name() == null || item.name().isBlank()) {
                continue;
            }
            if (item.mealType() == null || !MEAL_TYPES.contains(item.mealType().toUpperCase(Locale.ROOT))) {
                continue;
            }
            if (item.quantity() == null || item.quantity().isBlank() || item.calories() == null
                    || item.protein() == null || item.carbs() == null || item.fat() == null) {
                continue;
            }
            usable.add(new NutritionDiaryItem(
                    item.name().trim(),
                    item.mealType().toUpperCase(Locale.ROOT),
                    item.quantity().trim(),
                    item.calories(),
                    item.protein(),
                    item.carbs(),
                    item.fat()));
        }
        return usable;
    }

    static String stripFences(String json) {
        String trimmed = json.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }
        int firstNewline = trimmed.indexOf('\n');
        int lastFence = trimmed.lastIndexOf("```");
        if (firstNewline < 0 || lastFence <= firstNewline) {
            return trimmed;
        }
        return trimmed.substring(firstNewline + 1, lastFence).trim();
    }
}

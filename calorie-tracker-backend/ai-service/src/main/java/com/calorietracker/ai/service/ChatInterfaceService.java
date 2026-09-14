package com.calorietracker.ai.service;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.dto.ChatClassification;
import com.calorietracker.ai.dto.GeminiGenerateContentResponse;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.exception.AiExtractionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class ChatInterfaceService {

    private static final String SYSTEM_PROMPT = """
            You are a calorie-tracker assistant. Classify the user message as exactly one action:
            LOG_MEAL (they ate or drank something to record),
            CHECK_GOALS (they ask about calorie/macro/weight targets),
            GET_SUMMARY (they ask what they ate or a daily recap),
            GENERAL_NUTRITION (anything else about food or nutrition).
            Reply with JSON only: intent, optional meal (name, mealType BREAKFAST|LUNCH|DINNER|SNACKS, \
            quantity, calories integer, protein, carbs, fat grams) when intent is LOG_MEAL, \
            optional reply (short spoken answer) when intent is GENERAL_NUTRITION.""";

    private static final String SUMMARIZE_PROMPT = """
            Write a brief conversational summary for the user using only this data. \
            Do not invent numbers that are not present.""";

    private static final Map<String, Object> MEAL_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "name", Map.of("type", "string"),
                    "mealType", Map.of("type", "string"),
                    "quantity", Map.of("type", "string"),
                    "calories", Map.of("type", "integer"),
                    "protein", Map.of("type", "number"),
                    "carbs", Map.of("type", "number"),
                    "fat", Map.of("type", "number")));

    private static final Map<String, Object> CLASSIFY_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "intent", Map.of(
                            "type", "string",
                            "enum", List.of("LOG_MEAL", "CHECK_GOALS", "GET_SUMMARY", "GENERAL_NUTRITION")),
                    "meal", MEAL_SCHEMA,
                    "reply", Map.of("type", "string")),
            "required", List.of("intent"));

    private static final Set<String> MEAL_TYPES = Set.of("BREAKFAST", "LUNCH", "DINNER", "SNACKS");

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final CoreMealClient coreMealClient;
    private final String model;

    public ChatInterfaceService(@Qualifier("geminiWebClient") WebClient geminiWebClient,
                                ObjectMapper objectMapper,
                                CoreMealClient coreMealClient,
                                @Value("${gemini.model}") String model) {
        this.geminiWebClient = geminiWebClient;
        this.objectMapper = objectMapper;
        this.coreMealClient = coreMealClient;
        this.model = model;
    }

    public String handleChat(UUID userId, String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            throw AiExtractionException.badRequest("A chat message is required");
        }

        ChatClassification classification = classify(userMessage);
        return switch (classification.resolvedIntent()) {
            case LOG_MEAL -> logMeal(userId, classification.meal());
            case CHECK_GOALS -> summarize("goals and today's meals", fetchGoalsAndToday(userId));
            case GET_SUMMARY -> summarize("today's meals", fetchTodayMeals(userId));
            case GENERAL_NUTRITION -> generalReply(userMessage, classification.reply());
        };
    }

    private ChatClassification classify(String userMessage) {
        String json = generateJson(userMessage);
        try {
            ChatClassification parsed = objectMapper.readValue(stripFences(json), ChatClassification.class);
            return parsed == null
                    ? new ChatClassification("GENERAL_NUTRITION", null, null)
                    : parsed;
        } catch (JacksonException ex) {
            log.warn("Gemini returned content that is not a chat classification: {}", ex.getMessage());
            throw AiExtractionException.badGateway("The model response could not be parsed as a chat intent");
        }
    }

    private String logMeal(UUID userId, NutritionDiaryItem meal) {
        if (!isUsableMeal(meal)) {
            return "I can log that, but I need a food name, meal type (breakfast, lunch, dinner, or snacks), "
                    + "quantity, and calories with protein, carbs, and fat.";
        }

        ImportedMealRequest request = toImportedMeal(meal);
        coreMealClient.postMeal(userId, request);
        return "Logged " + request.name() + " (" + request.calories() + " kcal) as " + request.mealType() + ".";
    }

    private String summarize(String label, String rawData) {
        String prompt = SUMMARIZE_PROMPT + "\nTopic: " + label + "\nData:\n" + rawData;
        return generateText(prompt);
    }

    private String generalReply(String userMessage, String classifiedReply) {
        if (classifiedReply != null && !classifiedReply.isBlank()) {
            return classifiedReply.trim();
        }
        return generateText("Answer this nutrition question briefly:\n" + userMessage);
    }

    private String fetchTodayMeals(UUID userId) {
        LocalDate today = LocalDate.now();
        return coreMealClient.listMealsRaw(userId, today, today);
    }

    private String fetchGoalsAndToday(UUID userId) {
        String goals = coreMealClient.getGoalRaw(userId).orElse("none");
        return "goals=" + goals + "\nmeals=" + fetchTodayMeals(userId);
    }

    private String generateJson(String userMessage) {
        return firstText(Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", SYSTEM_PROMPT))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userMessage)))),
                "generationConfig", Map.of(
                        "response_mime_type", "application/json",
                        "response_schema", CLASSIFY_SCHEMA)));
    }

    private String generateText(String prompt) {
        return firstText(Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))))));
    }

    private String firstText(Map<String, Object> requestBody) {
        GeminiGenerateContentResponse response = geminiWebClient.post()
                .uri("/v1beta/models/{model}:generateContent", model)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(GeminiGenerateContentResponse.class)
                .block(Duration.ofSeconds(15));

        String text = response == null ? null : response.firstText().orElse(null);
        if (text == null || text.isBlank()) {
            throw AiExtractionException.badGateway("The model returned no usable content");
        }
        return text;
    }

    private static boolean isUsableMeal(NutritionDiaryItem item) {
        if (item == null || item.name() == null || item.name().isBlank()) {
            return false;
        }
        if (item.mealType() == null || !MEAL_TYPES.contains(item.mealType().toUpperCase(Locale.ROOT))) {
            return false;
        }
        return item.quantity() != null && !item.quantity().isBlank()
                && item.calories() != null
                && item.protein() != null
                && item.carbs() != null
                && item.fat() != null;
    }

    private static ImportedMealRequest toImportedMeal(NutritionDiaryItem item) {
        return new ImportedMealRequest(
                item.name().trim(),
                item.mealType().toUpperCase(Locale.ROOT),
                item.quantity().trim(),
                item.calories(),
                scale(item.protein()),
                scale(item.carbs()),
                scale(item.fat()),
                null,
                LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
    }

    private static BigDecimal scale(Double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private static String stripFences(String json) {
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

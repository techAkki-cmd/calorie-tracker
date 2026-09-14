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

import java.time.LocalDate;
import java.util.List;
import java.time.Duration;
import java.util.Map;
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
            quantity, calories integer, protein, carbs, fat grams, consumedAtISO ISO-8601 with offset) when intent is LOG_MEAL, \
            optional reply (short spoken answer) when intent is GENERAL_NUTRITION.
            Preserve historical times from the message. Resolve relative dates using the supplied UTC
            reference time. Assume UTC if no timezone is given; date-only meals use midnight UTC.""";

    private static final String SUMMARIZE_PROMPT = """
            Write a brief conversational summary for the user using only this data. \
            Do not invent numbers that are not present.""";

    private static final Map<String, Object> MEAL_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "consumedAtISO", Map.of("type", "string"),
                    "name", Map.of("type", "string"),
                    "mealType", Map.of("type", "string"),
                    "quantity", Map.of("type", "string"),
                    "calories", Map.of("type", "integer"),
                    "protein", Map.of("type", "number"),
                    "carbs", Map.of("type", "number"),
                    "fat", Map.of("type", "number")),
            "required", List.of("name", "mealType", "quantity", "calories", "protein", "carbs", "fat", "consumedAtISO"));

    private static final Map<String, Object> CLASSIFY_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "intent", Map.of(
                            "type", "string",
                            "enum", List.of("LOG_MEAL", "CHECK_GOALS", "GET_SUMMARY", "GENERAL_NUTRITION")),
                    "meal", MEAL_SCHEMA,
                    "reply", Map.of("type", "string")),
            "required", List.of("intent"));

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final CoreMealClient coreMealClient;
    private final String model;
    private final jakarta.validation.Validator validator;

    public ChatInterfaceService(@Qualifier("geminiWebClient") WebClient geminiWebClient,
                                ObjectMapper objectMapper,
                                CoreMealClient coreMealClient,
                                @Value("${gemini.model}") String model, jakarta.validation.Validator validator) {
        this.geminiWebClient = geminiWebClient;
        this.objectMapper = objectMapper;
        this.coreMealClient = coreMealClient;
        this.model = model;
        this.validator = validator;
    }

    public String handleChat(UUID userId, String userMessage, String requestId) {
        if (userMessage == null || userMessage.isBlank()) {
            throw AiExtractionException.badRequest("A chat message is required");
        }

        ChatClassification classification = classify(userMessage);
        return switch (classification.resolvedIntent()) {
            case LOG_MEAL -> logMeal(userId, classification.meal(), requestId);
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

    private String logMeal(UUID userId, NutritionDiaryItem meal, String requestId) {
        if (requestId == null || requestId.isBlank()) {
            throw AiExtractionException.badRequest("A stable request ID is required for meal logging");
        }
        ImportedMealRequest request = MealValidation.meal(validator, userId, meal, "chat:" + requestId);
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
        LocalDate today = LocalDate.now(java.time.ZoneOffset.UTC);
        return coreMealClient.listMealsRaw(userId, today, today);
    }

    private String fetchGoalsAndToday(UUID userId) {
        String goals = coreMealClient.getGoalRaw(userId).orElse("none");
        return "goals=" + goals + "\nmeals=" + fetchTodayMeals(userId);
    }

    private String generateJson(String userMessage) {
        return firstText(Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", SYSTEM_PROMPT + "\nUTC reference time: " + java.time.Instant.now()))),
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

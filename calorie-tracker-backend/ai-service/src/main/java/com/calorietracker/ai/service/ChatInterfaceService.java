package com.calorietracker.ai.service;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.dto.ChatClassification;
import com.calorietracker.ai.dto.GeminiGenerateContentResponse;
import com.calorietracker.ai.dto.GoalProposal;
import com.calorietracker.ai.dto.GoalUpdateRequest;
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
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@Slf4j
public class ChatInterfaceService {

    private static final int WEEKLY_WINDOW_DAYS = 7;
    private static final int MIN_DAILY_CALORIES = 500;
    private static final int MAX_DAILY_CALORIES = 20000;
    private static final BigDecimal MAX_MACRO = new BigDecimal("9999.99");
    private static final BigDecimal MAX_WEIGHT = new BigDecimal("999.99");

    private static final Pattern AFFIRMATIVE = Pattern.compile(
            "(?i)^(y|yes|yeah|yep|ok|okay|sure|confirm|confirmed|save)"
                    + "(([,.]?\\s+)(please|do it|go ahead|save( it| them| those)?|confirm( it)?))?[.!]?$");
    private static final Pattern NEGATIVE = Pattern.compile(
            "(?i)^(n|no|nope|cancel|never mind|nevermind|don't|do not)([.!])?$");

    private static final String SYSTEM_PROMPT = """
            You are a calorie-tracker assistant. Classify the user message as exactly one action:
            LOG_MEAL (they ate or drank something to record),
            CHECK_GOALS (they ask about calorie/macro/weight targets),
            GET_SUMMARY (they ask what they ate today or want a daily recap),
            GET_WEEKLY_SUMMARY (they ask for a weekly recap, last 7 days, this week, or weekly totals),
            UPDATE_GOALS (they want to change calorie, macro, or weight targets),
            GENERAL_NUTRITION (anything else about food or nutrition).
            Reply with JSON only: intent, optional meal (name, mealType BREAKFAST|LUNCH|DINNER|SNACKS, \
            quantity, calories integer, protein, carbs, fat grams, consumedAtISO ISO-8601 with offset) when intent is LOG_MEAL, \
            optional goals (dailyCalorieTarget, proteinTarget, carbTarget, fatTarget, targetWeight) when intent is UPDATE_GOALS, \
            optional confirmed (true only if they already confirmed those goal values in this message), \
            optional reply (short spoken answer) when intent is GENERAL_NUTRITION.
            Preserve historical times from the message. Resolve relative dates using the supplied UTC
            reference time. Assume UTC if no timezone is given; date-only meals use midnight UTC.""";

    private static final String SUMMARIZE_PROMPT = """
            Write a concise, friendly nutrition summary using only the supplied data.
            Use clean Markdown with this exact presentation style:
            - Start with one short overview sentence.
            - Put each meal on its own bullet. Bold only the meal type or meal name, then include
              quantity, calories, protein, carbs, and fat on the same bullet.
            - Finish with a separate **Daily total** line containing calories and all three macros.
            - When goals are supplied, add one short **Goal progress** line using only calculated
              differences from the supplied values.
            Do not use nested lists, tables, raw JSON, repeated bullet markers, or invented values.
            Keep the complete response below 140 words.""";

    private static final String WEEKLY_SUMMARIZE_PROMPT = """
            Write a concise weekly nutrition recap using only the supplied weekly analytics and meals.
            Use clean Markdown with this exact presentation style:
            - Start with one short overview of the last 7 days.
            - Add a **Week totals** line for calories, protein, carbs, and fat.
            - Add a **Daily average** line for the same metrics.
            - When goals are supplied, add a **Vs goals** line comparing the daily average (or 7-day
              totals versus daily targets times 7) using only calculated differences.
            - Mention a notably high or low day only if the data shows it.
            Do not list every meal unless needed to explain a spike. Do not use nested lists, tables,
            raw JSON, repeated bullet markers, or invented values.
            Keep the complete response below 140 words.""";

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

    private static final Map<String, Object> GOALS_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "dailyCalorieTarget", Map.of("type", "integer"),
                    "proteinTarget", Map.of("type", "number"),
                    "carbTarget", Map.of("type", "number"),
                    "fatTarget", Map.of("type", "number"),
                    "targetWeight", Map.of("type", "number")));

    private static final Map<String, Object> CLASSIFY_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "intent", Map.of(
                            "type", "string",
                            "enum", List.of(
                                    "LOG_MEAL",
                                    "CHECK_GOALS",
                                    "GET_SUMMARY",
                                    "GET_WEEKLY_SUMMARY",
                                    "UPDATE_GOALS",
                                    "GENERAL_NUTRITION")),
                    "meal", MEAL_SCHEMA,
                    "goals", GOALS_SCHEMA,
                    "confirmed", Map.of("type", "boolean"),
                    "reply", Map.of("type", "string")),
            "required", List.of("intent"));

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final CoreMealClient coreMealClient;
    private final String model;
    private final jakarta.validation.Validator validator;
    private final ConcurrentHashMap<UUID, GoalUpdateRequest> pendingGoalUpdates = new ConcurrentHashMap<>();

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

        String pendingReply = resolvePendingGoalUpdate(userId, userMessage);
        if (pendingReply != null) {
            return pendingReply;
        }

        ChatClassification classification = classify(userMessage);
        return switch (classification.resolvedIntent()) {
            case LOG_MEAL -> logMeal(userId, classification.meal(), requestId);
            case CHECK_GOALS -> summarize("goals and today's meals", fetchGoalsAndToday(userId));
            case GET_SUMMARY -> summarize("today's meals", fetchTodayMeals(userId));
            case GET_WEEKLY_SUMMARY -> summarizeWeekly(userId);
            case UPDATE_GOALS -> proposeOrApplyGoals(userId, classification);
            case GENERAL_NUTRITION -> generalReply(userMessage, classification.reply());
        };
    }

    private ChatClassification classify(String userMessage) {
        String json = generateJson(userMessage);
        try {
            ChatClassification parsed = objectMapper.readValue(stripFences(json), ChatClassification.class);
            return parsed == null
                    ? new ChatClassification("GENERAL_NUTRITION", null, null, null, null)
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

    private String summarizeWeekly(UUID userId) {
        return summarize("last 7 days", fetchWeeklyContext(userId), WEEKLY_SUMMARIZE_PROMPT);
    }

    private String summarize(String label, String rawData) {
        return summarize(label, rawData, SUMMARIZE_PROMPT);
    }

    private String summarize(String label, String rawData, String promptTemplate) {
        String prompt = promptTemplate + "\nTopic: " + label + "\nData:\n" + rawData;
        return generateText(prompt);
    }

    private String generalReply(String userMessage, String classifiedReply) {
        if (classifiedReply != null && !classifiedReply.isBlank()) {
            return classifiedReply.trim();
        }
        return generateText("Answer this nutrition question briefly:\n" + userMessage);
    }

    private String fetchTodayMeals(UUID userId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return coreMealClient.listMealsRaw(userId, today, today);
    }

    private String fetchWeeklyContext(UUID userId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate start = today.minusDays(WEEKLY_WINDOW_DAYS - 1);
        return "weeklyAnalytics=" + coreMealClient.getWeeklyAnalyticsRaw(userId)
                + "\nmeals=" + coreMealClient.listMealsRaw(userId, start, today);
    }

    private String fetchGoalsAndToday(UUID userId) {
        String goals = coreMealClient.getGoalRaw(userId).orElse("none");
        return "goals=" + goals + "\nmeals=" + fetchTodayMeals(userId);
    }

    private String resolvePendingGoalUpdate(UUID userId, String userMessage) {
        GoalUpdateRequest pending = pendingGoalUpdates.get(userId);
        if (pending == null) {
            return null;
        }
        String trimmed = userMessage.trim();
        if (AFFIRMATIVE.matcher(trimmed).matches()) {
            coreMealClient.putGoal(userId, pending);
            pendingGoalUpdates.remove(userId);
            return "Updated your daily goals to " + formatGoals(pending) + ".";
        }
        if (NEGATIVE.matcher(trimmed).matches()) {
            pendingGoalUpdates.remove(userId);
            return "No change. Your goals were not updated.";
        }
        return null;
    }

    private String proposeOrApplyGoals(UUID userId, ChatClassification classification) {
        GoalUpdateRequest resolved = resolveGoalUpdate(userId, classification.goals());
        if (resolved == null) {
            return missingGoalFieldsMessage(userId, classification.goals());
        }
        if (Boolean.TRUE.equals(classification.confirmed())) {
            coreMealClient.putGoal(userId, resolved);
            pendingGoalUpdates.remove(userId);
            return "Updated your daily goals to " + formatGoals(resolved) + ".";
        }
        pendingGoalUpdates.put(userId, resolved);
        return "I'll set your daily goals to " + formatGoals(resolved)
                + ". Reply yes to save, or no to cancel.";
    }

    private GoalUpdateRequest resolveGoalUpdate(UUID userId, GoalProposal proposal) {
        GoalProposal existing = coreMealClient.getGoalRaw(userId)
                .map(this::parseGoals)
                .orElse(new GoalProposal(null, null, null, null, null));
        GoalProposal incoming = proposal == null
                ? new GoalProposal(null, null, null, null, null)
                : proposal;

        Integer calories = firstNonNull(incoming.dailyCalorieTarget(), existing.dailyCalorieTarget());
        BigDecimal protein = firstDecimal(incoming.proteinTarget(), existing.proteinTarget());
        BigDecimal carbs = firstDecimal(incoming.carbTarget(), existing.carbTarget());
        BigDecimal fat = firstDecimal(incoming.fatTarget(), existing.fatTarget());
        BigDecimal weight = firstDecimal(incoming.targetWeight(), existing.targetWeight());

        if (calories == null || protein == null || carbs == null || fat == null) {
            return null;
        }
        if (calories < MIN_DAILY_CALORIES || calories > MAX_DAILY_CALORIES
                || outOfRange(protein, MAX_MACRO) || outOfRange(carbs, MAX_MACRO) || outOfRange(fat, MAX_MACRO)
                || (weight != null && outOfRange(weight, MAX_WEIGHT))) {
            throw AiExtractionException.badRequest(
                    "Goal values must use 500–20000 kcal and non-negative protein, carbs, fat, and weight");
        }
        return new GoalUpdateRequest(calories, protein, carbs, fat, weight);
    }

    private String missingGoalFieldsMessage(UUID userId, GoalProposal proposal) {
        GoalProposal existing = coreMealClient.getGoalRaw(userId)
                .map(this::parseGoals)
                .orElse(new GoalProposal(null, null, null, null, null));
        GoalProposal incoming = proposal == null
                ? new GoalProposal(null, null, null, null, null)
                : proposal;
        List<String> missing = new ArrayList<>();
        if (firstNonNull(incoming.dailyCalorieTarget(), existing.dailyCalorieTarget()) == null) {
            missing.add("daily calories");
        }
        if (firstDecimal(incoming.proteinTarget(), existing.proteinTarget()) == null) {
            missing.add("protein");
        }
        if (firstDecimal(incoming.carbTarget(), existing.carbTarget()) == null) {
            missing.add("carbs");
        }
        if (firstDecimal(incoming.fatTarget(), existing.fatTarget()) == null) {
            missing.add("fat");
        }
        return "I can update your goals after I have daily calories plus protein, carbs, and fat targets. "
                + "Still needed: " + String.join(", ", missing) + ".";
    }

    private GoalProposal parseGoals(String json) {
        try {
            GoalProposal parsed = objectMapper.readValue(json, GoalProposal.class);
            return parsed == null ? new GoalProposal(null, null, null, null, null) : parsed;
        } catch (JacksonException ex) {
            log.warn("Could not parse stored goals: {}", ex.getMessage());
            return new GoalProposal(null, null, null, null, null);
        }
    }

    private static String formatGoals(GoalUpdateRequest goal) {
        String macros = goal.dailyCalorieTarget() + " kcal, "
                + formatDecimal(goal.proteinTarget()) + " g protein, "
                + formatDecimal(goal.carbTarget()) + " g carbs, and "
                + formatDecimal(goal.fatTarget()) + " g fat";
        if (goal.targetWeight() == null) {
            return macros;
        }
        return macros + ", target weight " + formatDecimal(goal.targetWeight()) + " kg";
    }

    private static String formatDecimal(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static boolean outOfRange(BigDecimal value, BigDecimal max) {
        return value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(max) > 0;
    }

    private static Integer firstNonNull(Integer primary, Integer fallback) {
        return primary != null ? primary : fallback;
    }

    private static BigDecimal firstDecimal(Double primary, Double fallback) {
        Double value = primary != null ? primary : fallback;
        return value == null ? null : decimal(value);
    }

    private static BigDecimal decimal(double value) {
        if (!Double.isFinite(value)) {
            throw AiExtractionException.badRequest("Goal values must be finite numbers");
        }
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
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
                .retryWhen(GeminiRetryPolicy.forOperation("chat completion"))
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

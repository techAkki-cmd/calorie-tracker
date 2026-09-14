package com.calorietracker.ai.service;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.exception.AiExtractionException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatInterfaceServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final UUID USER = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Test
    void logsMealAndCallsCore() {
        RecordingCoreClient core = new RecordingCoreClient();
        ChatInterfaceService service = service(core, envelope("""
                {"intent":"LOG_MEAL","meal":{"name":"Eggs","mealType":"BREAKFAST","quantity":"2","calories":140,"protein":12,"carbs":1,"fat":10,"consumedAtISO":"2026-01-01T08:00:00Z"}}
                """));

        String reply = service.handleChat(USER, "I ate eggs", "request-1");

        assertThat(reply).contains("Eggs").contains("140");
        assertThat(core.posted).hasSize(1);
        assertThat(core.posted.getFirst().name()).isEqualTo("Eggs");
        assertThat(core.posted.getFirst().mealType()).isEqualTo("BREAKFAST");
        assertThat(core.listed).isEmpty();
        assertThat(core.goalsLookedUp).isFalse();
    }

    @Test
    void incompleteLogMealDoesNotPost() {
        RecordingCoreClient core = new RecordingCoreClient();
        ChatInterfaceService service = service(core, envelope("""
                {"intent":"LOG_MEAL","meal":{"name":"Something"}}
                """));

        assertThatThrownBy(() -> service.handleChat(USER, "I ate something", "request-1"))
                .isInstanceOf(jakarta.validation.ConstraintViolationException.class);
        assertThat(core.posted).isEmpty();
    }

    @Test
    void checkGoalsFetchesCoreThenSummarizes() {
        RecordingCoreClient core = new RecordingCoreClient();
        core.goalsJson = "{\"dailyCalorieTarget\":2000}";
        core.mealsJson = "{\"content\":[]}";
        AtomicInteger calls = new AtomicInteger();
        ChatInterfaceService service = service(core, request -> {
            int n = calls.getAndIncrement();
            String body = n == 0
                    ? envelope("{\"intent\":\"CHECK_GOALS\"}")
                    : envelope("You are at 0 of 2000 calories today.");
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .build());
        });

        String reply = service.handleChat(USER, "how are my goals?", "request-1");

        assertThat(reply).contains("2000");
        assertThat(core.goalsLookedUp).isTrue();
        assertThat(core.listed).isNotEmpty();
        assertThat(core.posted).isEmpty();
        assertThat(calls.get()).isEqualTo(2);
    }

    @Test
    void generalNutritionDoesNotCallCore() {
        RecordingCoreClient core = new RecordingCoreClient();
        ChatInterfaceService service = service(core, envelope("""
                {"intent":"GENERAL_NUTRITION","reply":"Protein helps repair muscle."}
                """));

        String reply = service.handleChat(USER, "why is protein important?", "request-1");

        assertThat(reply).isEqualTo("Protein helps repair muscle.");
        assertThat(core.posted).isEmpty();
        assertThat(core.listed).isEmpty();
        assertThat(core.goalsLookedUp).isFalse();
    }

    @Test
    void rejectsMalformedClassifierJson() {
        RecordingCoreClient core = new RecordingCoreClient();
        ChatInterfaceService service = service(core, envelope("not-json"));

        assertThatThrownBy(() -> service.handleChat(USER, "hello", "request-1"))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("could not be parsed as a chat intent");
    }

    @Test
    void unknownIntentFallsBackToGeneralNutrition() {
        RecordingCoreClient core = new RecordingCoreClient();
        ChatInterfaceService service = service(core, envelope("""
                {"intent":"UNKNOWN_THING","reply":"I can help with meals and goals."}
                """));

        String reply = service.handleChat(USER, "xyz", "request-1");

        assertThat(reply).contains("meals and goals");
        assertThat(core.posted).isEmpty();
    }

    private static ChatInterfaceService service(RecordingCoreClient core, String geminiBody) {
        return service(core, request -> Mono.just(ClientResponse.create(HttpStatus.OK)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .body(geminiBody)
                .build()));
    }

    private static ChatInterfaceService service(RecordingCoreClient core, ExchangeFunction exchange) {
        WebClient gemini = WebClient.builder()
                .baseUrl("https://gemini.test/v1beta")
                .exchangeFunction(exchange)
                .build();
        return new ChatInterfaceService(gemini, MAPPER, core, "gemini-2.5-flash", com.calorietracker.ai.TestValidation.VALIDATOR);
    }

    private static String envelope(String modelText) {
        return MAPPER.writeValueAsString(Map.of(
                "candidates", List.of(Map.of(
                        "content", Map.of(
                                "parts", List.of(Map.of("text", modelText)),
                                "role", "model"),
                        "finishReason", "STOP"))));
    }

    private static final class RecordingCoreClient extends CoreMealClient {

        private final List<ImportedMealRequest> posted = new ArrayList<>();
        private final List<LocalDate> listed = new ArrayList<>();
        private boolean goalsLookedUp;
        private String goalsJson;
        private String mealsJson = "{\"content\":[]}";

        private RecordingCoreClient() {
            super(WebClient.builder().build());
        }

        @Override
        public void postMeal(UUID userId, ImportedMealRequest meal) {
            posted.add(meal);
        }

        @Override
        public String listMealsRaw(UUID userId, LocalDate start, LocalDate end) {
            listed.add(start);
            return mealsJson;
        }

        @Override
        public Optional<String> getGoalRaw(UUID userId) {
            goalsLookedUp = true;
            return Optional.ofNullable(goalsJson);
        }
    }
}

package com.calorietracker.ai.service;

import com.calorietracker.ai.dto.NutritionExtractionResponse;
import com.calorietracker.ai.exception.AiExtractionException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.HttpMessageWriter;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.mock.http.client.reactive.MockClientHttpRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.reactive.function.BodyInserter;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiVisionServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AtomicReference<String> capturedBody = new AtomicReference<>();

    @Test
    void mapsGeminiEnvelopeToNutritionDto() {
        String body = envelope("{\"calories\": 540, \"protein\": 31.5, \"carbs\": 44.0, \"fat\": 22.25}");

        NutritionExtractionResponse result = serviceReturning(HttpStatus.OK, body)
                .extractNutritionFromImage(image());

        assertThat(result.calories()).isEqualTo(540);
        assertThat(result.protein()).isEqualTo(31.5);
        assertThat(result.carbs()).isEqualTo(44.0);
        assertThat(result.fat()).isEqualTo(22.25);
    }

    @Test
    void sendsBase64ImageAndStrictJsonInstruction() {
        String body = envelope("{\"calories\": 100, \"protein\": 1, \"carbs\": 2, \"fat\": 3}");

        serviceReturning(HttpStatus.OK, body).extractNutritionFromImage(image());

        String sent = capturedBody.get();
        assertThat(sent).contains("inline_data");
        assertThat(sent).contains("image/jpeg");
        // Base64 of "fake-image-bytes", proving raw bytes are encoded rather than sent through.
        assertThat(sent).contains("ZmFrZS1pbWFnZS1ieXRlcw==");
        assertThat(sent).contains("\"response_mime_type\":\"application/json\"");
        assertThat(sent).contains("response_schema");
        assertThat(sent).contains("calories");
    }

    @Test
    void surfacesProviderErrorAsWebClientResponseException() {
        assertThatThrownBy(() -> serviceReturning(HttpStatus.TOO_MANY_REQUESTS, "{\"error\":\"quota\"}")
                .extractNutritionFromImage(image()))
                .isInstanceOf(WebClientResponseException.class)
                .satisfies(ex -> assertThat(((WebClientResponseException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    void rejectsNonJsonModelOutput() {
        assertThatThrownBy(() -> serviceReturning(HttpStatus.OK, envelope("I cannot tell what this is"))
                .extractNutritionFromImage(image()))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("could not be parsed");
    }

    @Test
    void rejectsCandidateFreeResponse() {
        assertThatThrownBy(() -> serviceReturning(HttpStatus.OK, "{\"candidates\": []}")
                .extractNutritionFromImage(image()))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("no usable content");
    }

    @Test
    void rejectsEmptyUpload() {
        MockMultipartFile empty = new MockMultipartFile("image", "meal.jpg", MediaType.IMAGE_JPEG_VALUE, new byte[0]);

        assertThatThrownBy(() -> serviceReturning(HttpStatus.OK, "{}").extractNutritionFromImage(empty))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("image file is required");
    }

    @Test
    void mapsDiaryArrayToItems() {
        String body = envelope("""
                [{"name":"Oatmeal","mealType":"BREAKFAST","quantity":"1 bowl","calories":320,"protein":10,"carbs":54,"fat":6}]
                """);

        var items = serviceReturning(HttpStatus.OK, body).parseNutritionDiary("oatmeal for breakfast");

        assertThat(items).hasSize(1);
        assertThat(items.getFirst().name()).isEqualTo("Oatmeal");
        assertThat(items.getFirst().mealType()).isEqualTo("BREAKFAST");
        assertThat(items.getFirst().calories()).isEqualTo(320);
    }

    @Test
    void stripsMarkdownFencesAroundDiaryArray() {
        String body = envelope("""
                ```json
                [{"name":"Apple","mealType":"SNACKS","quantity":"1","calories":95,"protein":0.5,"carbs":25,"fat":0.3}]
                ```
                """);

        var items = serviceReturning(HttpStatus.OK, body).parseNutritionDiary("apple");

        assertThat(items.getFirst().name()).isEqualTo("Apple");
        assertThat(items.getFirst().mealType()).isEqualTo("SNACKS");
    }

    @Test
    void acceptsItemsEnvelopeWhenArrayIsWrapped() {
        String body = envelope("""
                {"items":[{"name":"Rice","mealType":"lunch","quantity":"1 cup","calories":200,"protein":4,"carbs":45,"fat":0.5}]}
                """);

        var items = serviceReturning(HttpStatus.OK, body).parseNutritionDiary("rice");

        assertThat(items.getFirst().mealType()).isEqualTo("LUNCH");
    }

    @Test
    void rejectsInvalidDiaryJson() {
        assertThatThrownBy(() -> serviceReturning(HttpStatus.OK, envelope("not json"))
                .parseNutritionDiary("whatever"))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("could not be parsed as diary");
    }

    @Test
    void dropsRowsWithUnknownMealType() {
        String body = envelope("""
                [
                  {"name":"Mystery","mealType":"BRUNCH","quantity":"1","calories":1,"protein":1,"carbs":1,"fat":1},
                  {"name":"Eggs","mealType":"BREAKFAST","quantity":"2","calories":140,"protein":12,"carbs":1,"fat":10}
                ]
                """);

        var items = serviceReturning(HttpStatus.OK, body).parseNutritionDiary("diary");

        assertThat(items).extracting(com.calorietracker.ai.dto.NutritionDiaryItem::name)
                .containsExactly("Eggs");
    }

    @Test
    void sendsDiaryTextWithoutInlineImage() {
        String body = envelope("[]");

        assertThatThrownBy(() -> serviceReturning(HttpStatus.OK, body).parseNutritionDiary("eggs toast"))
                .isInstanceOf(AiExtractionException.class);

        assertThat(capturedBody.get()).doesNotContain("inline_data");
        assertThat(capturedBody.get()).contains("eggs toast");
        assertThat(capturedBody.get()).contains("BREAKFAST");
    }

    @Test
    void rejectsNonImageUpload() {
        MockMultipartFile pdf = new MockMultipartFile("image", "meal.pdf", MediaType.APPLICATION_PDF_VALUE,
                "not-an-image".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> serviceReturning(HttpStatus.OK, "{}").extractNutritionFromImage(pdf))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("must be an image");
    }

    private GeminiVisionService serviceReturning(HttpStatus status, String body) {
        ExchangeFunction exchange = request -> {
            capturedBody.set(serializeBody(request));
            return Mono.just(ClientResponse.create(status)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .build());
        };

        WebClient webClient = WebClient.builder()
                .baseUrl("https://gemini.test/v1beta")
                .exchangeFunction(exchange)
                .build();

        return new GeminiVisionService(webClient, MAPPER, "gemini-2.5-flash");
    }

    /**
     * Writes the outgoing body through the real message writers so assertions see the exact JSON
     * that would reach Gemini.
     */
    private static String serializeBody(ClientRequest request) {
        MockClientHttpRequest mockRequest = new MockClientHttpRequest(request.method(), request.url());
        request.body().insert(mockRequest, new BodyInserter.Context() {
            @Override
            public List<HttpMessageWriter<?>> messageWriters() {
                return ExchangeStrategies.withDefaults().messageWriters();
            }

            @Override
            public Optional<ServerHttpRequest> serverRequest() {
                return Optional.empty();
            }

            @Override
            public Map<String, Object> hints() {
                return Map.of();
            }
        }).block();

        return mockRequest.getBodyAsString().block();
    }

    /**
     * Mirrors a real generateContent envelope, including the metadata fields this service does not
     * model, so unknown-property tolerance stays covered.
     */
    private static String envelope(String modelText) {
        return MAPPER.writeValueAsString(Map.of(
                "candidates", List.of(Map.of(
                        "content", Map.of(
                                "parts", List.of(Map.of("text", modelText)),
                                "role", "model"),
                        "finishReason", "STOP",
                        "avgLogprobs", -0.12)),
                "usageMetadata", Map.of(
                        "promptTokenCount", 268,
                        "candidatesTokenCount", 41,
                        "totalTokenCount", 309),
                "modelVersion", "gemini-2.5-flash",
                "responseId", "abc123"));
    }

    private static MockMultipartFile image() {
        return new MockMultipartFile("image", "meal.jpg", MediaType.IMAGE_JPEG_VALUE,
                "fake-image-bytes".getBytes(StandardCharsets.UTF_8));
    }
}

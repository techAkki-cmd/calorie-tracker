package com.calorietracker.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Optional;

/**
 * Maps only the slice of Gemini's generateContent envelope this service needs. A response can be
 * candidate-free when the prompt or image trips a safety filter, so the text is returned as an
 * Optional rather than indexed into directly.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GeminiGenerateContentResponse(List<Candidate> candidates) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Candidate(Content content, String finishReason) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Content(List<Part> parts) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Part(String text) {
    }

    public Optional<String> firstText() {
        if (candidates == null || candidates.isEmpty()) {
            return Optional.empty();
        }
        Content content = candidates.getFirst().content();
        if (content == null || content.parts() == null || content.parts().isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(content.parts().getFirst().text());
    }
}

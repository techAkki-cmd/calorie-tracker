package com.calorietracker.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Locale;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ChatClassification(
        String intent,
        @jakarta.validation.Valid NutritionDiaryItem meal,
        GoalProposal goals,
        Boolean confirmed,
        String reply
) {

    public ChatIntent resolvedIntent() {
        if (intent == null || intent.isBlank()) {
            return ChatIntent.GENERAL_NUTRITION;
        }
        try {
            return ChatIntent.valueOf(intent.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return ChatIntent.GENERAL_NUTRITION;
        }
    }
}

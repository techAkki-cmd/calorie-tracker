package com.calorietracker.ai.service;

import com.calorietracker.ai.TestValidation;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.dto.NutritionExtractionResponse;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MealValidationTest {
    @Test
    void rejectsNegativeMissingAndNonfiniteMacros() {
        for (var response : new NutritionExtractionResponse[] {
                new NutritionExtractionResponse(-1, 1.0, 1.0, 1.0),
                new NutritionExtractionResponse(100, null, 1.0, 1.0),
                new NutritionExtractionResponse(100, Double.NaN, 1.0, 1.0),
                new NutritionExtractionResponse(100, Double.POSITIVE_INFINITY, 1.0, 1.0)}) {
            assertThatThrownBy(() -> MealValidation.validate(TestValidation.VALIDATOR, response))
                    .isInstanceOf(ConstraintViolationException.class);
        }
    }

    @Test
    void normalizesHistoricalOffsetAndKeepsRetryKeysStable() {
        var item = new NutritionDiaryItem("Rice", "LUNCH", "1 bowl", 100, 1.0, 1.0, 1.0,
                "2025-01-02T00:30:00+05:30");
        UUID user = UUID.randomUUID();
        var first = MealValidation.meal(TestValidation.VALIDATOR, user, item, "pdf:upload:0");
        var retry = MealValidation.meal(TestValidation.VALIDATOR, user, item, "pdf:upload:0");
        assertThat(first.consumedAt()).isEqualTo(Instant.parse("2025-01-01T19:00:00Z"));
        assertThat(first.idempotencyKey()).isEqualTo(retry.idempotencyKey()).hasSize(64);
        assertThat(MealValidation.meal(TestValidation.VALIDATOR, user, item, "pdf:upload:1")
                .idempotencyKey()).isNotEqualTo(first.idempotencyKey());
    }
}

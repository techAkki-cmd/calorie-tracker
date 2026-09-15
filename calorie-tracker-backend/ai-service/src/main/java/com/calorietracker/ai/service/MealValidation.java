package com.calorietracker.ai.service;

import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.exception.AiExtractionException;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

public final class MealValidation {
    private MealValidation() {}

    public static <T> T validate(Validator validator, T value) {
        if (value == null) throw AiExtractionException.badGateway("The model returned null nutrition data");
        var violations = validator.validate(value);
        if (!violations.isEmpty()) throw new ConstraintViolationException(violations);
        return value;
    }

    public static ImportedMealRequest meal(Validator validator, UUID userId, NutritionDiaryItem item,
                                           String sourceKey) {
        validate(validator, item);
        Instant consumedAt;
        try {
            consumedAt = OffsetDateTime.parse(item.consumedAtISO()).toInstant();
        } catch (DateTimeParseException ex) {
            throw AiExtractionException.badGateway("Meal timestamp must be ISO-8601 with an explicit offset");
        }
        if (consumedAt.isAfter(Instant.now())) {
            throw AiExtractionException.badGateway("Meal timestamp must not be in the future");
        }
        String key = hash(userId + "\n" + sourceKey);
        return new ImportedMealRequest(item.name().trim(), item.mealType().toUpperCase(Locale.ROOT),
                item.quantity().trim(), item.calories(), decimal(item.protein()), decimal(item.carbs()),
                decimal(item.fat()), item.micronutrientSummary().trim(), consumedAt, key);
    }

    public static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    private static BigDecimal decimal(Double value) {
        if (!Double.isFinite(value)) throw AiExtractionException.badGateway("Macros must be finite");
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}

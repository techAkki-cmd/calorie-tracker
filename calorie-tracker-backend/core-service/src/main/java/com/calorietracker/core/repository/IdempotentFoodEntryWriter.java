package com.calorietracker.core.repository;

import com.calorietracker.core.dto.FoodEntryRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.util.UUID;

/** PostgreSQL arbitrates concurrent retries inside the caller's transaction. */
@Repository
@RequiredArgsConstructor
public class IdempotentFoodEntryWriter {
    private final JdbcTemplate jdbcTemplate;

    public void insertIfAbsent(UUID userId, FoodEntryRequest request) {
        jdbcTemplate.update("""
                INSERT INTO food_entries
                    (id, user_id, name, meal_type, quantity, calories, protein, carbs, fat,
                     micronutrient_summary, consumed_at, idempotency_key, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, idempotency_key) DO NOTHING
                """,
                UUID.randomUUID(), userId, request.name(), request.mealType().name(),
                request.quantity(), request.calories(), request.protein(), request.carbs(),
                request.fat(), request.micronutrientSummary(), Timestamp.from(request.consumedAt()),
                request.idempotencyKey());
    }
}

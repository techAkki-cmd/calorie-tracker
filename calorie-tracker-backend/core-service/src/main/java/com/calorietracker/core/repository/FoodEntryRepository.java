package com.calorietracker.core.repository;

import com.calorietracker.core.model.FoodEntry;
import com.calorietracker.core.model.MealType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, UUID> {

    Page<FoodEntry> findByUserIdAndConsumedAtBetween(
            UUID userId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<FoodEntry> findByUserIdAndMealTypeAndConsumedAtBetween(
            UUID userId, MealType mealType, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Optional<FoodEntry> findByIdAndUserId(UUID id, UUID userId);
}

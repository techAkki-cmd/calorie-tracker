package com.calorietracker.core.service;

import com.calorietracker.core.dto.FoodEntryRequest;
import com.calorietracker.core.dto.FoodEntryResponse;
import com.calorietracker.core.dto.PagedResponse;
import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.FoodEntry;
import com.calorietracker.core.model.MealType;
import com.calorietracker.core.repository.FoodEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FoodEntryService {

    private final FoodEntryRepository foodEntryRepository;

    @Transactional
    public FoodEntryResponse logFoodEntry(UUID userId, FoodEntryRequest request) {
        FoodEntry entry = FoodEntry.builder()
                .userId(userId)
                .name(request.name())
                .mealType(request.mealType())
                .quantity(request.quantity())
                .calories(request.calories())
                .protein(request.protein())
                .carbs(request.carbs())
                .fat(request.fat())
                .micronutrientSummary(request.micronutrientSummary())
                .consumedAt(request.consumedAt())
                .build();

        // flush so Hibernate populates the audit timestamps before the response is built
        return toResponse(foodEntryRepository.saveAndFlush(entry));
    }

    @Transactional
    public void deleteFoodEntry(UUID entryId, UUID userId) {
        FoodEntry entry = foodEntryRepository.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No food entry " + entryId + " found for this user"));

        foodEntryRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public PagedResponse<FoodEntryResponse> getEntriesByTimeRange(UUID userId,
                                                                  LocalDateTime start,
                                                                  LocalDateTime end,
                                                                  MealType mealType,
                                                                  Pageable pageable) {
        Page<FoodEntry> entries = mealType == null
                ? foodEntryRepository.findByUserIdAndConsumedAtBetween(userId, start, end, pageable)
                : foodEntryRepository.findByUserIdAndMealTypeAndConsumedAtBetween(
                        userId, mealType, start, end, pageable);

        return PagedResponse.from(entries, this::toResponse);
    }

    private FoodEntryResponse toResponse(FoodEntry entry) {
        return new FoodEntryResponse(
                entry.getId(),
                entry.getUserId(),
                entry.getName(),
                entry.getMealType(),
                entry.getQuantity(),
                entry.getCalories(),
                entry.getProtein(),
                entry.getCarbs(),
                entry.getFat(),
                entry.getMicronutrientSummary(),
                entry.getConsumedAt(),
                entry.getCreatedAt(),
                entry.getUpdatedAt());
    }
}

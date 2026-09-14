package com.calorietracker.core.controller;

import com.calorietracker.core.dto.FoodEntryRequest;
import com.calorietracker.core.dto.FoodEntryResponse;
import com.calorietracker.core.dto.PagedResponse;
import com.calorietracker.core.model.MealType;
import com.calorietracker.core.service.FoodEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/meals")
@RequiredArgsConstructor
public class FoodEntryController {

    private final FoodEntryService foodEntryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodEntryResponse logMeal(@RequestHeader("X-User-Id") UUID userId,
                                     @Valid @RequestBody FoodEntryRequest request) {
        return foodEntryService.logFoodEntry(userId, request);
    }

    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public List<FoodEntryResponse> logMealsBulk(@RequestHeader("X-User-Id") UUID userId,
                                                @Valid @RequestBody List<@Valid FoodEntryRequest> requests) {
        return foodEntryService.logFoodEntries(userId, requests);
    }

    @GetMapping
    public PagedResponse<FoodEntryResponse> listEntries(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) MealType mealType,
            @PageableDefault(size = 20, sort = "consumedAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        return foodEntryService.getEntriesByTimeRange(
                userId,
                startDate.atStartOfDay().toInstant(ZoneOffset.UTC),
                endDate.atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC),
                mealType,
                pageable);
    }

    @DeleteMapping("/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMeal(@RequestHeader("X-User-Id") UUID userId,
                           @PathVariable UUID entryId) {
        foodEntryService.deleteFoodEntry(entryId, userId);
    }
}

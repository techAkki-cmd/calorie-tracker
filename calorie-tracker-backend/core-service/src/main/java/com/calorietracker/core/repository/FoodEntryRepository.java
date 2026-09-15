package com.calorietracker.core.repository;

import com.calorietracker.core.dto.DailyMacroRow;
import com.calorietracker.core.model.FoodEntry;
import com.calorietracker.core.model.MealType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, UUID> {

    Page<FoodEntry> findByUserIdAndConsumedAtGreaterThanEqualAndConsumedAtLessThan(
            UUID userId, Instant start, Instant end, Pageable pageable);

    Page<FoodEntry> findByUserIdAndMealTypeAndConsumedAtGreaterThanEqualAndConsumedAtLessThan(
            UUID userId, MealType mealType, Instant start, Instant end, Pageable pageable);

    Optional<FoodEntry> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    Optional<FoodEntry> findByIdAndUserId(UUID id, UUID userId);

    @Query(value = """
            select cast(e.consumed_at at time zone :timezone as date) as date,
                   coalesce(sum(e.calories), 0) as "totalCalories",
                   coalesce(sum(e.protein), 0) as "totalProtein",
                   coalesce(sum(e.carbs), 0) as "totalCarbs",
                   coalesce(sum(e.fat), 0) as "totalFat"
            from food_entries e
            where e.user_id = :userId
              and e.consumed_at >= :from
              and e.consumed_at < :to
            group by 1
            order by 1
            """, nativeQuery = true)
    List<DailyMacroRow> sumMacrosByDay(@Param("userId") UUID userId,
                                       @Param("from") Instant from,
                                       @Param("to") Instant to,
                                       @Param("timezone") String timezone);
}

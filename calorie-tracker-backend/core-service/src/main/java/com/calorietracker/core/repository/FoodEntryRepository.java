package com.calorietracker.core.repository;

import com.calorietracker.core.dto.DailyMacroRow;
import com.calorietracker.core.model.FoodEntry;
import com.calorietracker.core.model.MealType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, UUID> {

    Page<FoodEntry> findByUserIdAndConsumedAtBetween(
            UUID userId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<FoodEntry> findByUserIdAndMealTypeAndConsumedAtBetween(
            UUID userId, MealType mealType, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Optional<FoodEntry> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select new com.calorietracker.core.dto.DailyMacroRow(
                cast(e.consumedAt as LocalDate),
                coalesce(sum(e.calories), 0),
                coalesce(sum(e.protein), 0),
                coalesce(sum(e.carbs), 0),
                coalesce(sum(e.fat), 0))
            from FoodEntry e
            where e.userId = :userId
              and e.consumedAt >= :from
              and e.consumedAt < :to
            group by cast(e.consumedAt as LocalDate)
            order by cast(e.consumedAt as LocalDate)
            """)
    List<DailyMacroRow> sumMacrosByDay(@Param("userId") UUID userId,
                                       @Param("from") LocalDateTime from,
                                       @Param("to") LocalDateTime to);
}

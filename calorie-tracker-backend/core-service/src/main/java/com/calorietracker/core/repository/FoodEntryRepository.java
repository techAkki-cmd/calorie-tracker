package com.calorietracker.core.repository;

import com.calorietracker.core.model.FoodEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.UUID;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, UUID> {

    Page<FoodEntry> findByUserIdAndConsumedAtBetween(
            UUID userId, LocalDateTime start, LocalDateTime end, Pageable pageable);
}

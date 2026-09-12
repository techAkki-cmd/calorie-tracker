package com.calorietracker.core.repository;

import com.calorietracker.core.model.HealthGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface HealthGoalRepository extends JpaRepository<HealthGoal, UUID> {

    Optional<HealthGoal> findByUserId(UUID userId);
}

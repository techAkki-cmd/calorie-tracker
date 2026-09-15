package com.calorietracker.core.repository;

import com.calorietracker.core.model.PdfImportJob;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PdfImportJobRepository extends JpaRepository<PdfImportJob, UUID> {

    Optional<PdfImportJob> findByIdAndUserId(UUID id, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfImportJob job where job.id = :id")
    Optional<PdfImportJob> findByIdForUpdate(@Param("id") UUID id);
}

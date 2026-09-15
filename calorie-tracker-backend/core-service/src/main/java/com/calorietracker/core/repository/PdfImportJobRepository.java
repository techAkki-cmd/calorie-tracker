package com.calorietracker.core.repository;

import com.calorietracker.core.model.PdfImportJob;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface PdfImportJobRepository extends JpaRepository<PdfImportJob, UUID> {

    Optional<PdfImportJob> findByIdAndUserId(UUID id, UUID userId);

    Page<PdfImportJob> findAllByUserId(UUID userId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfImportJob job where job.id = :id")
    Optional<PdfImportJob> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from PdfImportJob job where job.id = :id and job.userId = :userId")
    Optional<PdfImportJob> findByIdAndUserIdForUpdate(@Param("id") UUID id,
                                                      @Param("userId") UUID userId);
}

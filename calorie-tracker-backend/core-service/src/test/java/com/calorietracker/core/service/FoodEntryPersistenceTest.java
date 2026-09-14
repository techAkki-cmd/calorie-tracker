package com.calorietracker.core.service;

import com.calorietracker.core.CoreServiceApplication;
import com.calorietracker.core.dto.FoodEntryRequest;
import com.calorietracker.core.model.MealType;
import com.calorietracker.core.repository.FoodEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import static org.assertj.core.api.Assertions.assertThat;

/** Run only against a disposable PostgreSQL database: the schema is recreated. */
@EnabledIfEnvironmentVariable(named = "TEST_POSTGRES_URL", matches = ".+")
class FoodEntryPersistenceTest {
    @Test
    void concurrentRetriesAreAtomicAndAnalyticsUsesUtc() throws Exception {
        try (var context = new SpringApplicationBuilder(CoreServiceApplication.class)
                .web(WebApplicationType.NONE).run(
                        "--spring.datasource.url=" + System.getenv("TEST_POSTGRES_URL"),
                        "--spring.datasource.username=postgres",
                        "--spring.datasource.password=test-only",
                        "--spring.jpa.hibernate.ddl-auto=create-drop",
                        "--spring.datasource.hikari.connection-init-sql=SET TIME ZONE 'America/Los_Angeles'",
                        "--spring.rabbitmq.dynamic=false",
                        "--INTERNAL_API_KEY=test-only")) {
            var service = context.getBean(FoodEntryService.class);
            var repository = context.getBean(FoodEntryRepository.class);
            UUID user = UUID.randomUUID();
            Instant time = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
            var request = new FoodEntryRequest("Rice", MealType.LUNCH, "1 bowl", 200,
                    BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ONE, null, time, "a".repeat(64));
            try (var executor = Executors.newFixedThreadPool(4)) {
                var tasks = java.util.stream.IntStream.range(0, 8)
                        .<java.util.concurrent.Callable<Object>>mapToObj(i ->
                                () -> service.logFoodEntries(user, List.of(request))).toList();
                for (var future : executor.invokeAll(tasks)) future.get();
            }
            assertThat(repository.count()).isEqualTo(1);
            service.logFoodEntry(UUID.randomUUID(), request);
            assertThat(repository.count()).isEqualTo(2);
            var report = context.getBean(AnalyticsService.class).getWeeklyReport(user);
            assertThat(report.days().getLast().totalCalories()).isEqualTo(200);
            assertThat(repository.findByUserIdAndIdempotencyKey(user, "a".repeat(64))
                    .orElseThrow().getConsumedAt()).isEqualTo(time);
        }
    }
}

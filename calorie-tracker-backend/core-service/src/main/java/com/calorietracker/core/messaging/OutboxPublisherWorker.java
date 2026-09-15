package com.calorietracker.core.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisherWorker {

    private final OutboxEventProcessor processor;

    @Scheduled(fixedDelayString = "${outbox.publisher.fixed-delay-ms}")
    public void publishPendingEvents() {
        try {
            processor.publishNextBatch();
        } catch (RuntimeException workerFailure) {
            log.error("Outbox publisher cycle failed; the next scheduled cycle will retry", workerFailure);
        }
    }
}

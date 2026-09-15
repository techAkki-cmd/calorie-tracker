package com.calorietracker.core.util;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Map;

/** Canonicalizes browser/OS timezone aliases before they reach PostgreSQL. */
public final class TimeZones {

    private static final Map<String, String> LEGACY_ALIASES = Map.of(
            "Asia/Calcutta", "Asia/Kolkata");

    private TimeZones() {
    }

    public static ZoneId parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Timezone is required");
        }
        String canonical = LEGACY_ALIASES.getOrDefault(value, value);
        try {
            return ZoneId.of(canonical);
        } catch (DateTimeException exception) {
            throw new IllegalArgumentException("Invalid IANA timezone: " + value, exception);
        }
    }
}

package com.calorietracker.core.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TimeZonesTest {

    @Test
    void canonicalizesLegacyCalcuttaAlias() {
        assertThat(TimeZones.parse("Asia/Calcutta").getId()).isEqualTo("Asia/Kolkata");
    }

    @Test
    void preservesCanonicalIanaTimezone() {
        assertThat(TimeZones.parse("America/New_York").getId()).isEqualTo("America/New_York");
    }

    @Test
    void rejectsUnknownTimezone() {
        assertThatThrownBy(() -> TimeZones.parse("Mars/Olympus"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid IANA timezone");
    }
}

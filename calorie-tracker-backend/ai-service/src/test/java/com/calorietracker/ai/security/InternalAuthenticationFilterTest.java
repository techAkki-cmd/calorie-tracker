package com.calorietracker.ai.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InternalAuthenticationFilterTest {
    @Test
    void rejectsMissingIncorrectAndDuplicateCredentials() throws Exception {
        for (String[] headers : new String[][] { {}, {"incorrect"}, {"trusted", "trusted"} }) {
            var request = new MockHttpServletRequest();
            for (String value : headers) request.addHeader("X-Internal-Secret", value);
            request.addHeader("X-User-Id", "spoofed-user");
            var response = new MockHttpServletResponse();
            var called = new AtomicBoolean();
            new InternalAuthenticationFilter("trusted").doFilter(request, response,
                    (req, res) -> called.set(true));
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(called).isFalse();
        }
    }

    @Test
    void acceptsExactCredential() throws Exception {
        var request = new MockHttpServletRequest();
        request.addHeader("X-Internal-Secret", "trusted");
        var called = new AtomicBoolean();
        new InternalAuthenticationFilter("trusted").doFilter(request, new MockHttpServletResponse(),
                (req, res) -> called.set(true));
        assertThat(called).isTrue();
    }

    @Test
    void rejectsBlankConfiguration() {
        assertThatThrownBy(() -> new InternalAuthenticationFilter(" "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

package com.calorietracker.ai.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AiExtractionException.class)
    ProblemDetail handleExtractionFailure(AiExtractionException ex) {
        return problem(ex.getStatus(), "Nutrition extraction failed", ex.getMessage());
    }

    /**
     * The provider's response body is deliberately not surfaced: it can echo the request, which
     * includes the base64 image, and it may carry key or quota details.
     */
    @ExceptionHandler(WebClientResponseException.class)
    ProblemDetail handleProviderError(WebClientResponseException ex) {
        log.warn("Gemini returned {} for a generateContent call", ex.getStatusCode());
        return problem(HttpStatus.BAD_GATEWAY, "AI provider error",
                "The AI provider rejected the request with status " + ex.getStatusCode().value());
    }

    @ExceptionHandler(WebClientRequestException.class)
    ProblemDetail handleProviderUnreachable(WebClientRequestException ex) {
        log.warn("Gemini could not be reached: {}", ex.getMessage());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "AI provider unreachable",
                "The AI provider could not be reached, please retry");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ProblemDetail handleTooLarge(MaxUploadSizeExceededException ex) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "Image too large",
                "The uploaded image exceeds the maximum allowed size");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ProblemDetail handleMissingParameter(MissingServletRequestParameterException ex) {
        return problem(HttpStatus.BAD_REQUEST, "Missing required parameter",
                "Required multipart parameter is absent: " + ex.getParameterName());
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        return problem;
    }
}

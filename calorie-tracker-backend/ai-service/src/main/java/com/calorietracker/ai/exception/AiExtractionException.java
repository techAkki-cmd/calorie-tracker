package com.calorietracker.ai.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AiExtractionException extends RuntimeException {

    private final HttpStatus status;

    public AiExtractionException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public static AiExtractionException badRequest(String message) {
        return new AiExtractionException(HttpStatus.BAD_REQUEST, message);
    }

    public static AiExtractionException badGateway(String message) {
        return new AiExtractionException(HttpStatus.BAD_GATEWAY, message);
    }
}

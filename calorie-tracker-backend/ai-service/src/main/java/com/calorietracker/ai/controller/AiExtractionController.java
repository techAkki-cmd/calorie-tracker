package com.calorietracker.ai.controller;

import com.calorietracker.ai.dto.ChatRequest;
import com.calorietracker.ai.dto.ChatResponse;
import com.calorietracker.ai.dto.NutritionExtractionResponse;
import com.calorietracker.ai.service.ChatInterfaceService;
import com.calorietracker.ai.service.GeminiVisionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiExtractionController {

    private final GeminiVisionService geminiVisionService;
    private final ChatInterfaceService chatInterfaceService;

    @PostMapping(value = "/extract-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public NutritionExtractionResponse extractImage(@RequestParam("image") MultipartFile image) {
        return geminiVisionService.extractNutritionFromImage(image);
    }

    @PostMapping("/chat")
    public ChatResponse chat(@RequestHeader("X-User-Id") UUID userId,
                             @RequestHeader("Idempotency-Key") UUID requestId,
                             @Valid @RequestBody ChatRequest request) {
        return new ChatResponse(chatInterfaceService.handleChat(userId, request.message(), requestId.toString()));
    }
}

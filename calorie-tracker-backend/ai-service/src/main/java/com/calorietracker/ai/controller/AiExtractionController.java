package com.calorietracker.ai.controller;

import com.calorietracker.ai.dto.NutritionExtractionResponse;
import com.calorietracker.ai.service.GeminiVisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiExtractionController {

    private final GeminiVisionService geminiVisionService;

    @PostMapping(value = "/extract-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public NutritionExtractionResponse extractImage(@RequestParam("image") MultipartFile image) {
        return geminiVisionService.extractNutritionFromImage(image);
    }
}

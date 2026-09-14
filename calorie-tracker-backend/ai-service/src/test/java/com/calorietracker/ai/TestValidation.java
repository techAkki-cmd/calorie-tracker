package com.calorietracker.ai;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

public final class TestValidation {
    public static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();
    private TestValidation() {}
}

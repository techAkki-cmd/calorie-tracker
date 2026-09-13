import { ApiError } from "@/lib/apiClient";
import type { AuthFieldErrors } from "@/lib/authTypes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthFields(
  email: string,
  password: string,
  options: { requirePasswordLength: boolean },
): AuthFieldErrors {
  const fieldErrors: AuthFieldErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    fieldErrors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    fieldErrors.email = "Enter a valid email address";
  }

  if (!password) {
    fieldErrors.password = "Password is required";
  } else if (options.requirePasswordLength && (password.length < 8 || password.length > 72)) {
    fieldErrors.password = "Password must be between 8 and 72 characters";
  }

  return fieldErrors;
}

export function mapAuthApiError(error: unknown): {
  formError?: string;
  fieldErrors: AuthFieldErrors;
} {
  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Failed to fetch") || error instanceof TypeError) {
      return {
        formError: "Could not reach the API. Confirm the gateway is running.",
        fieldErrors: {},
      };
    }
    return {
      formError: "Something went wrong. Please try again.",
      fieldErrors: {},
    };
  }

  if (error.status === 400) {
    return {
      fieldErrors: {
        email: error.fieldErrors.email,
        password: error.fieldErrors.password,
      },
    };
  }

  if (error.status === 401) {
    return { formError: error.detail, fieldErrors: {} };
  }

  if (error.status === 409) {
    return { fieldErrors: { email: error.detail } };
  }

  return { formError: error.detail, fieldErrors: {} };
}

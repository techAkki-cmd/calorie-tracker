"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { mapAuthApiError, validateAuthFields } from "@/lib/authValidation";
import type { AuthFieldErrors } from "@/lib/authTypes";

export function useRegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const nextFieldErrors = validateAuthFields(email, password, { requirePasswordLength: true });
    setFieldErrors(nextFieldErrors);
    setFormError(undefined);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email.trim(), password);
      router.push("/dashboard");
    } catch (error) {
      const mapped = mapAuthApiError(error);
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    fieldErrors,
    formError,
    isSubmitting,
    setEmail,
    setPassword,
    submit,
  };
}

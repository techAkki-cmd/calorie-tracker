"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { mapAuthApiError, validateAuthFields } from "@/lib/authValidation";
import type { AuthFieldErrors } from "@/lib/authTypes";

export function useLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const nextFieldErrors = validateAuthFields(email, password, { requirePasswordLength: false });
    setFieldErrors(nextFieldErrors);
    setFormError(undefined);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
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

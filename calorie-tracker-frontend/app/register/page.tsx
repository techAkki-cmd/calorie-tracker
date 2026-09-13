"use client";

import { AuthFormFields } from "@/components/auth/AuthFormFields";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { useRegisterForm } from "@/hooks/useRegisterForm";

export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <RegisterForm />
    </RedirectIfAuthenticated>
  );
}

function RegisterForm() {
  const form = useRegisterForm();
  return (
    <AuthFormFields
      title="Create account"
      description="Register with an email and password. You will be signed in automatically."
      submitLabel="Create account"
      isSubmitting={form.isSubmitting}
      email={form.email}
      password={form.password}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      footerHint="Already have an account?"
      footerHref="/login"
      footerLabel="Sign in"
      passwordAutoComplete="new-password"
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onSubmit={form.submit}
    />
  );
}

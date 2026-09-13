"use client";

import { AuthFormFields } from "@/components/auth/AuthFormFields";
import { RedirectIfAuthenticated } from "@/components/auth/RequireAuth";
import { useLoginForm } from "@/hooks/useLoginForm";

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <LoginForm />
    </RedirectIfAuthenticated>
  );
}

function LoginForm() {
  const form = useLoginForm();
  return (
    <AuthFormFields
      title="Sign In"
      description="Use your calorie tracker account to open the dashboard."
      submitLabel="Sign In"
      isSubmitting={form.isSubmitting}
      email={form.email}
      password={form.password}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      footerHint="Need an account?"
      footerHref="/register"
      footerLabel="Create one"
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onSubmit={form.submit}
    />
  );
}

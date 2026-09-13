"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AuthFieldErrors } from "@/lib/authTypes";
import { AuthCard, FieldError, TextField } from "@/components/auth/AuthCard";

type AuthFormFieldsProps = {
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  email: string;
  password: string;
  fieldErrors: AuthFieldErrors;
  formError?: string;
  footerHint: string;
  footerHref: string;
  footerLabel: string;
  passwordAutoComplete?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function AuthFormFields({
  title,
  description,
  submitLabel,
  isSubmitting,
  email,
  password,
  fieldErrors,
  formError,
  footerHint,
  footerHref,
  footerLabel,
  passwordAutoComplete = "current-password",
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AuthFormFieldsProps) {
  return (
    <AuthCard title={title} description={description}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          error={fieldErrors.email}
          onChange={onEmailChange}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          autoComplete={passwordAutoComplete}
          error={fieldErrors.password}
          onChange={onPasswordChange}
        />
        <FieldError id="form-error" message={formError} />
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isSubmitting ? `${submitLabel}…` : submitLabel}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        {footerHint}{" "}
        <Link href={footerHref} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          {footerLabel}
        </Link>
      </p>
    </AuthCard>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
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
          disabled={isSubmitting}
          leadingIcon={<Mail className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
          error={fieldErrors.email}
          onChange={onEmailChange}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          autoComplete={passwordAutoComplete}
          disabled={isSubmitting}
          leadingIcon={<LockKeyhole className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
          error={fieldErrors.password}
          onChange={onPasswordChange}
        />
        <FieldError id="form-error" message={formError} />
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="primary-button mt-2"
        >
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          <span>{isSubmitting ? `${submitLabel}…` : submitLabel}</span>
        </button>
      </form>
      <p className="mt-7 border-t border-zinc-100 pt-6 text-center text-sm text-zinc-500">
        {footerHint}{" "}
        <Link
          href={footerHref}
          className="font-semibold text-slate-950 underline-offset-4 transition-colors hover:text-slate-700 hover:underline"
        >
          {footerLabel}
        </Link>
      </p>
    </AuthCard>
  );
}

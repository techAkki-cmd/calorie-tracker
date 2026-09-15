"use client";

import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/cn";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <section className="auth-shell">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-200/40 blur-3xl"
        aria-hidden
      />
      <div className="w-full max-w-md">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-7 sm:px-8 sm:py-8">
            <BrandLogo href="/" />
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-zinc-950 sm:text-[1.75rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>
          </div>
          <div className="px-6 py-7 sm:px-8 sm:py-8">{children}</div>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-zinc-400">
          Secure access to your private nutrition workspace
        </p>
      </div>
    </section>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

export function TextField({
  id,
  label,
  type,
  value,
  autoComplete,
  error,
  leadingIcon,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  autoComplete: string;
  error?: string;
  leadingIcon?: ReactNode;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <span className="relative mt-2 block">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-zinc-400">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "form-input",
            leadingIcon && "pl-10",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
          )}
        />
      </span>
      <FieldError id={errorId} message={error} />
    </label>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <section className="flex justify-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-hairline sm:p-8">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
        <div className="mt-6">{children}</div>
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
  onChange,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  autoComplete: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors",
          "placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-slate-200",
          error ? "border-red-400" : "border-line",
        )}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

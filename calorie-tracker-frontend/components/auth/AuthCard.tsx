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
    <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md rounded-xl p-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Calorie Tracker
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        <div className="mt-8">{children}</div>
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
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1.5 w-full rounded-lg border bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow",
          "placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900",
          error ? "border-red-500 focus:border-red-500 focus:ring-0" : "border-zinc-200",
        )}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

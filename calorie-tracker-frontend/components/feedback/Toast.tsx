"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastProps = {
  message: string;
  onDismiss: () => void;
  duration?: number;
};

export function Toast({ message, onDismiss, duration = 6500 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-20 z-[80] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl border border-emerald-200 bg-white/95 p-4 text-sm text-zinc-700 shadow-xl backdrop-blur sm:right-6"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      <p className="flex-1 leading-5">{message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

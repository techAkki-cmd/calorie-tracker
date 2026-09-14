"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { HealthGoalDraft, HealthGoalFieldErrors } from "@/lib/healthGoalTypes";
import { sanitizeDecimalInput, sanitizeIntegerInput } from "@/lib/healthGoalValidation";
import { cn } from "@/lib/cn";

type GoalTargetsDialogProps = {
  open: boolean;
  draft: HealthGoalDraft;
  fieldErrors: HealthGoalFieldErrors;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (field: keyof HealthGoalDraft, value: string) => void;
  onSave: () => void;
};

export function GoalTargetsDialog({
  open,
  draft,
  fieldErrors,
  isSaving,
  onClose,
  onDraftChange,
  onSave,
}: GoalTargetsDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="Close edit targets"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-targets-title"
        className="card relative z-10 w-full max-w-md rounded-xl p-6 sm:p-8"
      >
        <h2 id="goal-targets-title" className="text-lg font-semibold tracking-tight text-zinc-900">
          Edit targets
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Update daily calorie and macro goals.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          noValidate
        >
          <NumericField
            id="dailyCalorieTarget"
            label="Daily calories"
            value={draft.dailyCalorieTarget}
            error={fieldErrors.dailyCalorieTarget}
            inputMode="numeric"
            disabled={isSaving}
            onChange={(value) => onDraftChange("dailyCalorieTarget", sanitizeIntegerInput(value))}
          />
          <NumericField
            id="proteinTarget"
            label="Protein (g)"
            value={draft.proteinTarget}
            error={fieldErrors.proteinTarget}
            inputMode="decimal"
            disabled={isSaving}
            onChange={(value) => onDraftChange("proteinTarget", sanitizeDecimalInput(value))}
          />
          <NumericField
            id="carbTarget"
            label="Carbs (g)"
            value={draft.carbTarget}
            error={fieldErrors.carbTarget}
            inputMode="decimal"
            disabled={isSaving}
            onChange={(value) => onDraftChange("carbTarget", sanitizeDecimalInput(value))}
          />
          <NumericField
            id="fatTarget"
            label="Fat (g)"
            value={draft.fatTarget}
            error={fieldErrors.fatTarget}
            inputMode="decimal"
            disabled={isSaving}
            onChange={(value) => onDraftChange("fatTarget", sanitizeDecimalInput(value))}
          />
          <NumericField
            id="targetWeight"
            label="Weight goal (kg, optional)"
            value={draft.targetWeight}
            error={fieldErrors.targetWeight}
            inputMode="decimal"
            disabled={isSaving}
            onChange={(value) => onDraftChange("targetWeight", sanitizeDecimalInput(value))}
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              aria-busy={isSaving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumericField({
  id,
  label,
  value,
  error,
  inputMode,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  inputMode: "numeric" | "decimal";
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        disabled={disabled}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1.5 w-full rounded-lg border bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow",
          "placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900",
          error ? "border-red-500 focus:border-red-500 focus:ring-0" : "border-zinc-200",
        )}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}

"use client";

import { useEffect } from "react";
import { Loader2, Target, X } from "lucide-react";
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
        aria-label="Close edit targets"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-targets-title"
        className="card relative z-10 max-h-full w-full max-w-md overflow-y-auto rounded-2xl p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <Target className="h-5 w-5" aria-hidden />
            </span>
            <h2 id="goal-targets-title" className="mt-4 text-lg font-semibold tracking-tight text-zinc-900">
              Edit Targets
            </h2>
            <p className="mt-1 text-sm text-zinc-600">Update your daily calorie and macro plan.</p>
          </div>
          <button
            type="button"
            aria-label="Close edit targets"
            disabled={isSaving}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <form
          className="mt-6 space-y-4"
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
            min={500}
            max={20000}
            step={1}
            disabled={isSaving}
            onChange={(value) => onDraftChange("dailyCalorieTarget", sanitizeIntegerInput(value))}
          />
          <NumericField
            id="proteinTarget"
            label="Protein (g)"
            value={draft.proteinTarget}
            error={fieldErrors.proteinTarget}
            inputMode="decimal"
            min={0}
            max={9999.99}
            step={0.01}
            disabled={isSaving}
            onChange={(value) => onDraftChange("proteinTarget", sanitizeDecimalInput(value))}
          />
          <NumericField
            id="carbTarget"
            label="Carbs (g)"
            value={draft.carbTarget}
            error={fieldErrors.carbTarget}
            inputMode="decimal"
            min={0}
            max={9999.99}
            step={0.01}
            disabled={isSaving}
            onChange={(value) => onDraftChange("carbTarget", sanitizeDecimalInput(value))}
          />
          <NumericField
            id="fatTarget"
            label="Fat (g)"
            value={draft.fatTarget}
            error={fieldErrors.fatTarget}
            inputMode="decimal"
            min={0}
            max={9999.99}
            step={0.01}
            disabled={isSaving}
            onChange={(value) => onDraftChange("fatTarget", sanitizeDecimalInput(value))}
          />
          <NumericField
            id="targetWeight"
            label="Weight goal (kg, optional)"
            value={draft.targetWeight}
            error={fieldErrors.targetWeight}
            inputMode="decimal"
            min={0}
            max={999.99}
            step={0.01}
            disabled={isSaving}
            onChange={(value) => onDraftChange("targetWeight", sanitizeDecimalInput(value))}
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              aria-busy={isSaving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSaving ? "Saving…" : "Save Targets"}
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
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  inputMode: "numeric" | "decimal";
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <input
        id={id}
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        autoComplete="off"
        disabled={disabled}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "form-input mt-1.5 h-11 py-2.5",
          error ? "border-red-500 focus:border-red-500 focus:ring-0" : "border-zinc-200",
        )}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}

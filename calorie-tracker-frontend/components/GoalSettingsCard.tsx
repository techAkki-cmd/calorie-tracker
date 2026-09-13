"use client";

import type { HealthGoal, HealthGoalDraft, HealthGoalFieldErrors } from "@/lib/healthGoalTypes";
import { formatGoalNumber, sanitizeDecimalInput, sanitizeIntegerInput } from "@/lib/healthGoalValidation";
import { cn } from "@/lib/cn";

type GoalSettingsCardProps = {
  goals: HealthGoal | null;
  draft: HealthGoalDraft;
  fieldErrors: HealthGoalFieldErrors;
  loadState: "loading" | "ready" | "error";
  loadError?: string;
  saveError?: string;
  saveStatus: "idle" | "saving" | "saved";
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onDraftChange: (field: keyof HealthGoalDraft, value: string) => void;
  onSave: () => void;
};

export function GoalSettingsCard({
  goals,
  draft,
  fieldErrors,
  loadState,
  loadError,
  saveError,
  saveStatus,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onDraftChange,
  onSave,
}: GoalSettingsCardProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-hairline sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">Goals</h2>
          <p className="mt-1 text-xs text-ink-muted">Daily targets used across meals and analytics.</p>
        </div>
        <button
          type="button"
          aria-pressed={isEditing}
          aria-expanded={isEditing}
          onClick={isEditing ? onCancelEditing : onStartEditing}
          disabled={loadState !== "ready"}
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-line px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
        >
          {isEditing ? "Cancel" : goals ? "Edit Goals" : "Set goals"}
        </button>
      </div>

      <div className="mt-4" aria-live="polite">
        {loadState === "loading" && (
          <p className="text-sm text-ink-muted">Loading goals…</p>
        )}
        {loadState === "error" && (
          <p className="text-sm text-red-600" role="alert">{loadError}</p>
        )}
        {loadState === "ready" && isEditing && (
          <GoalEditForm
            draft={draft}
            fieldErrors={fieldErrors}
            saveError={saveError}
            onDraftChange={onDraftChange}
            onSave={onSave}
          />
        )}
        {loadState === "ready" && !isEditing && (
          <GoalSummary goals={goals} saveStatus={saveStatus} />
        )}
      </div>
    </section>
  );
}

function GoalSummary({
  goals,
  saveStatus,
}: {
  goals: HealthGoal | null;
  saveStatus: "idle" | "saving" | "saved";
}) {
  if (!goals) {
    return (
      <p className="text-sm text-ink-muted">
        No goals yet. Set a calorie target and macros to personalize the dashboard.
      </p>
    );
  }

  return (
    <div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoalStat label="Daily calories" value={formatGoalNumber(goals.dailyCalorieTarget, "kcal")} />
        <GoalStat label="Protein" value={formatGoalNumber(goals.proteinTarget, "g")} />
        <GoalStat label="Carbs" value={formatGoalNumber(goals.carbTarget, "g")} />
        <GoalStat label="Fat" value={formatGoalNumber(goals.fatTarget, "g")} />
        <GoalStat label="Weight goal" value={formatGoalNumber(goals.targetWeight, "kg")} />
      </dl>
      {saveStatus === "saving" && (
        <p className="mt-3 text-xs text-ink-subtle">Saving…</p>
      )}
      {saveStatus === "saved" && (
        <p className="mt-3 text-xs text-ink-subtle">Goals saved.</p>
      )}
    </div>
  );
}

function GoalEditForm({
  draft,
  fieldErrors,
  saveError,
  onDraftChange,
  onSave,
}: {
  draft: HealthGoalDraft;
  fieldErrors: HealthGoalFieldErrors;
  saveError?: string;
  onDraftChange: (field: keyof HealthGoalDraft, value: string) => void;
  onSave: () => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      noValidate
    >
      <NumericField
        id="dailyCalorieTarget"
        label="Daily calorie target"
        value={draft.dailyCalorieTarget}
        error={fieldErrors.dailyCalorieTarget}
        inputMode="numeric"
        onChange={(value) => onDraftChange("dailyCalorieTarget", sanitizeIntegerInput(value))}
      />
      <NumericField
        id="proteinTarget"
        label="Protein (g)"
        value={draft.proteinTarget}
        error={fieldErrors.proteinTarget}
        inputMode="decimal"
        onChange={(value) => onDraftChange("proteinTarget", sanitizeDecimalInput(value))}
      />
      <NumericField
        id="carbTarget"
        label="Carbs (g)"
        value={draft.carbTarget}
        error={fieldErrors.carbTarget}
        inputMode="decimal"
        onChange={(value) => onDraftChange("carbTarget", sanitizeDecimalInput(value))}
      />
      <NumericField
        id="fatTarget"
        label="Fat (g)"
        value={draft.fatTarget}
        error={fieldErrors.fatTarget}
        inputMode="decimal"
        onChange={(value) => onDraftChange("fatTarget", sanitizeDecimalInput(value))}
      />
      <NumericField
        id="targetWeight"
        label="Weight goal (kg, optional)"
        value={draft.targetWeight}
        error={fieldErrors.targetWeight}
        inputMode="decimal"
        onChange={(value) => onDraftChange("targetWeight", sanitizeDecimalInput(value))}
      />
      {saveError && (
        <p className="text-xs text-red-600" role="alert">{saveError}</p>
      )}
      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Save goals
      </button>
    </form>
  );
}

function GoalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-canvas px-3 py-2">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function NumericField({
  id,
  label,
  value,
  error,
  inputMode,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  inputMode: "numeric" | "decimal";
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none",
          "focus:border-accent focus:ring-2 focus:ring-slate-200",
          error ? "border-red-400" : "border-line",
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

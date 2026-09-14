"use client";

import { Pencil, X } from "lucide-react";
import { CalorieRing } from "@/components/goals/CalorieRing";
import { GoalTargetsDialog } from "@/components/goals/GoalTargetsDialog";
import { MacroBar } from "@/components/goals/MacroBar";
import type { HealthGoal, HealthGoalDraft, HealthGoalFieldErrors } from "@/lib/healthGoalTypes";

type GoalSettingsCardProps = {
  goals: HealthGoal | null;
  draft: HealthGoalDraft;
  fieldErrors: HealthGoalFieldErrors;
  loadState: "loading" | "ready" | "error";
  loadError?: string;
  saveError?: string;
  saveStatus: "idle" | "saving" | "saved";
  isSaving: boolean;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onDraftChange: (field: keyof HealthGoalDraft, value: string) => void;
  onSave: () => void;
  onDismissSaveError: () => void;
};

export function GoalSettingsCard({
  goals,
  draft,
  fieldErrors,
  loadState,
  loadError,
  saveError,
  saveStatus,
  isSaving,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onDraftChange,
  onSave,
  onDismissSaveError,
}: GoalSettingsCardProps) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Targets</h2>
          <p className="mt-1 text-xs text-zinc-500">Daily nutrition goals.</p>
        </div>
        <button
          type="button"
          aria-label="Edit targets"
          aria-haspopup="dialog"
          aria-expanded={isEditing}
          onClick={onStartEditing}
          disabled={loadState !== "ready" || isSaving}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-5" aria-live="polite">
        {loadState === "loading" && (
          <p className="text-sm text-zinc-500">Loading goals…</p>
        )}
        {loadState === "error" && (
          <p className="text-sm text-red-600" role="alert">{loadError}</p>
        )}
        {loadState === "ready" && !goals && (
          <p className="text-sm text-zinc-500">
            No targets yet. Use the pencil to set calories and macros.
          </p>
        )}
        {loadState === "ready" && goals && (
          <div className="space-y-5">
            <CalorieRing consumed={0} target={goals.dailyCalorieTarget} />
            <div className="space-y-3">
              <MacroBar label="Protein" consumed={0} target={goals.proteinTarget} />
              <MacroBar label="Carbs" consumed={0} target={goals.carbTarget} />
              <MacroBar label="Fat" consumed={0} target={goals.fatTarget} />
            </div>
            <p className="text-xs text-zinc-500">
              Weight goal{" "}
              <span className="font-medium tabular-nums text-zinc-900">
                {goals.targetWeight == null ? "—" : `${goals.targetWeight} kg`}
              </span>
            </p>
            {saveStatus === "saving" && (
              <p className="text-xs text-zinc-400">Saving…</p>
            )}
            {saveStatus === "saved" && (
              <p className="text-xs text-zinc-400">Targets saved.</p>
            )}
          </div>
        )}
      </div>

      <GoalTargetsDialog
        open={isEditing}
        draft={draft}
        fieldErrors={fieldErrors}
        isSaving={isSaving}
        onClose={onCancelEditing}
        onDraftChange={onDraftChange}
        onSave={onSave}
      />
      {saveError && (
        <div
          className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <p className="flex-1">{saveError} Your changes are still in the form; you can retry.</p>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={onDismissSaveError}
            className="rounded p-0.5 text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

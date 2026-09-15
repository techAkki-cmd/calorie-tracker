"use client";

import { Pencil, Target, X } from "lucide-react";
import { GoalMetricsPanel } from "@/components/goals/GoalMetricsPanel";
import { GoalTargetsDialog } from "@/components/goals/GoalTargetsDialog";
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
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
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
  currentCalories,
  currentProtein,
  currentCarbs,
  currentFat,
}: GoalSettingsCardProps) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-zinc-400" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Goal Settings</h2>
          </div>
          <p className="mt-1.5 text-xs text-zinc-600">Daily nutrition targets</p>
        </div>
        <button
          type="button"
          aria-label="Edit Targets"
          title="Edit Targets"
          aria-haspopup="dialog"
          aria-expanded={isEditing}
          onClick={onStartEditing}
          disabled={loadState !== "ready" || isSaving}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="p-5" aria-live="polite">
        {loadState === "loading" && (
          <GoalMetricsSkeleton />
        )}
        {loadState === "error" && (
          <p className="text-sm text-red-600" role="alert">{loadError}</p>
        )}
        {loadState === "ready" && !goals && (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
            <Target className="mx-auto h-5 w-5 text-zinc-400" aria-hidden />
            <p className="mt-3 text-sm font-medium text-zinc-700">No targets configured</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">Use Edit Targets to create your daily plan.</p>
          </div>
        )}
        {loadState === "ready" && goals && (
          <div>
            <GoalMetricsPanel
              goals={goals}
              currentCalories={currentCalories}
              currentProtein={currentProtein}
              currentCarbs={currentCarbs}
              currentFat={currentFat}
            />
            {saveStatus === "saving" && (
              <p className="mt-3 text-center text-xs text-zinc-400">Syncing targets…</p>
            )}
            {saveStatus === "saved" && (
              <p className="mt-3 text-center text-xs text-teal-600">Targets saved.</p>
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

function GoalMetricsSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading goal metrics">
      <div className="flex h-40 items-center justify-center rounded-xl bg-zinc-50">
        <div className="h-28 w-28 rounded-full border-8 border-zinc-100" />
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex justify-between">
            <div className="h-3 w-14 rounded bg-zinc-100" />
            <div className="h-3 w-20 rounded bg-zinc-100" />
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

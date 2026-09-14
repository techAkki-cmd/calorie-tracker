"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient } from "@/lib/apiClient";
import type {
  HealthGoal,
  HealthGoalDraft,
  HealthGoalFieldErrors,
  HealthGoalResponse,
} from "@/lib/healthGoalTypes";
import {
  EMPTY_GOAL_DRAFT,
  draftFromGoal,
  validateGoalDraft,
} from "@/lib/healthGoalValidation";

type LoadState = "loading" | "ready" | "error";

function toHealthGoal(response: HealthGoalResponse): HealthGoal {
  return {
    dailyCalorieTarget: response.dailyCalorieTarget,
    proteinTarget: Number(response.proteinTarget),
    carbTarget: Number(response.carbTarget),
    fatTarget: Number(response.fatTarget),
    targetWeight: response.targetWeight == null ? null : Number(response.targetWeight),
  };
}

export function useHealthGoals() {
  const [goals, setGoals] = useState<HealthGoal | null>(null);
  const [draft, setDraft] = useState<HealthGoalDraft>(EMPTY_GOAL_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<HealthGoalFieldErrors>({});
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoadState("loading");
    setLoadError(undefined);
    try {
      const response = await apiClient<HealthGoalResponse>("/api/goals");
      const nextGoals = toHealthGoal(response);
      setGoals(nextGoals);
      setDraft(draftFromGoal(nextGoals));
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setGoals(null);
        setDraft(EMPTY_GOAL_DRAFT);
        setLoadState("ready");
        return;
      }
      setLoadState("error");
      setLoadError(error instanceof ApiError ? error.detail : "Goals could not be loaded");
    }
  }, []);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const startEditing = () => {
    if (saveInFlightRef.current) {
      return;
    }
    setFieldErrors({});
    setSaveError(undefined);
    setSaveStatus("idle");
    setDraft(goals ? draftFromGoal(goals) : EMPTY_GOAL_DRAFT);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (saveInFlightRef.current) {
      return;
    }
    setFieldErrors({});
    setSaveError(undefined);
    setDraft(goals ? draftFromGoal(goals) : EMPTY_GOAL_DRAFT);
    setIsEditing(false);
  };

  const updateDraftField = (field: keyof HealthGoalDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveError(undefined);
  };

  const saveGoals = async () => {
    if (saveInFlightRef.current) {
      return;
    }

    const { fieldErrors: nextErrors, parsed } = validateGoalDraft(draft);
    setFieldErrors(nextErrors);
    setSaveError(undefined);
    if (!parsed) {
      return;
    }

    const submittedDraft = { ...draft };
    saveInFlightRef.current = true;
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const response = await apiClient<HealthGoalResponse>("/api/goals", {
        method: "PUT",
        body: {
          dailyCalorieTarget: parsed.dailyCalorieTarget,
          proteinTarget: parsed.proteinTarget,
          carbTarget: parsed.carbTarget,
          fatTarget: parsed.fatTarget,
          targetWeight: parsed.targetWeight,
        },
      });
      const committed = toHealthGoal(response);
      setGoals(committed);
      setDraft(draftFromGoal(committed));
      setIsEditing(false);
      setSaveStatus("saved");
    } catch (error) {
      setDraft(submittedDraft);
      setIsEditing(true);
      setSaveStatus("idle");
      if (error instanceof ApiError) {
        setFieldErrors({
          dailyCalorieTarget: error.fieldErrors.dailyCalorieTarget,
          proteinTarget: error.fieldErrors.proteinTarget,
          carbTarget: error.fieldErrors.carbTarget,
          fatTarget: error.fieldErrors.fatTarget,
          targetWeight: error.fieldErrors.targetWeight,
        });
        setSaveError(error.detail);
        return;
      }
      setSaveError("Goals could not be saved. Please try again.");
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const dismissSaveError = () => setSaveError(undefined);

  return {
    goals,
    draft,
    fieldErrors,
    loadState,
    loadError,
    saveError,
    saveStatus,
    isSaving,
    isEditing,
    startEditing,
    cancelEditing,
    updateDraftField,
    saveGoals,
    dismissSaveError,
  };
}

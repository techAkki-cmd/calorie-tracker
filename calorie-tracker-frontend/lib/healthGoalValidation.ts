import type { HealthGoal, HealthGoalDraft, HealthGoalFieldErrors } from "@/lib/healthGoalTypes";

const INTEGER_PATTERN = /^\d+$/;
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

export const EMPTY_GOAL_DRAFT: HealthGoalDraft = {
  dailyCalorieTarget: "",
  proteinTarget: "",
  carbTarget: "",
  fatTarget: "",
  targetWeight: "",
};

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function sanitizeDecimalInput(value: string): string {
  const digitsOnly = value.replace(/[^\d.]/g, "");
  const firstDot = digitsOnly.indexOf(".");
  if (firstDot === -1) {
    return digitsOnly;
  }
  const whole = digitsOnly.slice(0, firstDot).replace(/\./g, "") || (digitsOnly.startsWith(".") ? "0" : "");
  const fraction = digitsOnly.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
  return `${whole}.${fraction}`;
}

export function draftFromGoal(goal: HealthGoal): HealthGoalDraft {
  return {
    dailyCalorieTarget: String(goal.dailyCalorieTarget),
    proteinTarget: formatDecimal(goal.proteinTarget),
    carbTarget: formatDecimal(goal.carbTarget),
    fatTarget: formatDecimal(goal.fatTarget),
    targetWeight: goal.targetWeight == null ? "" : formatDecimal(goal.targetWeight),
  };
}

export function validateGoalDraft(draft: HealthGoalDraft): {
  fieldErrors: HealthGoalFieldErrors;
  parsed: HealthGoal | null;
} {
  const fieldErrors: HealthGoalFieldErrors = {};

  const dailyCalorieTarget = parseBoundedInteger(
    draft.dailyCalorieTarget,
    500,
    20000,
    fieldErrors,
    "dailyCalorieTarget",
    "Enter a whole number between 500 and 20,000",
  );
  const proteinTarget = parseBoundedDecimal(draft.proteinTarget, 0, 9999.99, fieldErrors, "proteinTarget");
  const carbTarget = parseBoundedDecimal(draft.carbTarget, 0, 9999.99, fieldErrors, "carbTarget");
  const fatTarget = parseBoundedDecimal(draft.fatTarget, 0, 9999.99, fieldErrors, "fatTarget");

  let targetWeight: number | null = null;
  if (draft.targetWeight.trim() !== "") {
    targetWeight = parseBoundedDecimal(draft.targetWeight, 0, 999.99, fieldErrors, "targetWeight");
  }

  if (
    dailyCalorieTarget == null
    || proteinTarget == null
    || carbTarget == null
    || fatTarget == null
    || Object.keys(fieldErrors).length > 0
  ) {
    return { fieldErrors, parsed: null };
  }

  return {
    fieldErrors,
    parsed: { dailyCalorieTarget, proteinTarget, carbTarget, fatTarget, targetWeight },
  };
}

export function formatGoalNumber(value: number | null, unit: string): string {
  if (value == null) {
    return "—";
  }
  return `${formatDecimal(value)} ${unit}`;
}

function parseBoundedInteger(
  raw: string,
  min: number,
  max: number,
  fieldErrors: HealthGoalFieldErrors,
  field: keyof HealthGoalDraft,
  message: string,
): number | null {
  const trimmed = raw.trim();
  if (!INTEGER_PATTERN.test(trimmed)) {
    fieldErrors[field] = message;
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    fieldErrors[field] = message;
    return null;
  }
  return parsed;
}

function parseBoundedDecimal(
  raw: string,
  min: number,
  max: number,
  fieldErrors: HealthGoalFieldErrors,
  field: keyof HealthGoalDraft,
): number | null {
  const trimmed = raw.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) {
    fieldErrors[field] = "Enter a number with up to two decimal places";
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    fieldErrors[field] = `Enter a number between ${min} and ${max}`;
    return null;
  }
  return parsed;
}

function formatDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useLocalDay } from "@/hooks/useLocalDay";
import {
  aggregateMicronutrients,
  type MicronutrientMention,
} from "@/lib/micronutrientSummary";

type RawAnalyticsDay = {
  date: string;
  totalCalories: number;
  totalProtein: number | string;
  totalCarbs: number | string;
  totalFat: number | string;
};

type RawWeeklyAnalytics = {
  days: RawAnalyticsDay[];
  goals: {
    dailyCalorieTarget: number;
    proteinTarget: number | string;
    carbTarget: number | string;
    fatTarget: number | string;
  } | null;
  micronutrients?: Array<{
    label: string;
    count: number;
  }>;
};

type MealPageResponse = {
  content: Array<{ micronutrientSummary?: string | null }>;
  totalPages: number;
};

export type AnalyticsDay = {
  date: string;
  label: string;
  consumedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type AnalyticsGoals = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
};

export type { MicronutrientMention } from "@/lib/micronutrientSummary";
export type WeeklyAnalytics = {
  days: AnalyticsDay[];
  today: AnalyticsDay;
  goals: AnalyticsGoals | null;
  micronutrients: MicronutrientMention[];
};

const EMPTY_DAY: AnalyticsDay = {
  date: "",
  label: "Today",
  consumedCalories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

const WINDOW_DAYS = 7;
const MEAL_PAGE_SIZE = 50;

export function useAnalytics(refreshKey = 0) {
  const [data, setData] = useState<WeeklyAnalytics>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [requestVersion, setRequestVersion] = useState(0);
  const hasLoaded = useRef(false);
  const { date: localDate, timezone } = useLocalDay();

  const refetch = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      if (!hasLoaded.current) {
        setIsLoading(true);
      }
      setError(undefined);
      try {
        const params = new URLSearchParams({ timezone });
        const response = await apiClient<RawWeeklyAnalytics>(
          `/api/analytics/weekly?${params.toString()}`,
          { signal: controller.signal },
        );
        const days = (response.days ?? []).map(normalizeDay);
        const today = days.find((day) => day.date === localDate) ?? {
          ...EMPTY_DAY,
          date: localDate,
        };
        const micronutrients =
          response.micronutrients !== undefined
            ? normalizeMicronutrients(response.micronutrients)
            : await loadMicronutrientsFromMeals(localDate, timezone, controller.signal);

        setData({
          days,
          today,
          goals: normalizeGoals(response.goals),
          micronutrients,
        });
        hasLoaded.current = true;
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof ApiError
            ? requestError.detail
            : "Weekly analytics could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();
    return () => controller.abort();
  }, [localDate, refreshKey, requestVersion, timezone]);

  return { data, isLoading, error, refetch };
}

async function loadMicronutrientsFromMeals(
  endDate: string,
  timezone: string,
  signal: AbortSignal,
): Promise<MicronutrientMention[]> {
  const startDate = shiftDate(endDate, -(WINDOW_DAYS - 1));
  const summaries: Array<string | null | undefined> = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      timezone,
      page: String(page),
      size: String(MEAL_PAGE_SIZE),
      sort: "consumedAt,desc",
    });
    const response = await apiClient<MealPageResponse>(`/api/meals?${params.toString()}`, {
      signal,
    });
    for (const meal of response.content ?? []) {
      summaries.push(meal.micronutrientSummary);
    }
    totalPages = Math.max(response.totalPages ?? 1, 1);
    page += 1;
    if (page > 20) {
      break;
    }
  }

  return aggregateMicronutrients(summaries);
}

function normalizeMicronutrients(
  items: Array<{ label: string; count: number }>,
): MicronutrientMention[] {
  return items
    .map((item) => ({
      label: item.label,
      count: finiteNumber(item.count),
    }))
    .filter((item) => item.label && item.count > 0);
}

function normalizeGoals(goals: RawWeeklyAnalytics["goals"]): AnalyticsGoals | null {
  if (!goals) {
    return null;
  }
  return {
    dailyCalorieTarget: finiteNumber(goals.dailyCalorieTarget),
    proteinTarget: finiteNumber(goals.proteinTarget),
    carbTarget: finiteNumber(goals.carbTarget),
    fatTarget: finiteNumber(goals.fatTarget),
  };
}

function normalizeDay(day: RawAnalyticsDay): AnalyticsDay {
  return {
    date: day.date,
    label: formatDay(day.date),
    consumedCalories: finiteNumber(day.totalCalories),
    protein: finiteNumber(day.totalProtein),
    carbs: finiteNumber(day.totalCarbs),
    fat: finiteNumber(day.totalFat),
  };
}

function finiteNumber(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(date);
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

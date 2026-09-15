"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useLocalDay } from "@/hooks/useLocalDay";

type RawAnalyticsDay = {
  date: string;
  totalCalories: number;
  totalProtein: number | string;
  totalCarbs: number | string;
  totalFat: number | string;
};

type RawWeeklyAnalytics = {
  days: RawAnalyticsDay[];
  today?: RawAnalyticsDay;
};

export type AnalyticsDay = {
  date: string;
  label: string;
  consumedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeeklyAnalytics = {
  days: AnalyticsDay[];
  today: AnalyticsDay;
};

const EMPTY_DAY: AnalyticsDay = {
  date: "",
  label: "Today",
  consumedCalories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

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
        const today = response.today ? normalizeDay(response.today) : days.at(-1) ?? EMPTY_DAY;
        setData({ days, today });
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

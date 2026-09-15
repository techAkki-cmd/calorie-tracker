"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsDay, AnalyticsGoals } from "@/hooks/useAnalytics";
import { ChartTooltip } from "./ChartTooltip";

const WINDOW_DAYS = 7;

export function GoalVsActualChart({
  days,
  goals,
}: {
  days: AnalyticsDay[];
  goals: AnalyticsGoals | null;
}) {
  const actualCalories = days.reduce((sum, day) => sum + day.consumedCalories, 0);
  const actualProtein = days.reduce((sum, day) => sum + day.protein, 0);
  const actualCarbs = days.reduce((sum, day) => sum + day.carbs, 0);
  const actualFat = days.reduce((sum, day) => sum + day.fat, 0);

  const chartData = [
    {
      label: "Calories",
      actual: round(actualCalories),
      target: goals ? round(goals.dailyCalorieTarget * WINDOW_DAYS) : 0,
      unit: "kcal",
    },
    {
      label: "Protein",
      actual: round(actualProtein),
      target: goals ? round(goals.proteinTarget * WINDOW_DAYS) : 0,
      unit: "g",
    },
    {
      label: "Carbs",
      actual: round(actualCarbs),
      target: goals ? round(goals.carbTarget * WINDOW_DAYS) : 0,
      unit: "g",
    },
    {
      label: "Fat",
      actual: round(actualFat),
      target: goals ? round(goals.fatTarget * WINDOW_DAYS) : 0,
      unit: "g",
    },
  ];

  if (!goals) {
    return (
      <div className="flex h-full min-h-[250px] items-center justify-center px-4 text-center">
        <p className="text-base leading-6 text-zinc-600">
          Set daily calorie and macro targets to compare this week against your goals.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[250px] w-full" aria-label="Weekly goal versus actual comparison">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 4, left: 4, bottom: 0 }}
          barGap={4}
          barCategoryGap="28%"
        >
          <CartesianGrid vertical={false} stroke="#f4f4f5" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#52525b", fontSize: 12 }}
            dy={8}
          />
          <YAxis hide />
          <Tooltip
            content={<GoalVsActualTooltip />}
            cursor={{ fill: "#f4f4f5", radius: 6 }}
          />
          <Bar dataKey="actual" name="Actual" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="target" name="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GoalVsActualTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: { unit?: string } }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const unit = payload[0]?.payload?.unit ?? "";
  return (
    <ChartTooltip
      active={active}
      label={label}
      payload={payload}
      valueSuffix={unit === "kcal" ? " kcal" : "g"}
    />
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

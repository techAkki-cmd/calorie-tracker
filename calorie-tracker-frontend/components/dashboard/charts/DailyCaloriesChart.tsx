"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsDay } from "@/hooks/useAnalytics";
import { ChartTooltip } from "./ChartTooltip";

export function DailyCaloriesChart({ data }: { data: AnalyticsDay[] }) {
  return (
    <div className="h-44 w-full" aria-label="Daily calories over the last seven days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="calorieAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            dy={8}
          />
          <YAxis hide domain={[0, "dataMax + 200"]} />
          <Tooltip content={<ChartTooltip valueSuffix=" kcal" />} cursor={false} />
          <Area
            type="monotone"
            dataKey="consumedCalories"
            name="Calories"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#calorieAreaGradient)"
            activeDot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

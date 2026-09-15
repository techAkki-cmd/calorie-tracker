"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsDay } from "@/hooks/useAnalytics";
import { ChartTooltip } from "./ChartTooltip";

export function WeeklyTrendChart({ data }: { data: AnalyticsDay[] }) {
  return (
    <div className="h-full min-h-[250px] w-full" aria-label="Seven day macronutrient trend">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }} barSize={16}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#52525b", fontSize: 12 }}
            dy={8}
          />
          <YAxis hide />
          <Tooltip
            content={<ChartTooltip valueSuffix="g" />}
            cursor={{ fill: "#f4f4f5", radius: 6 }}
          />
          <Bar dataKey="protein" name="Protein" stackId="a" fill="#334155" />
          <Bar dataKey="carbs" name="Carbs" stackId="a" fill="#94a3b8" />
          <Bar dataKey="fat" name="Fat" stackId="a" fill="#0d9488" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

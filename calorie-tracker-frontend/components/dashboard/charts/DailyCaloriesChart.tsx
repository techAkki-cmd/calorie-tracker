"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsDay } from "@/hooks/useAnalytics";
import { ChartTooltip } from "./ChartTooltip";

export function DailyCaloriesChart({
  data,
  calorieTarget,
}: {
  data: AnalyticsDay[];
  calorieTarget?: number | null;
}) {
  const target = calorieTarget != null && calorieTarget > 0 ? calorieTarget : undefined;
  const peak = Math.max(...data.map((day) => day.consumedCalories), target ?? 0, 0);

  return (
    <div className="h-full min-h-[250px] w-full" aria-label="Daily calories over the last seven days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="calorieAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f4f4f5" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#52525b", fontSize: 12 }}
            dy={8}
          />
          <YAxis hide domain={[0, peak + 200]} />
          <Tooltip content={<ChartTooltip valueSuffix=" kcal" />} cursor={false} />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="#a1a1aa"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: "Target",
                position: "insideTopRight",
                fill: "#52525b",
                fontSize: 12,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="consumedCalories"
            name="Calories"
            stroke="#0d9488"
            strokeWidth={2.5}
            fill="url(#calorieAreaGradient)"
            activeDot={{ r: 4, fill: "#0d9488", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

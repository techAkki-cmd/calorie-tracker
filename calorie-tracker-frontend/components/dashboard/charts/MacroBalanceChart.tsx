"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AnalyticsDay } from "@/hooks/useAnalytics";
import { ChartTooltip } from "./ChartTooltip";

const MACROS = [
  { key: "protein", name: "Protein", color: "#334155" },
  { key: "carbs", name: "Carbs", color: "#94a3b8" },
  { key: "fat", name: "Fat", color: "#0d9488" },
] as const;

export function MacroBalanceChart({ today }: { today: AnalyticsDay }) {
  const macroData = MACROS.map((macro) => ({
    name: macro.name,
    value: today[macro.key],
    color: macro.color,
  }));
  const total = macroData.reduce((sum, macro) => sum + macro.value, 0);
  const pieData = total > 0 ? macroData : [{ name: "No macros", value: 1, color: "#e4e4e7" }];

  return (
    <div className="flex h-44 flex-col">
      <div className="min-h-0 flex-1" aria-label="Today's macro balance">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={total > 0 ? 3 : 0}
              stroke="none"
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            {total > 0 && <Tooltip content={<ChartTooltip valueSuffix="g" />} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4" aria-label="Macro chart legend">
        {macroData.map((macro) => (
          <span
            key={macro.name}
            className="flex items-center gap-1.5 text-[0.65rem] text-zinc-600"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: macro.color }}
              aria-hidden
            />
            {macro.name}{" "}
            <strong className="font-semibold tabular-nums text-zinc-800">
              {formatMacro(macro.value)}g
            </strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function formatMacro(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

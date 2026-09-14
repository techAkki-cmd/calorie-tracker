import { Scale } from "lucide-react";
import { CalorieRing } from "@/components/goals/CalorieRing";
import { MacroBar } from "@/components/goals/MacroBar";
import type { HealthGoal } from "@/lib/healthGoalTypes";

type GoalMetricsPanelProps = {
  goals: HealthGoal;
};

export function GoalMetricsPanel({ goals }: GoalMetricsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4">
        <CalorieRing consumed={0} target={goals.dailyCalorieTarget} />
      </div>

      <div className="space-y-2.5">
        <MacroBar label="Protein" consumed={0} target={goals.proteinTarget} />
        <MacroBar label="Carbs" consumed={0} target={goals.carbTarget} />
        <MacroBar label="Fat" consumed={0} target={goals.fatTarget} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          <span className="text-xs font-medium">Weight goal</span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-zinc-900">
          {goals.targetWeight == null ? "Not set" : `${goals.targetWeight} kg`}
        </span>
      </div>
    </div>
  );
}

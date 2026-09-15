import { Scale } from "lucide-react";
import { CalorieRing } from "@/components/goals/CalorieRing";
import { MacroBar } from "@/components/goals/MacroBar";
import type { HealthGoal } from "@/lib/healthGoalTypes";

type GoalMetricsPanelProps = {
  goals: HealthGoal;
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
};

export function GoalMetricsPanel({
  goals,
  currentCalories,
  currentProtein,
  currentCarbs,
  currentFat,
}: GoalMetricsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
        <CalorieRing consumed={currentCalories} target={goals.dailyCalorieTarget} />
      </div>

      <div className="space-y-2.5">
        <MacroBar label="Protein" consumed={currentProtein} target={goals.proteinTarget} />
        <MacroBar label="Carbs" consumed={currentCarbs} target={goals.carbTarget} />
        <MacroBar label="Fat" consumed={currentFat} target={goals.fatTarget} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-3">
        <div className="flex items-center gap-2 text-zinc-600">
          <Scale className="h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Weight goal</span>
        </div>
        <span className="text-base font-bold tabular-nums tracking-tight text-zinc-900">
          {goals.targetWeight == null ? "Not set" : `${goals.targetWeight} kg`}
        </span>
      </div>
    </div>
  );
}

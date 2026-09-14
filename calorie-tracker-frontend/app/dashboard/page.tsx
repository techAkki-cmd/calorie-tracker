"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { GoalSettingsCard } from "@/components/GoalSettingsCard";
import { useAuth } from "@/context/AuthContext";
import { useHealthGoals } from "@/hooks/useHealthGoals";
import { formatGoalNumber } from "@/lib/healthGoalValidation";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardHome />
    </RequireAuth>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const goalsState = useHealthGoals();
  const goals = goalsState.goals;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-subtle">Dashboard</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {user?.email ? `Welcome, ${user.email}` : "Welcome"}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        Track meals against your daily targets.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuickStats
            calories={goals?.dailyCalorieTarget ?? null}
            protein={goals?.proteinTarget ?? null}
            carbs={goals?.carbTarget ?? null}
            fat={goals?.fatTarget ?? null}
          />
          <section className="min-h-[22rem] rounded-lg border border-dashed border-line bg-white p-6 shadow-hairline">
            <h2 className="text-sm font-semibold tracking-tight text-ink">Meals</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Meals will appear here once logging is connected.
            </p>
          </section>
        </div>
        <div>
          <GoalSettingsCard
            goals={goalsState.goals}
            draft={goalsState.draft}
            fieldErrors={goalsState.fieldErrors}
            loadState={goalsState.loadState}
            loadError={goalsState.loadError}
            saveError={goalsState.saveError}
            saveStatus={goalsState.saveStatus}
            isSaving={goalsState.isSaving}
            isEditing={goalsState.isEditing}
            onStartEditing={goalsState.startEditing}
            onCancelEditing={goalsState.cancelEditing}
            onDraftChange={goalsState.updateDraftField}
            onSave={goalsState.saveGoals}
            onDismissSaveError={goalsState.dismissSaveError}
          />
        </div>
      </div>
    </section>
  );
}

function QuickStats({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}) {
  const items = [
    { label: "Calories", value: formatGoalNumber(calories, "kcal") },
    { label: "Protein", value: formatGoalNumber(protein, "g") },
    { label: "Carbs", value: formatGoalNumber(carbs, "g") },
    { label: "Fat", value: formatGoalNumber(fat, "g") },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-line bg-white px-3 py-3 shadow-hairline">
          <p className="text-xs text-ink-subtle">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

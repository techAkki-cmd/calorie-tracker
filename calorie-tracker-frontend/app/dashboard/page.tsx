"use client";

import { useCallback, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { TodayMealsCard } from "@/components/dashboard/TodayMealsCard";
import { GoalSettingsCard } from "@/components/GoalSettingsCard";
import { useAuth } from "@/context/AuthContext";
import { useHealthGoals } from "@/hooks/useHealthGoals";

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
  const [mealsRevision, setMealsRevision] = useState(0);
  const identity = user?.email ?? user?.id;
  const refreshMeals = useCallback(() => {
    setMealsRevision((revision) => revision + 1);
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          {identity ? `Welcome back, ${identity}` : "Welcome back"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Your nutrition analytics and daily goals, organized in one focused workspace.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <DashboardMetrics />
        <TodayMealsCard refreshKey={mealsRevision} onMealCreated={refreshMeals} />
        <aside className="md:col-span-1" aria-label="Goal settings">
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
        </aside>
      </div>
    </section>
  );
}

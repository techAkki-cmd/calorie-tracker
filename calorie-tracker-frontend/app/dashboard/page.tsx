"use client";

import { useCallback, useMemo, useState } from "react";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { TodayMealsCard } from "@/components/dashboard/TodayMealsCard";
import { GoalSettingsCard } from "@/components/GoalSettingsCard";
import { Toast } from "@/components/feedback/Toast";
import type { Meal } from "@/components/meals/MealFeed";
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
  const [analyticsRevision, setAnalyticsRevision] = useState(0);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [showPdfQueuedToast, setShowPdfQueuedToast] = useState(false);
  const identity = user?.email ?? user?.id;
  const refreshMeals = useCallback(() => {
    setMealsRevision((revision) => revision + 1);
  }, []);
  const showPdfQueuedNotification = useCallback(() => {
    setShowPdfQueuedToast(true);
  }, []);
  const dismissPdfQueuedNotification = useCallback(() => {
    setShowPdfQueuedToast(false);
  }, []);
  const updateTodayMeals = useCallback((meals: Meal[]) => {
    setTodayMeals(meals);
    setAnalyticsRevision((revision) => revision + 1);
  }, []);
  const dailyTotals = useMemo(
    () =>
      todayMeals.reduce(
        (totals, meal) => ({
          calories: totals.calories + Number(meal.calories),
          protein: totals.protein + Number(meal.protein),
          carbs: totals.carbs + Number(meal.carbs),
          fat: totals.fat + Number(meal.fat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [todayMeals],
  );

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
        <DashboardMetrics refreshKey={analyticsRevision} />
        <TodayMealsCard
          refreshKey={mealsRevision}
          onMealCreated={refreshMeals}
          onPdfQueued={showPdfQueuedNotification}
          onTodayMealsChange={updateTodayMeals}
        />
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
            currentCalories={dailyTotals.calories}
            currentProtein={dailyTotals.protein}
            currentCarbs={dailyTotals.carbs}
            currentFat={dailyTotals.fat}
          />
        </aside>
      </div>
      {showPdfQueuedToast && (
        <Toast
          message="PDF uploaded successfully. Extracting meals in the background..."
          onDismiss={dismissPdfQueuedNotification}
        />
      )}
      <ChatWidget onMealDataChanged={refreshMeals} />
    </section>
  );
}

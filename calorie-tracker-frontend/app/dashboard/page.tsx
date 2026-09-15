"use client";

import { useCallback, useState } from "react";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { TodayMealsCard } from "@/components/dashboard/TodayMealsCard";
import { WeightTrackingCard } from "@/components/dashboard/WeightTrackingCard";
import { GoalSettingsCard } from "@/components/GoalSettingsCard";
import { Toast } from "@/components/feedback/Toast";
import { useAuth } from "@/context/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
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
  const analytics = useAnalytics();
  const refetchAnalytics = analytics.refetch;
  const [mealsRevision, setMealsRevision] = useState(0);
  const [showPdfQueuedToast, setShowPdfQueuedToast] = useState(false);
  const identity = user?.email ?? user?.id;
  const refreshDashboardData = useCallback(() => {
    setMealsRevision((revision) => revision + 1);
    refetchAnalytics();
  }, [refetchAnalytics]);
  const showPdfQueuedNotification = useCallback(() => {
    setShowPdfQueuedToast(true);
  }, []);
  const dismissPdfQueuedNotification = useCallback(() => {
    setShowPdfQueuedToast(false);
  }, []);
  const dailyTotals = analytics.data?.today;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {identity ? `Welcome back, ${identity}` : "Welcome back"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Your nutrition analytics and daily goals, organized in one focused workspace.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {analytics.error && analytics.data && (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:col-span-3"
            role="status"
          >
            Dashboard totals may be outdated. {analytics.error}{" "}
            <button type="button" onClick={analytics.refetch} className="font-semibold underline">
              Try again
            </button>
          </div>
        )}
        <DashboardMetrics
          data={analytics.data}
          isLoading={analytics.isLoading}
          error={analytics.error}
          onRetry={analytics.refetch}
        />
        <TodayMealsCard
          refreshKey={mealsRevision}
          onMealsChanged={refreshDashboardData}
          onPdfQueued={showPdfQueuedNotification}
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
            currentCalories={dailyTotals?.consumedCalories ?? 0}
            currentProtein={dailyTotals?.protein ?? 0}
            currentCarbs={dailyTotals?.carbs ?? 0}
            currentFat={dailyTotals?.fat ?? 0}
          />
        </aside>
        <WeightTrackingCard />
      </div>
      {showPdfQueuedToast && (
        <Toast
          message="PDF uploaded successfully. Extracting meals in the background..."
          onDismiss={dismissPdfQueuedNotification}
        />
      )}
      <ChatWidget onMealDataChanged={refreshDashboardData} />
    </section>
  );
}

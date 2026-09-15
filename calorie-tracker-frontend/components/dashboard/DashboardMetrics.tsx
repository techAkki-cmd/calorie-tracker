"use client";

import {
  Activity,
  AlertCircle,
  Flame,
  Leaf,
  RefreshCw,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { DailyCaloriesChart } from "@/components/dashboard/charts/DailyCaloriesChart";
import { GoalVsActualChart } from "@/components/dashboard/charts/GoalVsActualChart";
import { MacroBalanceChart } from "@/components/dashboard/charts/MacroBalanceChart";
import { MicronutrientSummary } from "@/components/dashboard/charts/MicronutrientSummary";
import { WeeklyTrendChart } from "@/components/dashboard/charts/WeeklyTrendChart";
import type { WeeklyAnalytics } from "@/hooks/useAnalytics";

export function DashboardMetrics({
  data,
  isLoading,
  error,
  onRetry,
}: {
  data?: WeeklyAnalytics;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <MetricsSkeleton />;
  }

  if (!data) {
    return (
      <section
        className="card flex min-h-[22rem] items-center justify-center md:col-span-3"
        aria-label="Analytics unavailable"
      >
        <div className="max-w-sm px-6 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-rose-500" aria-hidden />
          <p className="mt-3 text-base font-semibold text-zinc-900">Analytics unavailable</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </button>
        </div>
      </section>
    );
  }

  const calorieTarget = data.goals?.dailyCalorieTarget;
  const microCount = data.micronutrients.length;
  const goalProgressLabel = data.goals
    ? `${formatNumber(data.today.consumedCalories)} / ${formatNumber(data.goals.dailyCalorieTarget)}`
    : "No goals";

  return (
    <section
      aria-label="Nutrition analytics"
      className="grid grid-cols-1 gap-6 md:col-span-3 md:grid-cols-3"
    >
      <MetricCard
        title="Daily calories"
        subtitle="Last seven days · target overlay"
        icon={Flame}
        value={`${formatNumber(data.today.consumedCalories)} kcal`}
      >
        <DailyCaloriesChart data={data.days} calorieTarget={calorieTarget} />
      </MetricCard>
      <MetricCard
        title="Macro balance"
        subtitle="Today"
        icon={Activity}
        value={`${formatNumber(data.today.protein + data.today.carbs + data.today.fat)}g`}
      >
        <MacroBalanceChart today={data.today} />
      </MetricCard>
      <MetricCard
        title="Weekly trend"
        subtitle="Daily macro totals"
        icon={TrendingUp}
        value="7 days"
      >
        <WeeklyTrendChart data={data.days} />
      </MetricCard>
      <MetricCard
        title="Goal vs actual"
        subtitle="Week totals vs 7× daily targets"
        icon={Target}
        value={goalProgressLabel}
        className="md:col-span-2"
      >
        <GoalVsActualChart days={data.days} goals={data.goals} />
      </MetricCard>
      <MetricCard
        title="Micronutrients"
        subtitle="Vitamins & minerals · 7 days"
        icon={Leaf}
        value={microCount === 0 ? "None" : `${microCount} noted`}
      >
        <MicronutrientSummary micronutrients={data.micronutrients} />
      </MetricCard>
    </section>
  );
}

function MetricCard({
  title,
  subtitle,
  value,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`card flex min-h-[22rem] flex-col overflow-hidden p-5 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 text-2xl font-bold tracking-tight tabular-nums text-zinc-900">{value}</span>
      </div>
      <div className="mt-4 min-h-[250px] flex-1">{children}</div>
    </article>
  );
}

function MetricsSkeleton() {
  return (
    <section
      aria-label="Loading nutrition analytics"
      aria-busy="true"
      className="grid grid-cols-1 gap-6 md:col-span-3 md:grid-cols-3"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <article
          key={index}
          className={`card flex min-h-[22rem] flex-col overflow-hidden p-5 ${index === 3 ? "md:col-span-2" : ""}`}
        >
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-100" />
                <div>
                  <div className="h-4 w-28 rounded bg-zinc-100" />
                  <div className="mt-2 h-3 w-20 rounded bg-zinc-100" />
                </div>
              </div>
              <div className="h-7 w-16 rounded bg-zinc-100" />
            </div>
            <div className="mt-8 min-h-[250px] rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-50" />
          </div>
        </article>
      ))}
    </section>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

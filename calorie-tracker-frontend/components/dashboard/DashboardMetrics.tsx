"use client";

import {
  Activity,
  AlertCircle,
  Flame,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { DailyCaloriesChart } from "@/components/dashboard/charts/DailyCaloriesChart";
import { MacroBalanceChart } from "@/components/dashboard/charts/MacroBalanceChart";
import { WeeklyTrendChart } from "@/components/dashboard/charts/WeeklyTrendChart";
import { useAnalytics } from "@/hooks/useAnalytics";

export function DashboardMetrics({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data, isLoading, error, refetch } = useAnalytics(refreshKey);

  if (isLoading) {
    return <MetricsSkeleton />;
  }

  if (error || !data) {
    return (
      <section
        className="card flex h-72 items-center justify-center md:col-span-3"
        aria-label="Analytics unavailable"
      >
        <div className="max-w-sm px-6 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-rose-500" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-zinc-900">Analytics unavailable</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Nutrition analytics"
      className="grid grid-cols-1 gap-6 md:col-span-3 md:grid-cols-3"
    >
      <MetricCard
        title="Daily calories"
        subtitle="Last seven days"
        icon={Flame}
        value={`${formatNumber(data.today.consumedCalories)} kcal`}
      >
        <DailyCaloriesChart data={data.days} />
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
    </section>
  );
}

function MetricCard({
  title,
  subtitle,
  value,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <article className="card h-72 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            <p className="mt-0.5 text-[0.65rem] text-zinc-400">{subtitle}</p>
          </div>
        </div>
        <span className="text-sm font-semibold tabular-nums text-zinc-950">{value}</span>
      </div>
      <div className="mt-4">{children}</div>
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
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} className="card h-72 overflow-hidden p-5">
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-zinc-100" />
                <div>
                  <div className="h-3.5 w-24 rounded bg-zinc-100" />
                  <div className="mt-2 h-2.5 w-16 rounded bg-zinc-100" />
                </div>
              </div>
              <div className="h-4 w-14 rounded bg-zinc-100" />
            </div>
            <div className="mt-8 h-40 rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-50" />
          </div>
        </article>
      ))}
    </section>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

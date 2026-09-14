import { Activity, Flame, TrendingUp, type LucideIcon } from "lucide-react";

const metrics: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Daily calories", icon: Flame },
  { label: "Macro balance", icon: Activity },
  { label: "Weekly trend", icon: TrendingUp },
];

export function DashboardMetrics() {
  return (
    <section
      aria-label="Nutrition metric placeholders"
      className="grid grid-cols-1 gap-6 md:col-span-3 md:grid-cols-3"
    >
      {metrics.map(({ label, icon: Icon }) => (
        <article key={label} className="card overflow-hidden p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <h2 className="text-sm font-semibold text-zinc-900">{label}</h2>
            </div>
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-zinc-400">
              Coming soon
            </span>
          </div>

          <div className="mt-6 animate-pulse" aria-hidden>
            <div className="h-7 w-24 rounded-md bg-zinc-100" />
            <div className="mt-4 flex items-end gap-2">
              <div className="h-5 flex-1 rounded bg-zinc-100" />
              <div className="h-9 flex-1 rounded bg-zinc-100" />
              <div className="h-7 flex-1 rounded bg-zinc-100" />
              <div className="h-12 flex-1 rounded bg-zinc-100" />
              <div className="h-8 flex-1 rounded bg-zinc-100" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

import { UtensilsCrossed } from "lucide-react";

export function TodayMealsCard() {
  return (
    <section className="card flex min-h-[26rem] flex-col md:col-span-2">
      <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Today&apos;s Meals</h2>
          <p className="mt-1 text-xs text-zinc-500">Your daily nutrition timeline</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
          Today
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 shadow-sm">
            <UtensilsCrossed className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="mt-5 text-base font-semibold text-zinc-900">Your meal timeline is empty</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Meals will appear here</p>
        </div>
      </div>
    </section>
  );
}

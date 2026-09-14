"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MealLogModal } from "@/components/meals/MealLogModal";
import { MealFeed } from "@/components/meals/MealFeed";

type TodayMealsCardProps = {
  refreshKey: number;
  onMealCreated: () => void;
};

export function TodayMealsCard({ refreshKey, onMealCreated }: TodayMealsCardProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  return (
    <>
      <section className="card flex min-h-[26rem] flex-col md:col-span-2">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Today&apos;s Meals</h2>
            <p className="mt-1 text-xs text-zinc-500">Your daily nutrition timeline</p>
          </div>
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Log Meal
          </button>
        </header>

        <MealFeed refreshKey={refreshKey} />
      </section>
      <MealLogModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onMealCreated={onMealCreated}
      />
    </>
  );
}

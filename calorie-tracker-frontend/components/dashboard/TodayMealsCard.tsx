"use client";

import { useState } from "react";
import { FileUp, Plus } from "lucide-react";
import { MealLogModal } from "@/components/meals/MealLogModal";
import { MealFeed } from "@/components/meals/MealFeed";
import { PdfImportModal } from "@/components/meals/PdfImportModal";
import type { Meal } from "@/components/meals/MealFeed";

type TodayMealsCardProps = {
  refreshKey: number;
  onMealCreated: () => void;
  onPdfQueued: () => void;
  onTodayMealsChange: (meals: Meal[]) => void;
};

export function TodayMealsCard({
  refreshKey,
  onMealCreated,
  onPdfQueued,
  onTodayMealsChange,
}: TodayMealsCardProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  return (
    <>
      <section className="card flex min-h-[26rem] flex-col md:col-span-2">
        <header className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Meal Timeline</h2>
            <p className="mt-1 text-xs text-zinc-500">Browse your daily nutrition history</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden />
              Import PDF Diary
            </button>
            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Log Meal
            </button>
          </div>
        </header>

        <MealFeed refreshKey={refreshKey} onTodayMealsChange={onTodayMealsChange} />
      </section>
      <MealLogModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onMealCreated={onMealCreated}
      />
      <PdfImportModal
        open={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onQueued={onPdfQueued}
      />
    </>
  );
}

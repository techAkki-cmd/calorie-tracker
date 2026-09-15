"use client";

import { useState } from "react";
import { FileClock, FileUp, Plus } from "lucide-react";
import { JobHistoryModal } from "@/components/meals/JobHistoryModal";
import { MealLogModal } from "@/components/meals/MealLogModal";
import { MealFeed } from "@/components/meals/MealFeed";
import { PdfImportModal } from "@/components/meals/PdfImportModal";

type TodayMealsCardProps = {
  refreshKey: number;
  onMealsChanged: () => void;
  onPdfQueued: () => void;
};

export function TodayMealsCard({
  refreshKey,
  onMealsChanged,
  onPdfQueued,
}: TodayMealsCardProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isJobHistoryOpen, setIsJobHistoryOpen] = useState(false);

  return (
    <>
      <section className="card flex min-h-[26rem] flex-col md:col-span-2">
        <header className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Meal Timeline</h2>
            <p className="mt-1 text-xs text-zinc-600">Browse your daily nutrition history</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsJobHistoryOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
            >
              <FileClock className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Import History</span>
              <span className="sm:hidden">History</span>
            </button>
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
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Log Meal
            </button>
          </div>
        </header>

        <MealFeed refreshKey={refreshKey} onMealsChanged={onMealsChanged} />
      </section>
      <MealLogModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onMealCreated={onMealsChanged}
      />
      <PdfImportModal
        open={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onQueued={onPdfQueued}
      />
      <JobHistoryModal
        open={isJobHistoryOpen}
        onClose={() => setIsJobHistoryOpen(false)}
      />
    </>
  );
}

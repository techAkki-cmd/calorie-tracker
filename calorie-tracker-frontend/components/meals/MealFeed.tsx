"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { ApiError, apiClient } from "@/lib/apiClient";

type Meal = {
  id: string;
  name: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: string;
};

type MealPageResponse = {
  content: Meal[];
  totalPages: number;
  page?: number;
  number?: number;
};

type MealFeedProps = {
  refreshKey: number;
};

const PAGE_SIZE = 10;

export function MealFeed({ refreshKey }: MealFeedProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [deletingMealId, setDeletingMealId] = useState<string>();
  const [requestVersion, setRequestVersion] = useState(0);
  const today = useMemo(() => formatLocalDate(new Date()), []);

  useEffect(() => {
    setPage(0);
  }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMeals() {
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const params = new URLSearchParams({
          startDate: today,
          endDate: today,
          page: String(page),
          size: String(PAGE_SIZE),
          sort: "consumedAt,desc",
        });
        const response = await apiClient<MealPageResponse>(`/api/meals?${params.toString()}`, {
          signal: controller.signal,
        });
        setMeals(response.content);
        setTotalPages(response.totalPages);
        const responsePage = response.number ?? response.page ?? page;
        if (responsePage !== page) {
          setPage(responsePage);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(error instanceof ApiError ? error.detail : "Meals could not be loaded.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadMeals();
    return () => controller.abort();
  }, [page, refreshKey, requestVersion, today]);

  const deleteMeal = async (mealId: string) => {
    if (deletingMealId) {
      return;
    }
    setDeletingMealId(mealId);
    setLoadError(undefined);
    try {
      await apiClient<void>(`/api/meals/${mealId}`, { method: "DELETE" });
      if (meals.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        setRequestVersion((version) => version + 1);
      }
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.detail : "The meal could not be deleted.");
    } finally {
      setDeletingMealId(undefined);
    }
  };

  if (isLoading) {
    return <MealFeedSkeleton />;
  }

  if (loadError && meals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="max-w-sm text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-semibold text-zinc-900">Unable to load meals</p>
          <p className="mt-1.5 text-sm text-zinc-500">{loadError}</p>
          <button
            type="button"
            onClick={() => setRequestVersion((version) => version + 1)}
            className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 shadow-sm">
            <UtensilsCrossed className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="mt-5 text-base font-semibold text-zinc-900">Your meal timeline is empty</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Meals will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 p-4 sm:p-5">
        {loadError && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {loadError}
          </p>
        )}
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            isDeleting={deletingMealId === meal.id}
            onDelete={() => void deleteMeal(meal.id)}
          />
        ))}
      </div>

      <nav
        className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 sm:px-5"
        aria-label="Meal feed pagination"
      >
        <p className="text-xs tabular-nums text-zinc-500">
          Page <span className="font-semibold text-zinc-800">{page + 1}</span> of{" "}
          <span className="font-semibold text-zinc-800">{Math.max(totalPages, 1)}</span>
        </p>
        <div className="flex items-center gap-2">
          <PaginationButton
            label="Previous"
            icon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden />}
            disabled={page === 0 || isLoading}
            onClick={() => setPage((current) => current - 1)}
          />
          <PaginationButton
            label="Next"
            icon={<ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            iconAfter
            disabled={totalPages === 0 || page >= totalPages - 1 || isLoading}
            onClick={() => setPage((current) => current + 1)}
          />
        </div>
      </nav>
    </div>
  );
}

function MealCard({
  meal,
  isDeleting,
  onDelete,
}: {
  meal: Meal;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="group relative flex min-h-[7.25rem] gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgb(24_24_27/0.03)] transition hover:border-zinc-300 hover:shadow-sm">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
        <UtensilsCrossed className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pr-7">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">{meal.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {toTitleCase(meal.mealType)} · {meal.quantity}
            </p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-zinc-400">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={meal.consumedAt}>{formatMealTime(meal.consumedAt)}</time>
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <MacroPill label="Protein" value={meal.protein} className="bg-blue-50 text-blue-700" />
          <MacroPill label="Carbs" value={meal.carbs} className="bg-orange-50 text-orange-700" />
          <MacroPill label="Fat" value={meal.fat} className="bg-rose-50 text-rose-700" />
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[0.65rem] font-bold tabular-nums text-white">
            {meal.calories} kcal
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label={`Delete ${meal.name}`}
        title="Delete meal"
        disabled={isDeleting}
        onClick={onDelete}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-wait disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </article>
  );
}

function MacroPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tabular-nums ${className}`}>
      {label} {formatMacro(value)}g
    </span>
  );
}

function PaginationButton({
  label,
  icon,
  iconAfter = false,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  iconAfter?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {!iconAfter && icon}
      {label}
      {iconAfter && icon}
    </button>
  );
}

function MealFeedSkeleton() {
  return (
    <div className="flex-1 space-y-3 p-4 sm:p-5" aria-label="Loading meals" aria-busy="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[7.25rem] animate-pulse gap-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="h-9 w-9 shrink-0 rounded-xl bg-zinc-100" />
          <div className="flex-1">
            <div className="h-4 w-2/5 rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-1/4 rounded bg-zinc-100" />
            <div className="mt-5 flex gap-2">
              <div className="h-6 w-20 rounded-full bg-zinc-100" />
              <div className="h-6 w-20 rounded-full bg-zinc-100" />
              <div className="h-6 w-16 rounded-full bg-zinc-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMealTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMacro(value: number): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
}

function toTitleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

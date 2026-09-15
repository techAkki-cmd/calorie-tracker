"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Leaf,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { ApiError, apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { useLocalDay } from "@/hooks/useLocalDay";

export type Meal = {
  id: string;
  name: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrientSummary?: string;
  consumedAt: string;
};

type MealType = Meal["mealType"];
type MealTypeFilter = "ALL" | MealType;

type MealPageResponse = {
  content: Meal[];
  totalPages: number;
  page?: number;
  number?: number;
};

type MealFeedProps = {
  refreshKey: number;
  onMealsChanged: () => void;
};

type PdfImportStatusResponse = {
  jobId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
};

type PdfImportQueuedDetail = {
  jobId: string;
};

const PAGE_SIZE = 10;
const PDF_POLL_INTERVAL_MS = 3_000;
const PDF_POLL_WINDOW_MS = 5 * 60_000;
const MEAL_TYPE_FILTERS: ReadonlyArray<{ value: MealTypeFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACKS", label: "Snacks" },
];

export function MealFeed({ refreshKey, onMealsChanged }: MealFeedProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [deletingMealId, setDeletingMealId] = useState<string>();
  const [requestVersion, setRequestVersion] = useState(0);
  const [isPdfSyncing, setIsPdfSyncing] = useState(false);
  const [pdfSyncError, setPdfSyncError] = useState<string>();
  const hasLoadedMeals = useRef(false);
  const pageRef = useRef(page);
  const pollingIntervalRef = useRef<number>();
  const pollingTimeoutRef = useRef<number>();
  const pollingRequestRef = useRef<AbortController>();
  const { date: today, timezone } = useLocalDay();
  const [startDate, setStartDate] = useState(() => shiftDate(today, -6));
  const [endDate, setEndDate] = useState(today);
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>("ALL");
  const previousTodayRef = useRef(today);
  const rangeError = startDate > endDate ? "Start date must be on or before end date." : undefined;

  useEffect(() => {
    const previousToday = previousTodayRef.current;
    if (endDate === previousToday) {
      const usedRollingWeek = startDate === shiftDate(previousToday, -6);
      setEndDate(today);
      if (usedRollingWeek) {
        setStartDate(shiftDate(today, -6));
      }
    }
    previousTodayRef.current = today;
  }, [endDate, startDate, today]);

  useEffect(() => {
    pageRef.current = 0;
    setPage(0);
  }, [refreshKey]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const fetchMeals = useCallback(
    async (signal?: AbortSignal) => {
      if (!hasLoadedMeals.current) {
        setIsLoading(true);
      }
      setLoadError(undefined);
      try {
        const requestedPage = pageRef.current;
        const params = mealQuery(
          startDate,
          endDate,
          timezone,
          requestedPage,
          PAGE_SIZE,
          mealTypeFilter === "ALL" ? undefined : mealTypeFilter,
        );
        const response = await apiClient<MealPageResponse>(`/api/meals?${params.toString()}`, {
          signal,
        });
        setMeals(response.content);
        setTotalPages(response.totalPages);
        const responsePage = response.number ?? response.page ?? requestedPage;
        if (responsePage !== requestedPage) {
          setPage(responsePage);
        }
        hasLoadedMeals.current = true;
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setLoadError(error instanceof ApiError ? error.detail : "Meals could not be loaded.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [endDate, mealTypeFilter, startDate, timezone],
  );

  useEffect(() => {
    if (rangeError) {
      setIsLoading(false);
      setMeals([]);
      setTotalPages(0);
      setLoadError(undefined);
      return;
    }

    const controller = new AbortController();
    void fetchMeals(controller.signal);
    return () => controller.abort();
  }, [fetchMeals, page, rangeError, refreshKey, requestVersion]);

  useEffect(() => {
    const stopPolling = (updateUi = true) => {
      if (pollingIntervalRef.current !== undefined) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      if (pollingTimeoutRef.current !== undefined) {
        window.clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = undefined;
      }
      pollingRequestRef.current?.abort();
      pollingRequestRef.current = undefined;
      if (updateUi) {
        setIsPdfSyncing(false);
      }
    };

    const pollImportStatus = (jobId: string) => {
      pollingRequestRef.current?.abort();
      const controller = new AbortController();
      pollingRequestRef.current = controller;
      void apiClient<PdfImportStatusResponse>(`/api/meals/import-status/${jobId}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (job) => {
          setPdfSyncError(undefined);
          if (job.status === "PENDING") {
            return;
          }
          stopPolling();
          if (job.status === "FAILED") {
            setPdfSyncError("PDF extraction failed. Check the file and try the import again.");
            return;
          }
          onMealsChanged();
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            setPdfSyncError(
              error instanceof ApiError
                ? error.detail
                : "Import status could not be checked. Please refresh the timeline.",
            );
          }
        });
    };

    const handlePdfImportQueued = (event: Event) => {
      const jobId = (event as CustomEvent<PdfImportQueuedDetail>).detail?.jobId;
      if (!jobId) {
        return;
      }
      stopPolling();
      setPdfSyncError(undefined);
      setIsPdfSyncing(true);
      pollImportStatus(jobId);
      pollingIntervalRef.current = window.setInterval(
        () => pollImportStatus(jobId),
        PDF_POLL_INTERVAL_MS,
      );
      pollingTimeoutRef.current = window.setTimeout(() => {
        stopPolling();
        setPdfSyncError("The import is still processing. Refresh the timeline in a few moments.");
      }, PDF_POLL_WINDOW_MS);
    };

    window.addEventListener("pdfImportQueued", handlePdfImportQueued);
    return () => {
      window.removeEventListener("pdfImportQueued", handlePdfImportQueued);
      stopPolling(false);
    };
  }, [fetchMeals, onMealsChanged]);

  const deleteMeal = async (mealId: string) => {
    if (deletingMealId) {
      return;
    }
    setDeletingMealId(mealId);
    setLoadError(undefined);
    try {
      await apiClient<void>(`/api/meals/${mealId}`, { method: "DELETE" });
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
      if (meals.length === 1 && page > 0) {
        pageRef.current = page - 1;
        setPage(page - 1);
      }
      onMealsChanged();
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.detail : "The meal could not be deleted.");
    } finally {
      setDeletingMealId(undefined);
    }
  };

  const applyRange = (nextStart: string, nextEnd: string) => {
    pageRef.current = 0;
    setPage(0);
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setMeals([]);
    setTotalPages(0);
    setIsLoading(nextStart <= nextEnd);
  };

  const changeMealTypeFilter = (filter: MealTypeFilter) => {
    pageRef.current = 0;
    setPage(0);
    setMeals([]);
    setTotalPages(0);
    setIsLoading(!rangeError);
    setMealTypeFilter(filter);
  };

  const rangeLabel = formatRangeLabel(startDate, endDate, today);
  const filters = (
    <MealFilters
      startDate={startDate}
      endDate={endDate}
      today={today}
      mealType={mealTypeFilter}
      rangeError={rangeError}
      rangeLabel={rangeLabel}
      onStartDateChange={(date) => applyRange(date, endDate)}
      onEndDateChange={(date) => applyRange(startDate, date)}
      onPresetRange={applyRange}
      onMealTypeChange={changeMealTypeFilter}
    />
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <PdfSyncIndicator active={isPdfSyncing} />
        <PdfSyncError message={pdfSyncError} />
        {filters}
        <MealFeedSkeleton />
      </div>
    );
  }

  if (loadError && meals.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PdfSyncIndicator active={isPdfSyncing} />
        <PdfSyncError message={pdfSyncError} />
        {filters}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="max-w-sm text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-semibold text-zinc-900">Unable to load meals</p>
            <p className="mt-1.5 text-sm text-zinc-600">
              Could not load meals for {rangeLabel}. {loadError}
            </p>
            <button
              type="button"
              onClick={() => setRequestVersion((version) => version + 1)}
              className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PdfSyncIndicator active={isPdfSyncing} />
        <PdfSyncError message={pdfSyncError} />
        {filters}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="flex max-w-sm flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 shadow-sm">
              <UtensilsCrossed className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-base font-semibold text-zinc-900">
              {rangeError
                ? "Choose a valid date range"
                : startDate === endDate && startDate === today
                  ? "Your meal timeline is empty"
                  : `No meals for ${rangeLabel}`}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {rangeError
                ? rangeError
                : startDate === endDate && startDate === today
                  ? "Meals logged today will appear here."
                  : "Try a different date range or meal type."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PdfSyncIndicator active={isPdfSyncing} />
      <PdfSyncError message={pdfSyncError} />
      {filters}
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
            showDate={startDate !== endDate}
            isDeleting={deletingMealId === meal.id}
            onDelete={() => void deleteMeal(meal.id)}
          />
        ))}
      </div>

      <nav
        className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 sm:px-5"
        aria-label="Meal feed pagination"
      >
        <p className="text-xs tabular-nums text-zinc-600">
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

function MealFilters({
  startDate,
  endDate,
  today,
  mealType,
  rangeError,
  rangeLabel,
  onStartDateChange,
  onEndDateChange,
  onPresetRange,
  onMealTypeChange,
}: {
  startDate: string;
  endDate: string;
  today: string;
  mealType: MealTypeFilter;
  rangeError?: string;
  rangeLabel: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPresetRange: (startDate: string, endDate: string) => void;
  onMealTypeChange: (mealType: MealTypeFilter) => void;
}) {
  const isTodayOnly = startDate === today && endDate === today;
  const isLastSevenDays = startDate === shiftDate(today, -6) && endDate === today;

  return (
    <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
          <CalendarDays className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          <span>{rangeLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="meal-feed-start-date">
            Start date
          </label>
          <input
            id="meal-feed-start-date"
            type="date"
            max={today}
            value={startDate}
            aria-invalid={Boolean(rangeError)}
            aria-describedby={rangeError ? "meal-feed-range-error" : undefined}
            onChange={(event) => {
              if (event.target.value) onStartDateChange(event.target.value);
            }}
            className={cn(
              "h-8 rounded-lg border bg-white px-2 text-xs font-medium text-zinc-700 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600",
              rangeError ? "border-red-400" : "border-zinc-200",
            )}
          />
          <span className="text-xs text-zinc-400" aria-hidden>
            to
          </span>
          <label className="sr-only" htmlFor="meal-feed-end-date">
            End date
          </label>
          <input
            id="meal-feed-end-date"
            type="date"
            max={today}
            value={endDate}
            aria-invalid={Boolean(rangeError)}
            aria-describedby={rangeError ? "meal-feed-range-error" : undefined}
            onChange={(event) => {
              if (event.target.value) onEndDateChange(event.target.value);
            }}
            className={cn(
              "h-8 rounded-lg border bg-white px-2 text-xs font-medium text-zinc-700 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-600",
              rangeError ? "border-red-400" : "border-zinc-200",
            )}
          />
          <button
            type="button"
            aria-pressed={isLastSevenDays}
            onClick={() => onPresetRange(shiftDate(today, -6), today)}
            className={cn(
              "ml-1 h-8 rounded-lg px-2.5 text-xs font-semibold transition",
              isLastSevenDays
                ? "bg-teal-600 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            Last 7 days
          </button>
          <button
            type="button"
            aria-pressed={isTodayOnly}
            onClick={() => onPresetRange(today, today)}
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-semibold transition",
              isTodayOnly
                ? "bg-teal-600 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            Today
          </button>
        </div>
      </div>
      {rangeError && (
        <p id="meal-feed-range-error" className="text-xs font-medium text-red-600" role="alert">
          {rangeError}
        </p>
      )}
      <div
        className="grid grid-cols-5 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm"
        role="group"
        aria-label="Filter timeline by meal type"
      >
        {MEAL_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={mealType === filter.value}
            onClick={() => onMealTypeChange(filter.value)}
            className={cn(
              "min-w-0 rounded-md px-1.5 py-1.5 text-[0.65rem] font-semibold transition sm:text-xs",
              mealType === filter.value
                ? "bg-teal-600 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PdfSyncIndicator({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 border-b border-teal-100 bg-teal-50/60 px-5 py-2 text-xs font-medium text-teal-700"
      role="status"
      aria-live="polite"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" aria-hidden />
      Syncing background data...
    </div>
  );
}

function PdfSyncError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 border-b border-red-100 bg-red-50/70 px-5 py-2 text-xs font-medium text-red-700"
      role="alert"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function MealCard({
  meal,
  showDate,
  isDeleting,
  onDelete,
}: {
  meal: Meal;
  showDate: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="group relative flex min-h-[7.25rem] gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgb(24_24_27/0.03)] transition hover:border-zinc-300 hover:shadow-sm">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
        <UtensilsCrossed className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pr-7">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">{meal.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              {toTitleCase(meal.mealType)} · {meal.quantity}
            </p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-zinc-400">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={meal.consumedAt}>{formatMealTimestamp(meal.consumedAt, showDate)}</time>
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <MacroPill label="Protein" value={meal.protein} className="bg-slate-100 text-slate-700" />
          <MacroPill label="Carbs" value={meal.carbs} className="bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200" />
          <MacroPill label="Fat" value={meal.fat} className="bg-teal-50 text-teal-700" />
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[0.65rem] font-bold tabular-nums text-white">
            {meal.calories} kcal
          </span>
        </div>
        {meal.micronutrientSummary && (
          <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50/70 px-2.5 py-1 text-[0.65rem] font-medium text-teal-800">
            <Leaf className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">Micronutrients · {meal.micronutrientSummary}</span>
          </span>
        )}
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

function formatMealTimestamp(value: string, includeDate: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return new Intl.DateTimeFormat(undefined, {
    ...(includeDate ? { month: "short" as const, day: "numeric" as const } : {}),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMealDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRangeLabel(startDate: string, endDate: string, today: string): string {
  if (startDate === endDate) {
    return startDate === today ? "Today" : formatMealDate(startDate);
  }
  return `${formatMealDate(startDate)} – ${formatMealDate(endDate)}`;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mealQuery(
  startDate: string,
  endDate: string,
  timezone: string,
  page: number,
  size: number,
  mealType?: MealType,
): URLSearchParams {
  const params = new URLSearchParams({
    startDate,
    endDate,
    timezone,
    page: String(page),
    size: String(size),
    sort: "consumedAt,desc",
  });
  if (mealType) {
    params.set("mealType", mealType);
  }
  return params;
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

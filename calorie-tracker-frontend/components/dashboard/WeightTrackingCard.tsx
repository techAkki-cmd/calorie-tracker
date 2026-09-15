"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/dashboard/charts/ChartTooltip";
import { ApiError, apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/cn";

type WeightMeasurement = {
  id: string;
  timestamp: string;
  value: number;
  createdAt: string;
};

type WeightPage = {
  content: WeightMeasurement[];
  totalPages: number;
};

const MAX_MEASUREMENTS = 90;

export function WeightTrackingCard() {
  const mutationInFlightRef = useRef(false);
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([]);
  const [weight, setWeight] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>();
  const [deletingMeasurementId, setDeletingMeasurementId] = useState<string>();

  const fetchMeasurements = useCallback(async (signal?: AbortSignal) => {
    setError(undefined);
    try {
      const params = new URLSearchParams({
        page: "0",
        size: String(MAX_MEASUREMENTS),
        sort: "timestamp,desc",
      });
      const response = await apiClient<WeightPage>(`/api/weight?${params}`, {
        signal,
        cache: "no-store",
      });
      setMeasurements(response.content);
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(
          requestError instanceof ApiError
            ? requestError.detail
            : "Weight history could not be loaded.",
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMeasurements(controller.signal);
    return () => controller.abort();
  }, [fetchMeasurements]);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }
    const timeout = window.setTimeout(() => setSaveSuccess(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [saveSuccess]);

  const chartData = useMemo(
    () =>
      [...measurements]
        .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
        .map((measurement) => ({
          ...measurement,
          value: Number(measurement.value),
          label: formatChartDate(measurement.timestamp),
        })),
    [measurements],
  );
  const latest = chartData.at(-1);
  const previous = chartData.at(-2);
  const change = latest && previous ? latest.value - previous.value : undefined;
  const recentMeasurements = chartData.slice().reverse().slice(0, 5);
  const isMutating = isSaving || Boolean(deletingMeasurementId);

  const submitWeight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationInFlightRef.current) {
      return;
    }
    setSaveSuccess(false);
    const parsed = Number(weight);
    const fraction = weight.split(".")[1];
    if (
      !weight.trim() ||
      !Number.isFinite(parsed) ||
      parsed < 1 ||
      parsed > 1000 ||
      Boolean(fraction && fraction.length > 2)
    ) {
      setError("Enter a weight from 1 to 1,000 kg with up to two decimal places.");
      return;
    }

    mutationInFlightRef.current = true;
    setIsSaving(true);
    setError(undefined);
    try {
      const created = await apiClient<WeightMeasurement>("/api/weight", {
        method: "POST",
        body: { timestamp: new Date().toISOString(), value: parsed },
      });
      setMeasurements((current) => [...current, created]);
      setWeight("");
      setSaveSuccess(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.detail
          : "Today's weight could not be saved.",
      );
    } finally {
      mutationInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const deleteMeasurement = async (measurementId: string) => {
    if (mutationInFlightRef.current) {
      return;
    }
    mutationInFlightRef.current = true;
    setDeletingMeasurementId(measurementId);
    setError(undefined);
    setSaveSuccess(false);
    try {
      await apiClient<void>(`/api/weight/${measurementId}`, { method: "DELETE" });
      setMeasurements((current) =>
        current.filter((measurement) => measurement.id !== measurementId),
      );
      setConfirmingDeleteId(undefined);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.detail
          : "The weight measurement could not be deleted.",
      );
    } finally {
      mutationInFlightRef.current = false;
      setDeletingMeasurementId(undefined);
    }
  };

  return (
    <section className="card overflow-hidden md:col-span-3" aria-labelledby="weight-tracking-title">
      <header className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="weight-tracking-title" className="text-base font-semibold text-zinc-900">
              Weight tracking
            </h2>
            <p className="mt-0.5 text-sm text-zinc-600">Your latest 90 measurements</p>
          </div>
        </div>
        <form onSubmit={submitWeight} className="flex items-start gap-2" noValidate>
          <div>
            <label htmlFor="daily-weight" className="sr-only">Today&apos;s weight in kilograms</label>
            <div className="relative">
              <input
                id="daily-weight"
                type="number"
                inputMode="decimal"
                min={1}
                max={1000}
                step={0.01}
                value={weight}
                disabled={isMutating}
                placeholder="Today&apos;s weight"
                onChange={(event) => {
                  setWeight(event.target.value);
                  setError(undefined);
                  setSaveSuccess(false);
                }}
                className="form-input h-10 w-40 pr-9 text-sm sm:w-44"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-zinc-500">kg</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={isMutating || !weight.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Scale className="h-3.5 w-3.5" aria-hidden />
            )}
            {isSaving ? "Saving…" : saveSuccess ? "Saved" : "Log weight"}
          </button>
        </form>
      </header>

      {error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/70 px-5 py-2.5 text-sm text-red-700" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <div className="grid min-h-72 gap-6 p-5 sm:p-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5">
          <div>
            <p className="text-sm font-medium text-zinc-600">Latest measurement</p>
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-zinc-900">
              {latest ? latest.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
              {latest && <span className="ml-1 text-xl font-semibold text-zinc-600">kg</span>}
            </p>
            {change !== undefined && (
              <p className={cn("mt-3 inline-flex items-center gap-1 text-sm font-semibold", change <= 0 ? "text-teal-700" : "text-amber-700")}>
                {change <= 0 ? <TrendingDown className="h-3.5 w-3.5" aria-hidden /> : <TrendingUp className="h-3.5 w-3.5" aria-hidden />}
                {change > 0 ? "+" : ""}{change.toFixed(2)} kg since prior entry
              </p>
            )}
            {latest && <p className="mt-2 text-sm text-zinc-500">{formatFullDate(latest.timestamp)}</p>}
          </div>

          {recentMeasurements.length > 0 && (
            <div className="mt-5 border-t border-zinc-200/70 pt-4">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Recent entries
              </p>
              <ul className="mt-2 space-y-1" aria-label="Recent weight measurements">
                {recentMeasurements.map((measurement) => {
                  const isConfirming = confirmingDeleteId === measurement.id;
                  const isDeleting = deletingMeasurementId === measurement.id;
                  return (
                    <li
                      key={measurement.id}
                      className="flex min-h-9 items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums text-zinc-800">
                          {measurement.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                        </p>
                        <p className="truncate text-sm text-zinc-500">
                          {formatFullDate(measurement.timestamp)}
                        </p>
                      </div>
                      {isConfirming ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label="Cancel deletion"
                            title="Cancel"
                            disabled={isMutating}
                            onClick={() => setConfirmingDeleteId(undefined)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label={`Confirm deletion of ${measurement.value} kilograms from ${formatFullDate(measurement.timestamp)}`}
                            disabled={isMutating}
                            onClick={() => void deleteMeasurement(measurement.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-red-600 px-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            {isDeleting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete ${measurement.value} kilograms from ${formatFullDate(measurement.timestamp)}`}
                          title="Delete measurement"
                          disabled={isMutating}
                          onClick={() => {
                            setConfirmingDeleteId(measurement.id);
                            setError(undefined);
                          }}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="min-h-[300px] h-[300px] min-w-0">
          {isLoading ? (
            <div className="h-full animate-pulse rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-50" aria-label="Loading weight history" />
          ) : chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 text-center">
              <Scale className="h-5 w-5 text-zinc-500" aria-hidden />
              <p className="mt-3 text-base font-semibold text-zinc-800">No weight history yet</p>
              <p className="mt-1 text-sm text-zinc-600">Log today&apos;s weight to begin your trend.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 15, bottom: 5, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#f4f4f5" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 12 }} dy={8} minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 12 }} width={42} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip content={<ChartTooltip valueSuffix=" kg" />} cursor={{ stroke: "#d4d4d8", strokeDasharray: "3 3" }} />
                <Line type="monotone" dataKey="value" name="Weight" stroke="#0d9488" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#0d9488", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

function formatChartDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

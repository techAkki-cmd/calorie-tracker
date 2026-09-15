"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { ApiError, apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/cn";

type ImportJobStatus = "PENDING" | "COMPLETED" | "FAILED";

type PdfImportJob = {
  jobId: string;
  status: ImportJobStatus;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

type JobPage = {
  content: PdfImportJob[];
  page: number;
  totalPages: number;
  totalElements: number;
};

type JobHistoryModalProps = {
  open: boolean;
  onClose: () => void;
};

const PAGE_SIZE = 8;

export function JobHistoryModal({ open, onClose }: JobHistoryModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [jobs, setJobs] = useState<PdfImportJob[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string>();
  const [error, setError] = useState<string>();

  const fetchJobs = useCallback(async (
    requestedPage: number,
    signal?: AbortSignal,
    background = false,
  ) => {
    if (!background) {
      setIsLoading(true);
    }
    setError(undefined);
    try {
      const params = new URLSearchParams({
        page: String(requestedPage),
        size: String(PAGE_SIZE),
        sort: "createdAt,desc",
      });
      const response = await apiClient<JobPage>(`/api/meals/import-jobs?${params}`, {
        signal,
        cache: "no-store",
      });
      setJobs(response.content);
      setPage(response.page);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(
          requestError instanceof ApiError
            ? requestError.detail
            : "Import history could not be loaded.",
        );
      }
    } finally {
      if (!signal?.aborted && !background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    void fetchJobs(page, controller.signal);
    return () => controller.abort();
  }, [fetchJobs, open, page]);

  useEffect(() => {
    if (!open) {
      setPage(0);
      setError(undefined);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !retryingJobId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open, retryingJobId]);

  const hasPendingJobs = jobs.some((job) => job.status === "PENDING");
  useEffect(() => {
    if (!open || !hasPendingJobs) {
      return;
    }
    let controller: AbortController | undefined;
    const interval = window.setInterval(() => {
      controller?.abort();
      controller = new AbortController();
      void fetchJobs(page, controller.signal, true);
    }, 3_000);
    return () => {
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [fetchJobs, hasPendingJobs, open, page]);

  if (!open) {
    return null;
  }

  const retryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    setError(undefined);
    try {
      const retried = await apiClient<PdfImportJob>(`/api/meals/import-jobs/${jobId}/retry`, {
        method: "POST",
      });
      setJobs((current) => current.map((job) => (job.jobId === jobId ? retried : job)));
      window.dispatchEvent(new CustomEvent("pdfImportQueued", { detail: { jobId } }));
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.detail
          : "The import could not be queued for retry.",
      );
    } finally {
      setRetryingJobId(undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close import history"
        className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
        onClick={() => !retryingJobId && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-history-title"
        tabIndex={-1}
        className="card relative z-10 flex max-h-[min(48rem,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl outline-none"
      >
        <header className="flex items-start justify-between border-b border-zinc-100 px-5 py-5 sm:px-6">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <FileClock className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="job-history-title" className="text-lg font-semibold tracking-tight text-zinc-900">
                PDF import history
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {totalElements === 0 ? "Track background diary processing." : `${totalElements} import jobs`}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={Boolean(retryingJobId)}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-64 flex-1 overflow-y-auto p-5 sm:p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <JobListSkeleton />
          ) : jobs.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500">
                <FileClock className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-base font-semibold text-zinc-900">No imports yet</p>
              <p className="mt-1 text-base text-zinc-600">Uploaded PDF diaries will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobRow
                  key={job.jobId}
                  job={job}
                  isRetrying={retryingJobId === job.jobId}
                  retryDisabled={Boolean(retryingJobId)}
                  onRetry={() => void retryJob(job.jobId)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:px-6">
          <p className="text-sm tabular-nums text-zinc-600">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <PageButton
              label="Previous page"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </PageButton>
            <PageButton
              label="Next page"
              disabled={totalPages === 0 || page >= totalPages - 1 || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </PageButton>
          </div>
        </footer>
      </div>
    </div>
  );
}

function JobRow({
  job,
  isRetrying,
  retryDisabled,
  onRetry,
}: {
  job: PdfImportJob;
  isRetrying: boolean;
  retryDisabled: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgb(24_24_27/0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <StatusBadge status={job.status} />
          <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Uploaded {formatTimestamp(job.createdAt)}
          </p>
          {job.failureReason && (
            <p className="mt-2 break-words rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
              {job.failureReason}
            </p>
          )}
        </div>
        {job.status === "FAILED" && (
          <button
            type="button"
            disabled={retryDisabled}
            onClick={onRetry}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-50"
          >
            {isRetrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            {isRetrying ? "Retrying…" : "Retry"}
          </button>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ImportJobStatus }) {
  const styles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    COMPLETED: "border-teal-200 bg-teal-50 text-teal-700",
    FAILED: "border-red-200 bg-red-50 text-red-700",
  } as const;
  const Icon = status === "PENDING" ? Clock3 : status === "COMPLETED" ? CheckCircle2 : XCircle;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold", styles[status])}>
      <Icon className={cn("h-3 w-3", status === "PENDING" && "animate-pulse")} aria-hidden />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function JobListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading import history" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
      ))}
    </div>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

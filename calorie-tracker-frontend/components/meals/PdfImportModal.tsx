"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/cn";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

type PdfImportModalProps = {
  open: boolean;
  onClose: () => void;
  onQueued: () => void;
};

type PdfImportResponse = {
  jobId: string;
  status: "PENDING";
  createdAt: string;
};

export function PdfImportModal({ open, onClose, onQueued }: PdfImportModalProps) {
  const { status } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isUploading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isUploading, onClose, open]);

  useEffect(() => {
    if (open) {
      return;
    }
    setSelectedFile(undefined);
    setError(undefined);
  }, [open]);

  if (!open) {
    return null;
  }

  const selectFile = (file: File) => {
    setError(undefined);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setSelectedFile(undefined);
      setError("Choose a PDF dietary log.");
      return;
    }
    if (file.size >= MAX_PDF_BYTES) {
      setSelectedFile(undefined);
      setError("The PDF must be smaller than 10 MB.");
      return;
    }
    setSelectedFile(file);
  };

  const submitImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    if (!selectedFile) {
      setError("Choose a PDF dietary log.");
      return;
    }
    if (status !== "authenticated") {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const importJob = await apiClient<PdfImportResponse>("/api/meals/import-pdf", {
        method: "POST",
        body: formData,
      });
      window.dispatchEvent(
        new CustomEvent("pdfImportQueued", { detail: { jobId: importJob.jobId } }),
      );
      onQueued();
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.detail
          : "The PDF could not be uploaded. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close PDF import dialog"
        className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
        onClick={() => !isUploading && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-import-title"
        tabIndex={-1}
        className="card relative z-10 max-h-full w-full max-w-xl overflow-y-auto rounded-2xl shadow-2xl outline-none"
      >
        <header className="flex items-start justify-between border-b border-zinc-100 px-5 py-5 sm:px-6">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <h2 id="pdf-import-title" className="mt-4 text-lg font-semibold tracking-tight text-zinc-900">
              Import PDF Diary
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-zinc-600">
              Upload a dietary log. Our background processors will extract the text, parse the
              nutrition data via AI, and sync it to your timeline.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={isUploading}
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <form className="p-5 sm:p-6" onSubmit={submitImport} noValidate>
          <PdfDropzone
            file={selectedFile}
            disabled={isUploading}
            onSelect={selectFile}
            onRemove={() => {
              setSelectedFile(undefined);
              setError(undefined);
            }}
          />

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              aria-busy={isUploading}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UploadCloud className="h-4 w-4" aria-hidden />
              )}
              {isUploading ? "Uploading…" : "Upload PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PdfDropzone({
  file,
  disabled,
  onSelect,
  onRemove,
}: {
  file?: File;
  disabled: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files.item(0);
    if (droppedFile && !disabled) {
      onSelect(droppedFile);
    }
  };

  if (file) {
    return (
      <div className="flex min-h-36 items-center gap-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{file.name}</p>
          <p className="mt-1 text-xs text-zinc-600">{formatFileSize(file.size)} · Ready to upload</p>
        </div>
        <button
          type="button"
          aria-label={`Remove ${file.name}`}
          disabled={disabled}
          onClick={onRemove}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition",
        isDragging
          ? "border-teal-500 bg-teal-50"
          : "border-zinc-300 bg-zinc-50/70 hover:border-zinc-400 hover:bg-zinc-50",
        disabled && "cursor-wait opacity-60",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const chosenFile = event.target.files?.item(0);
          if (chosenFile) onSelect(chosenFile);
          event.currentTarget.value = "";
        }}
      />
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 shadow-sm">
        <UploadCloud className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-800">Drop your PDF diary here</p>
      <p className="mt-1.5 text-xs text-zinc-600">or click to browse · PDF only · under 10 MB</p>
    </label>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

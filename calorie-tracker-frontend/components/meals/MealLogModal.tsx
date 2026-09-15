"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { CalendarDays, Camera, Check, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/cn";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type MealType = (typeof MEAL_TYPES)[number];
type ActiveTab = "ai" | "manual";

type MealDraft = {
  name: string;
  quantity: string;
  mealType: MealType;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  micronutrientSummary: string;
  consumedDate: string;
};

type MealFieldErrors = Partial<Record<keyof MealDraft, string>>;

type NutritionExtractionResponse = {
  name?: string;
  foodName?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrientSummary: string;
};

type MealLogModalProps = {
  open: boolean;
  onClose: () => void;
  onMealCreated: () => void | Promise<void>;
};

const EMPTY_DRAFT: MealDraft = {
  name: "",
  quantity: "1 serving",
  mealType: "BREAKFAST",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  micronutrientSummary: "",
  consumedDate: "",
};

export function MealLogModal({ open, onClose, onMealCreated }: MealLogModalProps) {
  const { status } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("ai");
  const [draft, setDraft] = useState<MealDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<MealFieldErrors>({});
  const [requestError, setRequestError] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAiBadge, setShowAiBadge] = useState(false);
  const isBusy = isAnalyzing || isSaving;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isBusy, onClose, open]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!showAiBadge) {
      return;
    }
    const timer = window.setTimeout(() => setShowAiBadge(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showAiBadge]);

  useEffect(() => {
    if (open) {
      setDraft((current) =>
        current.consumedDate ? current : { ...current, consumedDate: localDateValue(new Date()) },
      );
      return;
    }
    setActiveTab("ai");
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setRequestError(undefined);
    setPreviewUrl(undefined);
    setShowAiBadge(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const updateDraft = (field: keyof MealDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError(undefined);
  };

  const analyzeImage = async (file: File) => {
    setRequestError(undefined);
    if (!file.type.startsWith("image/")) {
      setRequestError("Choose a valid image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setRequestError("The image must be 10 MB or smaller.");
      return;
    }
    if (status !== "authenticated") {
      setRequestError("Your session has expired. Please sign in again.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const extraction = await apiClient<NutritionExtractionResponse>("/api/ai/extract-image", {
        method: "POST",
        body: formData,
      });
      const extractedName = (extraction.foodName ?? extraction.name)?.trim();
      setDraft((current) => ({
        ...current,
        name: extractedName || current.name,
        calories: String(extraction.calories),
        protein: formatNumber(extraction.protein),
        carbs: formatNumber(extraction.carbs),
        fat: formatNumber(extraction.fat),
        micronutrientSummary: extraction.micronutrientSummary,
      }));
      setActiveTab("manual");
      setShowAiBadge(true);
    } catch (error) {
      setRequestError(toRequestMessage(error, "Gemini could not analyze this image. Please try again."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitMeal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateMealDraft(draft);
    setFieldErrors(validation.errors);
    setRequestError(undefined);
    if (!validation.payload) {
      return;
    }
    if (status !== "authenticated") {
      setRequestError("Your session has expired. Please sign in again.");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient("/api/meals", {
        method: "POST",
        body: {
          ...validation.payload,
          mealType: draft.mealType,
        },
      });
      await onMealCreated();
      onClose();
    } catch (error) {
      setRequestError(toRequestMessage(error, "The meal could not be saved. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close meal logging dialog"
        className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
        onClick={() => !isBusy && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-log-title"
        tabIndex={-1}
        className="card relative z-10 max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl shadow-2xl outline-none"
      >
        <header className="flex items-start justify-between border-b border-zinc-100 px-5 py-5 sm:px-6">
          <div>
            <h2 id="meal-log-title" className="text-lg font-semibold tracking-tight text-zinc-900">
              Log a meal
            </h2>
            <p className="mt-1 text-sm text-zinc-600">Start with a photo or enter nutrition manually.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={isBusy}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1" role="tablist" aria-label="Meal entry method">
            <TabButton active={activeTab === "ai"} onClick={() => setActiveTab("ai")}>
              <Camera className="h-4 w-4" aria-hidden />
              Quick AI Photo
            </TabButton>
            <TabButton active={activeTab === "manual"} onClick={() => setActiveTab("manual")}>
              Manual Entry
            </TabButton>
          </div>

          <div className="mt-6">
            {activeTab === "ai" ? (
              <ImageDropzone
                previewUrl={previewUrl}
                isAnalyzing={isAnalyzing}
                disabled={isBusy}
                onFileSelected={(file) => void analyzeImage(file)}
              />
            ) : (
              <ManualMealForm
                draft={draft}
                errors={fieldErrors}
                isSaving={isSaving}
                showAiBadge={showAiBadge}
                onDraftChange={updateDraft}
                onSubmit={submitMeal}
              />
            )}
          </div>

          {requestError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {requestError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition",
        active ? "bg-teal-600 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-800",
      )}
    >
      {children}
    </button>
  );
}

function ImageDropzone({
  previewUrl,
  isAnalyzing,
  disabled,
  onFileSelected,
}: {
  previewUrl?: string;
  isAnalyzing: boolean;
  disabled: boolean;
  onFileSelected: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files.item(0);
    if (file && !disabled) {
      onFileSelected(file);
    }
  };

  return (
    <label
      className={cn(
        "relative flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition",
        isDragging
          ? "border-teal-500 bg-teal-50"
          : "border-zinc-300 bg-zinc-50/70 hover:border-zinc-400 hover:bg-zinc-50",
        disabled && "cursor-wait",
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
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) onFileSelected(file);
          event.currentTarget.value = "";
        }}
      />

      {previewUrl ? (
        <>
          <Image src={previewUrl} alt="Selected meal" fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[1px]" />
          <div className="relative z-10 flex flex-col items-center text-white">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  <span className="absolute inset-0 animate-ping rounded-full border border-white/30" />
                </>
              ) : (
                <UploadCloud className="h-5 w-5" aria-hidden />
              )}
            </span>
            <p className="mt-5 text-sm font-semibold">
              {isAnalyzing ? "Gemini is analyzing your meal..." : "Choose another image to retry"}
            </p>
            {isAnalyzing && (
              <div className="mt-4 flex w-48 animate-pulse flex-col gap-2" aria-hidden>
                <span className="h-2 rounded-full bg-white/25" />
                <span className="mx-auto h-2 w-3/4 rounded-full bg-white/20" />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 shadow-sm">
            <UploadCloud className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-semibold text-zinc-800">
            Drag a food photo or nutrition label here
          </p>
          <p className="mt-1.5 text-sm text-zinc-600">or click to browse · PNG, JPG or WEBP · 10 MB max</p>
        </>
      )}
    </label>
  );
}

function ManualMealForm({
  draft,
  errors,
  isSaving,
  showAiBadge,
  onDraftChange,
  onSubmit,
}: {
  draft: MealDraft;
  errors: MealFieldErrors;
  isSaving: boolean;
  showAiBadge: boolean;
  onDraftChange: (field: keyof MealDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex min-h-6 items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Meal details</p>
        {showAiBadge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-sm font-semibold text-teal-700">
            <Sparkles className="h-3 w-3" aria-hidden />
            Pre-filled by AI
          </span>
        )}
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-zinc-900">Meal Type</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MEAL_TYPES.map((mealType) => (
            <button
              key={mealType}
              type="button"
              aria-pressed={draft.mealType === mealType}
              disabled={isSaving}
              onClick={() => onDraftChange("mealType", mealType)}
              className={cn(
                "h-10 rounded-lg border text-sm font-semibold transition",
                draft.mealType === mealType
                  ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              {toTitleCase(mealType)}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="meal-consumed-date" className="mt-4 block">
        <span className="text-sm font-medium text-zinc-900">Date consumed</span>
        <span className="relative mt-1.5 block">
          <CalendarDays
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="meal-consumed-date"
            type="date"
            max={localDateValue(new Date())}
            value={draft.consumedDate}
            disabled={isSaving}
            aria-invalid={Boolean(errors.consumedDate)}
            aria-describedby={errors.consumedDate ? "meal-consumed-date-error" : undefined}
            onChange={(event) => onDraftChange("consumedDate", event.target.value)}
            className={cn(
              "form-input h-11 pl-10",
              errors.consumedDate && "border-red-500 focus:ring-red-500",
            )}
          />
        </span>
        {errors.consumedDate && (
          <p id="meal-consumed-date-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.consumedDate}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-500">Backdated entries use your current local time.</p>
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          id="meal-name"
          label="Food Name"
          value={draft.name}
          error={errors.name}
          placeholder="e.g. Grilled chicken salad"
          disabled={isSaving}
          onChange={(value) => onDraftChange("name", value)}
        />
        <TextField
          id="meal-quantity"
          label="Serving / Quantity"
          value={draft.quantity}
          error={errors.quantity}
          placeholder="e.g. 1 bowl"
          disabled={isSaving}
          onChange={(value) => onDraftChange("quantity", value)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField id="meal-calories" label="Calories" unit="kcal" value={draft.calories} error={errors.calories} max={20000} step={1} disabled={isSaving} onChange={(value) => onDraftChange("calories", value)} />
        <NumberField id="meal-protein" label="Protein" unit="g" value={draft.protein} error={errors.protein} max={9999.99} step={0.01} disabled={isSaving} onChange={(value) => onDraftChange("protein", value)} />
        <NumberField id="meal-carbs" label="Carbs" unit="g" value={draft.carbs} error={errors.carbs} max={9999.99} step={0.01} disabled={isSaving} onChange={(value) => onDraftChange("carbs", value)} />
        <NumberField id="meal-fat" label="Fat" unit="g" value={draft.fat} error={errors.fat} max={9999.99} step={0.01} disabled={isSaving} onChange={(value) => onDraftChange("fat", value)} />
      </div>

      <label htmlFor="meal-micronutrients" className="mt-4 block">
        <span className="text-sm font-medium text-zinc-900">Micronutrient summary</span>
        <textarea
          id="meal-micronutrients"
          maxLength={1000}
          rows={2}
          value={draft.micronutrientSummary}
          placeholder="e.g. High in Vitamin C, Low Iron"
          disabled={isSaving}
          onChange={(event) => onDraftChange("micronutrientSummary", event.target.value)}
          className="form-input mt-1.5 min-h-20 resize-y py-2.5"
        />
      </label>

      <button
        type="submit"
        disabled={isSaving}
        aria-busy={isSaving}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
        {isSaving ? "Saving meal…" : "Save Meal"}
      </button>
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  error,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <input id={id} type="text" maxLength={255} value={value} placeholder={placeholder} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} className="form-input mt-1.5 h-11" />
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
    </label>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  error,
  max,
  step,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  error?: string;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <div className="relative mt-1.5">
        <input id={id} type="number" min={0} max={max} step={step} inputMode="decimal" value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} className={cn("form-input h-11 px-3 pr-9", error && "border-red-500 focus:ring-red-500")} />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">{unit}</span>
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
    </label>
  );
}

function validateMealDraft(draft: MealDraft): {
  errors: MealFieldErrors;
  payload?: {
    name: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    micronutrientSummary?: string;
    consumedAt: string;
  };
} {
  const errors: MealFieldErrors = {};
  const name = draft.name.trim();
  const quantity = draft.quantity.trim();
  if (!name) errors.name = "Enter a food name.";
  if (!quantity) errors.quantity = "Enter a serving or quantity.";

  const calories = parseNutritionNumber(draft.calories, 20000, true);
  const protein = parseNutritionNumber(draft.protein, 9999.99);
  const carbs = parseNutritionNumber(draft.carbs, 9999.99);
  const fat = parseNutritionNumber(draft.fat, 9999.99);
  if (calories == null) errors.calories = "Enter 0–20,000.";
  if (protein == null) errors.protein = "Enter a valid amount.";
  if (carbs == null) errors.carbs = "Enter a valid amount.";
  if (fat == null) errors.fat = "Enter a valid amount.";
  const consumedAt = toConsumedAt(draft.consumedDate);
  if (!consumedAt) errors.consumedDate = "Choose today or an earlier valid date.";

  if (
    Object.keys(errors).length > 0 ||
    calories == null ||
    protein == null ||
    carbs == null ||
    fat == null ||
    !consumedAt
  ) {
    return { errors };
  }
  const micronutrientSummary = draft.micronutrientSummary.trim();
  return {
    errors,
    payload: {
      name,
      quantity,
      calories,
      protein,
      carbs,
      fat,
      consumedAt,
      ...(micronutrientSummary ? { micronutrientSummary } : {}),
    },
  };
}

function parseNutritionNumber(value: string, max: number, integerOnly = false): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max || (integerOnly && !Number.isInteger(parsed))) {
    return null;
  }
  const fraction = value.split(".")[1];
  if (!integerOnly && fraction && fraction.length > 2) return null;
  return parsed;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toConsumedAt(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > localDateValue(new Date())) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const now = new Date();
  const consumedAt = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );
  if (
    Number.isNaN(consumedAt.getTime()) ||
    consumedAt.getFullYear() !== year ||
    consumedAt.getMonth() !== month - 1 ||
    consumedAt.getDate() !== day
  ) {
    return null;
  }
  return consumedAt.toISOString();
}

function toTitleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function toRequestMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.detail : fallback;
}

type MacroBarProps = {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
};

export function MacroBar({ label, consumed, target, unit = "g" }: MacroBarProps) {
  const progress = target > 0 ? Math.min(Math.max((consumed / target) * 100, 0), 100) : 0;

  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-3.5 py-3 shadow-[0_1px_1px_rgb(24_24_27/0.02)]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600">{label}</p>
        <p className="text-xs font-semibold tabular-nums text-zinc-900">
          {formatMacroValue(consumed)} / {formatMacroValue(target)}
          {unit}
        </p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${label} ${consumed} of ${target}${unit}`}>
        <div className="h-full rounded-full bg-zinc-900 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function formatMacroValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

type MacroBarProps = {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
};

export function MacroBar({ label, consumed, target, unit = "g" }: MacroBarProps) {
  const progress = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600">{label}</p>
        <p className="text-xs tabular-nums text-zinc-500">
          {consumed} / {target}
          {unit}
        </p>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${label} ${consumed} of ${target}${unit}`}>
        <div className="h-full rounded-full bg-zinc-900 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

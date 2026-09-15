type TooltipItem = {
  color?: string;
  name?: string;
  value?: number | string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipItem[];
  valueSuffix?: string;
};

export function ChartTooltip({ active, label, payload, valueSuffix = "" }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white/90 p-3 text-sm shadow-xl backdrop-blur-md">
      {label && <p className="mb-2 text-xs font-semibold text-zinc-500">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={`${item.name ?? "value"}-${index}`} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-xs text-zinc-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color ?? "#71717a" }}
                aria-hidden
              />
              {item.name ?? "Value"}
            </span>
            <span className="text-xs font-semibold tabular-nums text-zinc-950">
              {formatValue(item.value)}{valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: number | string | undefined): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(numeric);
}

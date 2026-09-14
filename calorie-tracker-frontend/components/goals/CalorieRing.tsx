type CalorieRingProps = {
  consumed: number;
  target: number;
};

export function CalorieRing({ consumed, target }: CalorieRingProps) {
  const size = 132;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-zinc-500">Calories</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900">Daily energy</p>
        <p className="mt-2 text-[0.65rem] uppercase tracking-wider text-zinc-400">0% consumed</p>
      </div>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-zinc-100"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-zinc-900"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-base font-semibold tabular-nums tracking-tight text-zinc-900">
            {consumed}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-zinc-500">of {target} kcal</p>
        </div>
      </div>
    </div>
  );
}

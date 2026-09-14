type CalorieRingProps = {
  consumed: number;
  target: number;
};

export function CalorieRing({ consumed, target }: CalorieRingProps) {
  const size = 148;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
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
          <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
            {consumed} / {target}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">kcal</p>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-zinc-500">Calories</p>
    </div>
  );
}

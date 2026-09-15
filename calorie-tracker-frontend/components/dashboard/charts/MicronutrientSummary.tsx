"use client";

import { Leaf } from "lucide-react";
import type { MicronutrientMention } from "@/lib/micronutrientSummary";

export function MicronutrientSummary({
  micronutrients,
}: {
  micronutrients: MicronutrientMention[];
}) {
  if (micronutrients.length === 0) {
    return (
      <div className="flex h-full min-h-[250px] flex-col items-center justify-center px-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500">
          <Leaf className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-3 text-base font-semibold text-zinc-900">No micronutrients this week</p>
        <p className="mt-1.5 max-w-xs text-sm leading-6 text-zinc-600">
          Log meals with vitamin or mineral notes to build a weekly micronutrient summary.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[250px] overflow-y-auto pr-1" aria-label="Weekly micronutrient summary">
      <ul className="flex flex-wrap gap-2">
        {micronutrients.map((item) => (
          <li key={item.label}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50/80 px-2.5 py-1.5 text-sm font-medium text-teal-800">
              <Leaf className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
              <span className="max-w-[10rem] truncate">{item.label}</span>
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-sm font-semibold tabular-nums text-teal-700 ring-1 ring-inset ring-teal-100">
                {item.count}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-5 text-zinc-600">
        Mentions from meal notes over the last seven days.
      </p>
    </div>
  );
}

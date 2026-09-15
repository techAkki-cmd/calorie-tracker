"use client";

import { Activity } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

type BrandLogoProps = {
  href?: string;
  className?: string;
};

export function BrandLogo({ href = "/", className }: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label="NutriMetric home"
      className={cn(
        "group inline-flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
        <Activity
          aria-hidden
          className="h-5 w-5 text-teal-600 transition-transform duration-300 group-hover:scale-105"
          strokeWidth={2.25}
        />
      </span>

      <span className="text-xl tracking-tight" aria-hidden>
        <span className="font-extrabold text-zinc-900">Nutri</span>
        <span className="font-medium text-slate-600">Metric</span>
      </span>
    </Link>
  );
}

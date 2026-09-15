"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { cn } from "@/lib/cn";

type BrandLogoProps = {
  href?: string;
  className?: string;
};

export function BrandLogo({ href = "/", className }: BrandLogoProps) {
  const gradientId = `nutrimetric-mark-${useId().replace(/:/g, "")}`;

  return (
    <Link
      href={href}
      aria-label="NutriMetric home"
      className={cn(
        "group inline-flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 shadow-sm">
        <Activity
          aria-hidden
          className="h-5 w-5 transition-transform duration-300 group-hover:scale-105"
          stroke={`url(#${gradientId})`}
          strokeWidth={2.25}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="2"
              y1="2"
              x2="22"
              y2="22"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#059669" />
              <stop offset="1" stopColor="#0f766e" />
            </linearGradient>
          </defs>
        </Activity>
      </span>

      <span className="text-xl tracking-tight" aria-hidden>
        <span className="font-extrabold text-zinc-900">Nutri</span>
        <span className="font-medium text-zinc-500">Metric</span>
      </span>
    </Link>
  );
}

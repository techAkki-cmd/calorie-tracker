"use client";

import { useEffect, useMemo, useState } from "react";

export function useLocalDay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let rolloverTimer: number | undefined;

    const scheduleRollover = () => {
      if (rolloverTimer !== undefined) {
        window.clearTimeout(rolloverTimer);
      }
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      rolloverTimer = window.setTimeout(() => {
        setNow(new Date());
        scheduleRollover();
      }, nextMidnight.getTime() - current.getTime() + 250);
    };

    const refreshAfterVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        scheduleRollover();
      }
    };

    scheduleRollover();
    document.addEventListener("visibilitychange", refreshAfterVisibilityChange);
    return () => {
      if (rolloverTimer !== undefined) {
        window.clearTimeout(rolloverTimer);
      }
      document.removeEventListener("visibilitychange", refreshAfterVisibilityChange);
    };
  }, []);

  return useMemo(
    () => ({
      date: formatLocalDate(now),
      timezone: canonicalTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
    }),
    [now],
  );
}

function canonicalTimezone(timezone: string): string {
  return timezone === "Asia/Calcutta" ? "Asia/Kolkata" : timezone;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

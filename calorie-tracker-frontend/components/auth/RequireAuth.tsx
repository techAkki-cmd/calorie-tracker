"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="px-6 py-20 text-center text-sm text-ink-muted">
        {status === "hydrating" ? "Loading session…" : "Redirecting to sign in…"}
      </div>
    );
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "authenticated" || status === "hydrating") {
    return (
      <div className="px-6 py-20 text-center text-sm text-ink-muted">
        {status === "hydrating" ? "Loading session…" : "Redirecting…"}
      </div>
    );
  }

  return <>{children}</>;
}

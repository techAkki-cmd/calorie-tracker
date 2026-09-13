"use client";

import Link from "next/link";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

export function TopNav() {
  const { status, logout } = useAuth();
  const isSignedIn = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 shadow-hairline backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={isSignedIn ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 text-ink"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-canvas">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">Calorie Tracker</span>
        </Link>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Log out
            </button>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Register
              </Link>
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border border-accent bg-accent px-3",
                  "text-sm font-medium text-white transition-colors hover:bg-accent-hover",
                )}
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden />
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Sparkles } from "lucide-react";
import {
  ACCESS_TOKEN_CHANGED_EVENT,
  clearAccessToken,
  readAccessToken,
} from "@/lib/apiClient";
import { cn } from "@/lib/cn";

export function TopNav() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsSignedIn(Boolean(readAccessToken()));
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener(ACCESS_TOKEN_CHANGED_EVENT, syncAuthState);
    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener(ACCESS_TOKEN_CHANGED_EVENT, syncAuthState);
    };
  }, []);

  const handleAuthToggle = () => {
    if (isSignedIn) {
      clearAccessToken();
      setIsSignedIn(false);
      return;
    }
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 shadow-hairline backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-canvas">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">Calorie Tracker</span>
        </Link>

        <button
          type="button"
          onClick={handleAuthToggle}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
            isSignedIn
              ? "border-line bg-white text-ink-muted hover:bg-canvas hover:text-ink"
              : "border-accent bg-accent text-white hover:bg-accent-hover",
          )}
        >
          {isSignedIn ? (
            <>
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Log out
            </>
          ) : (
            <>
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Log in
            </>
          )}
        </button>
      </div>
    </header>
  );
}

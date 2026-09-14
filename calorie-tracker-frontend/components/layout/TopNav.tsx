"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogIn, LogOut, Sparkles, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

export function TopNav() {
  const { status, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSignedIn = status === "authenticated";
  const accountLabel = user?.email ?? user?.id ?? "Account";
  const avatarLabel = accountLabel.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={isSignedIn ? "/dashboard" : "/"}
          className="group flex items-center gap-3 text-zinc-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">Calorie Tracker</span>
        </Link>

        {isSignedIn ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 pr-2 text-left shadow-sm transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700">
                {avatarLabel}
              </span>
              <span className="hidden max-w-48 truncate text-sm font-medium text-zinc-700 sm:block">
                {accountLabel}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-zinc-400 transition-transform",
                  isMenuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg"
              >
                <div className="border-b border-zinc-100 px-2 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Signed in as</p>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">{accountLabel}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Register</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Log in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

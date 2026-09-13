"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardHome />
    </RequireAuth>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-subtle">Dashboard</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {user?.email ? `Welcome, ${user.email}` : "Welcome"}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
        You are signed in. Meal logging, goals, and AI tools will appear here.
      </p>
    </section>
  );
}

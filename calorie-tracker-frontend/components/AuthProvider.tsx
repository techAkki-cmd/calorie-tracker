"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";

export function AppAuthProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiClient, clearAccessToken, readAccessToken, writeAccessToken } from "@/lib/apiClient";
import type { AuthResponse, AuthStatus, AuthUser } from "@/lib/authTypes";

const AUTH_USER_STORAGE_KEY = "calorie-tracker.user";

type AuthContextValue = {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (typeof parsed.id === "string" && typeof parsed.email === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function persistSession(token: string, user: AuthUser): void {
  writeAccessToken(token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearSession(): void {
  clearAccessToken();
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("hydrating");

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
      return;
    }
    setAccessToken(token);
    setUser(readStoredUser());
    setStatus("authenticated");
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    persistSession(response.token, response.user);
    setAccessToken(response.token);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await apiClient("/api/auth/register", {
      method: "POST",
      body: { email, password },
    });
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ accessToken, user, status, login, register, logout }),
    [accessToken, user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { User, ApiResponse, AuthResponse } from "@/types";

// Reads localStorage before the browser paints (avoids a visible loading
// flash) while staying a no-op on the server, since useLayoutEffect warns
// there.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // matches the backend refresh-token lifetime

function setSessionCookie() {
  document.cookie = `sw_session=1; path=/; max-age=${SESSION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = "sw_session=; path=/; max-age=0; SameSite=Lax";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useIsomorphicLayoutEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("accessToken");
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Corrupted localStorage — clear and start fresh
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<AuthResponse>>(
      "/api/auth/login",
      { email, password }
    );
    const { accessToken, user: userData } = data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setSessionCookie();
    setUser(userData);
    router.push("/dashboard");
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data } = await api.post<ApiResponse<AuthResponse>>(
      "/api/auth/signup",
      { name, email, password }
    );
    const { accessToken, user: userData } = data.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setSessionCookie();
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = () => {
    // Best-effort: revokes the refresh token and clears its cookie
    // server-side. Fired without awaiting so the UI doesn't wait on it.
    api.post("/api/auth/logout").catch(() => {});
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    clearSessionCookie();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

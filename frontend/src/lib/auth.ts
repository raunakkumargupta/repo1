"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type UserSession = {
  id: string;
  role: string;
};

export function useAuth(allowedRoles?: string[]) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Not authenticated");
      }
      const data = await res.json();
      setUser(data);

      // Enforce role-based routing check
      if (allowedRoles && !allowedRoles.includes(data.role)) {
        // Logged in but insufficient privileges: redirect
        router.push("/login");
      }
      return data;
    } catch (err) {
      setUser(null);
      if (allowedRoles) {
        router.push("/login");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [router]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout request failed:", err);
    }
  };

  return { user, loading, logout, checkAuth };
}

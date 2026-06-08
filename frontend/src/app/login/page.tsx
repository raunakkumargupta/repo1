"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Terminal } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      // Middleware will redirect based on role after navigation
      const role = data.user?.role;
      if (role === "SuperAdmin") router.push("/super-admin");
      else if (role === "Admin") router.push("/admin");
      else if (role === "Agent" || role === "Manager") router.push("/mentor-queue");
      else router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left Panel — Brand */}
      <div className="hidden md:flex relative bg-[#0B0F19] flex-col justify-between p-12 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

        <Link href="/" className="flex items-center gap-2.5 z-10">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter text-white">MATRIX</span>
        </Link>

        <div className="z-10 space-y-6">
          <blockquote className="text-4xl font-extrabold tracking-tighter text-white leading-tight">
            Build the Future.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Without the Chaos.
            </span>
          </blockquote>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            The production-grade hackathon command matrix. Real-time mentor routing, strict RBAC, and team management — all in one platform.
          </p>
        </div>

        <div className="z-10 flex items-center gap-3 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          System operational · All services online
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex items-center justify-center p-8 bg-[#0B0F19] md:bg-[#080C14]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile Brand */}
          <Link href="/" className="flex md:hidden items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Terminal className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tighter text-white">MATRIX</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to access your command workspace.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@hackathon.com"
                className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                <Link href="/forget-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Terminal, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all credentials.");
      setLoading(false);
      return;
    }

    try {
      // 1. Create hacker account via Next.js proxy
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "Hacker" }),
      });
      if (!regRes.ok) {
        const data = await regRes.json();
        throw new Error(data.message || "Registration failed");
      }

      // 2. Perform login proxy to set session JWT cookie
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        throw new Error("Login failed after account creation");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background text-foreground transition-colors duration-200">
      {/* Left Branding Panel */}
      <div className="hidden md:flex relative bg-[#0B0F19] flex-col justify-between p-12 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

        <Link href="/" className="flex items-center gap-2.5 z-10">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter text-white">MATRIX</span>
        </Link>

        <div className="z-10 space-y-4">
          <p className="text-4xl font-extrabold tracking-tighter text-white leading-tight">
            Create Your account.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Apply in seconds.
            </span>
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Join thousands of developers, designers, and innovators. One account gets you entry to all hackathons, matching grids, and mentor support.
          </p>
        </div>

        <p className="z-10 text-[10px] text-slate-600">By registering you agree to the platform Terms of Service.</p>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center p-8 bg-background md:bg-slate-50/20 dark:md:bg-slate-950/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Mobile Brand */}
          <Link href="/" className="flex md:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Terminal className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tighter text-slate-900 dark:text-white">MATRIX</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign up</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create an account to start exploring hackathons.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
              <input
                type="text"
                required
                placeholder="Lovelace Ada"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
              <input
                type="email"
                required
                placeholder="ada@hackathon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
              <input
                type="password"
                required
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base w-full"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

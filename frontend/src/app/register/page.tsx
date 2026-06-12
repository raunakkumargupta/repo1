"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Terminal, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

// ─── Shared Password Rules ────────────────────────────────────────────────────
const PASSWORD_RULES = [
  { id: "length",  label: "At least 8 characters",        test: (p: string) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter (A–Z)",    test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter (a–z)",    test: (p: string) => /[a-z]/.test(p) },
  { id: "digit",   label: "One number (0–9)",              test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (@#$%…)", test: (p: string) => /[@#$%^&+=!?_\-.*]/.test(p) },
];

function strengthPercent(p: string) {
  return (PASSWORD_RULES.filter((r) => r.test(p)).length / PASSWORD_RULES.length) * 100;
}

function strengthLabel(pct: number) {
  if (pct <= 20) return { label: "Very Weak", color: "#EF4444" };
  if (pct <= 40) return { label: "Weak",      color: "#F97316" };
  if (pct <= 60) return { label: "Fair",      color: "#F59E0B" };
  if (pct <= 80) return { label: "Strong",    color: "#10B981" };
  return           { label: "Very Strong", color: "#06D6A0" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const rules = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const allRulesPassed = rules.every((r) => r.passed);
  const pct = strengthPercent(password);
  const { label: strengthLbl, color: strengthColor } = strengthLabel(pct);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side gate
    if (!name.trim() || name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (!allRulesPassed) {
      setPasswordTouched(true);
      setError("Password does not meet all requirements.");
      return;
    }
    if (!passwordsMatch || !confirmPassword) {
      setConfirmTouched(true);
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role: "Hacker" }),
      });
      if (!regRes.ok) {
        const data = await regRes.json();
        throw new Error(data.message || "Registration failed");
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!loginRes.ok) throw new Error("Login failed after account creation");

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
      <div className="flex items-center justify-center p-8 bg-[#0B0F19] md:bg-[#080C14]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Brand */}
          <Link href="/" className="flex md:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Terminal className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tighter text-white">MATRIX</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Sign up</h1>
            <p className="text-slate-400 text-sm">Create an account to start exploring hackathons.</p>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
              <input
                type="text"
                required
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
              <input
                type="email"
                required
                placeholder="ada@hackathon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
                  className="w-full bg-transparent border-b border-white/20 py-3 pr-10 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar + checklist */}
              {passwordTouched && password.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 space-y-2">
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: strengthColor }}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLbl}</span>
                  </div>
                  {/* Checklist */}
                  <div className="space-y-1">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-2">
                        {rule.passed
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                        }
                        <span className={`text-xs ${rule.passed ? "text-emerald-400" : "text-slate-500"}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true); }}
                  className={`w-full bg-transparent border-b py-3 pr-10 text-white placeholder-slate-600 focus:outline-none transition-colors text-sm ${
                    confirmTouched && confirmPassword
                      ? passwordsMatch ? "border-emerald-500" : "border-red-500"
                      : "border-white/20 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmTouched && confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
              {confirmTouched && confirmPassword && passwordsMatch && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
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

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

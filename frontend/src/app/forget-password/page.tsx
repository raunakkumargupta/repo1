"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      await fetchApi("/auth/forget-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus("success");
      setMessage("If the email exists, a reset link will be sent shortly.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to process request");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md bg-[var(--surface)] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
        <Link href="/login" className="inline-flex items-center text-sm text-[var(--primary)] hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
        </Link>
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reset Password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Enter your email to receive a reset link</p>
        </div>

        {status === "success" && (
          <div className="mb-6 p-4 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
            {message}
          </div>
        )}

        {status === "error" && (
          <div className="mb-6 p-4 rounded bg-[var(--destructive)] text-white text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="agent@hackathon.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="w-full py-2 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function RegisterFunnel() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Profile
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [skills, setSkills] = useState(""); // Comma separated for now

  // Step 3: Team Status
  const [status, setStatus] = useState("Looking for Team");

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    try {
      // 1. Create User via Go API directly
      await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role: "User" }),
      });

      // 2. Login via Next.js Proxy to get the httpOnly cookie
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) throw new Error("Failed to authenticate after registration");

      // 3. Create Registration Profile via Go API directly (now authenticated)
      await fetchApi("/registrations", {
        method: "POST",
        body: JSON.stringify({
          github_url: github || null,
          linkedin_url: linkedin || null,
          skills: JSON.stringify(skills.split(",").map(s => s.trim())),
          status,
        }),
      });

      // Redirect to Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
          ))}
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-6">
          {step === 1 && "Create Account"}
          {step === 2 && "Hacker Profile"}
          {step === 3 && "Team Status"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="min-h-[250px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <input type="url" placeholder="GitHub URL" value={github} onChange={(e) => setGithub(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
                <input type="url" placeholder="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
                <input type="text" placeholder="Skills (comma separated, e.g. React, Go)" value={skills} onChange={(e) => setSkills(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground">
                  <option value="Looking for Team">Looking for Team (Solo)</option>
                  <option value="Has Team">I already have a team</option>
                  <option value="Creating Team">I want to create a new team</option>
                </select>
                <p className="text-sm text-slate-500 mt-2">
                  You can change this later in your dashboard.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button onClick={handleBack} disabled={isLoading} className="flex-1 py-3 bg-surface border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={handleNext} className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition flex items-center justify-center">
              {isLoading ? <span className="animate-pulse">Registering...</span> : "Complete Registration"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

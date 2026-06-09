"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, ShieldAlert, Award, Calendar, ExternalLink } from "lucide-react";
import { fetchApi } from "@/lib/api";

type RegisteredEvent = {
  id: string;
  hackathon_id: string;
  approval_status: string;
  team_preference: string;
  title?: string;
  cover_image?: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [registrations, setRegistrations] = useState<RegisteredEvent[]>([]);
  const [staffHackathons, setStaffHackathons] = useState<any[]>([]);
  const [dashboardMode, setDashboardMode] = useState<"hacker" | "mentor">("hacker");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. Fetch User
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => setUser(u));

    // 2. Check general hacker portfolio
    fetchApi<any>("/profile/me")
      .then((profile) => {
        if (profile && profile.user_id) {
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      })
      .catch(() => setHasProfile(false));

    // 3. Fetch registered events (for now we check default integrations or list all approved events that the user can explore)
    fetch("/api/hackathons")
      .then((r) => r.ok ? r.json() : [])
      .then(async (events: any[]) => {
        // Find registrations for these events
        const regs: RegisteredEvent[] = [];
        for (const ev of events) {
          try {
            const reg = await fetchApi<any>(`/hackathons/${ev.id}/my-registration`);
            if (reg && reg.id) {
              regs.push({
                ...reg,
                title: ev.title,
                cover_image: ev.cover_image
              });
            }
          } catch (e) {
            // not registered to this one
          }
        }
        setRegistrations(regs);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // 4. Fetch Staff Hackathons
    fetchApi<any[]>("/auth/me/staff-hackathons")
      .then((data) => {
        setStaffHackathons(data || []);
      })
      .catch(() => setStaffHackathons([]));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Hacker Workspace</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Monitor your applications, join team matching grids, and build projects.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link href="/explore" className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              Explore Hackathons
            </Link>
            <Link href="/host" className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-sm transition-all border border-slate-200 dark:border-white/10">
              Host a Hackathon
            </Link>
          </div>
        </header>

        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit mb-6 border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setDashboardMode("hacker")}
            className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${dashboardMode === "hacker" ? "bg-white dark:bg-slate-800 shadow text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            Hacker Dashboard
          </button>
          {staffHackathons.length > 0 && (
            <button
              onClick={() => setDashboardMode("mentor")}
              className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${dashboardMode === "mentor" ? "bg-white dark:bg-slate-800 shadow text-purple-600 dark:text-purple-400" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Mentor Dashboard
            </button>
          )}
        </div>

        {/* Profile incomplete warning */}
        {!hasProfile && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Incomplete Hacker Portfolio</h3>
                <p className="text-xs opacity-80 mt-0.5">Setup your default links, skills, and resume details before applying to events.</p>
              </div>
            </div>
            <Link href="/profile" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-all shrink-0">
              Configure Portfolio
            </Link>
          </motion.div>
        )}

        {dashboardMode === "hacker" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Applications list */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">My Hackathons</h2>
                {registrations.length === 0 ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-500">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">No active registrations</h3>
                      <p className="text-xs text-slate-500 mt-1">You haven&apos;t applied to any hackathons yet.</p>
                    </div>
                    <Link href="/explore" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all">
                      Explore Hackathons
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/60 dark:divide-white/5 space-y-4">
                    {registrations.map((reg) => (
                      <div key={reg.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 first:pt-0">
                        <div className="flex items-center gap-4">
                          {reg.cover_image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={reg.cover_image}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                            />
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{reg.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              <span>Status: {reg.approval_status}</span>
                              <span>•</span>
                              <span>Preference: {reg.team_preference}</span>
                            </div>
                          </div>
                        </div>

                        {reg.approval_status === "Accepted" ? (
                          <Link
                            href={`/workspace/${reg.hackathon_id}`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                          >
                            Enter Workspace
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-500">
                            {reg.approval_status === "Pending" ? "Review Pending" : "Rejected"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Schedule card */}
            <div className="col-span-1 space-y-6">
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Upcoming Events</h2>
                </div>
                <ul className="space-y-4 text-xs">
                  <li className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-300">AI Innovation Battle</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">June 15, 2026</p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded font-semibold text-[9px] uppercase tracking-wider">Featured</span>
                  </li>
                  <li className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-300">Obsidian Web3 build-athon</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">July 1, 2026</p>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-semibold text-[9px] uppercase tracking-wider">Popular</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">My Mentorships & Staff Roles</h2>
                {staffHackathons.length === 0 ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-500">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">No staff roles found</h3>
                      <p className="text-xs text-slate-500 mt-1">You haven't been assigned as a Mentor or Judge to any active events.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/60 dark:divide-white/5 space-y-4">
                    {staffHackathons.map((hack) => (
                      <div key={hack.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 first:pt-0">
                        <div className="flex items-center gap-4">
                          {hack.cover_image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={hack.cover_image}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                            />
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{hack.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              <span>Staff</span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/mentor/${hack.id}`}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                        >
                          Enter Dashboard
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

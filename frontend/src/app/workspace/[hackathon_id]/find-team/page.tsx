"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Code, Globe, MessageSquare, Tag, Search, Users } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type HackerProfile = {
  id: string;
  user_id: string;
  github_url: string | null;
  linkedin_url: string | null;
  skills: string;
  team_preference: string;
  approval_status: string;
  resume_url: string | null;
  user_name: string;
  user_email: string;
};

export default function FindTeamPage({ params }: Props) {
  const { hackathon_id } = use(params);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<HackerProfile[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch all registrations for this hackathon
    fetch(`/api/hackathons/${hackathon_id}/applications`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: HackerProfile[]) => {
        // Filter: only show accepted hackers looking for team
        const filtered = data.filter(
          (p) => p.approval_status === "Accepted" && p.team_preference === "Looking for Team"
        );
        setProfiles(filtered);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [hackathon_id]);

  const filtered = profiles.filter((p) => {
    const term = search.toLowerCase();
    const matchesName = p.user_name.toLowerCase().includes(term);
    let skillsArr: string[] = [];
    try {
      skillsArr = JSON.parse(p.skills);
    } catch(e) {}
    const matchesSkill = skillsArr.some((s) => s.toLowerCase().includes(term));
    return matchesName || matchesSkill;
  });

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
        
        <Link 
          href={`/workspace/${hackathon_id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Workspace
        </Link>

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Find Teammates</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Browse accepted hackers who are looking for a team for this hackathon.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="text-center py-16 glass border border-slate-200/60 dark:border-white/10 rounded-2xl">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching hackers</p>
            <p className="text-xs text-slate-500 mt-1">No other hackers looking for a team match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((profile) => {
              let skillsArr: string[] = [];
              try {
                skillsArr = JSON.parse(profile.skills);
              } catch(e) {}

              return (
                <motion.div
                  key={profile.id}
                  whileHover={{ y: -3 }}
                  className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{profile.user_name}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{profile.user_email}</p>
                      </div>
                      <div className="flex gap-2">
                        {profile.github_url && (
                          <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-800 dark:hover:text-white" title="GitHub">
                            <Code className="w-4 h-4" />
                          </a>
                        )}
                        {profile.linkedin_url && (
                          <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-800 dark:hover:text-white" title="LinkedIn">
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Resume link */}
                    {profile.resume_url && (
                      <div className="mt-3">
                        <a 
                          href={profile.resume_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          View Resume / Portfolio ↗
                        </a>
                      </div>
                    )}

                    {/* Skills */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {skillsArr.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                          <Tag className="w-2.5 h-2.5" />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200/40 dark:border-white/5 pt-4">
                    <button
                      onClick={() => alert("CometChat 1-on-1 chat will be implemented in Step 2 here!")}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat with Hacker
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

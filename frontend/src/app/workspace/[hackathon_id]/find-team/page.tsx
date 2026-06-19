"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Code, Globe, MessageSquare, Tag, Search, Users } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useCometChat } from "@/components/providers/CometChatProvider";
import { useAuth } from "@/lib/auth";

// Dynamic import with ssr:false — CometChat UI Kit accesses window/document at
// import time, which breaks Next.js static prerendering. This page is already
// a Client Component, so dynamic({ ssr: false }) is allowed (Next.js 15+ rule).
const ChatModal = dynamic(() => import("@/components/chat/ChatModal"), {
  ssr: false,
});

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [profiles, setProfiles] = useState<HackerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // CometChat integration
  const { isInitialized, loginUser } = useCometChat();
  const { user } = useAuth();
  const [chatTarget, setChatTarget] = useState<{ uid: string; name: string } | null>(null);

  // Auto-login to CometChat when user is authenticated
  useEffect(() => {
    if (isInitialized && user?.id) {
      loginUser(user.id);
    }
  }, [isInitialized, user?.id, loginUser]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Reset page to 1 on search queries
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsSearching(true);
      try {
        const excludeParam = user?.id ? `&exclude_user_id=${user.id}` : "";
        const res = await fetch(
          `/api/hackathons/${hackathon_id}/applications?limit=10&offset=${(page - 1) * 10}&approval_status=Accepted&team_preference=Looking for Team&search=${encodeURIComponent(debouncedSearch)}${excludeParam}`
        );
        const data = res.ok ? await res.json() : [];
        if (!active) return;
        setProfiles(data);
        const totalHeader = res.headers.get("X-Total-Count");
        const total = totalHeader ? parseInt(totalHeader, 10) : 0;
        const computedTotalPages = Math.max(Math.ceil(total / 10), 1);
        setTotalPages(computedTotalPages);
        setHasMore(page < computedTotalPages);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setIsSearching(false);
          setInitialLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, hackathon_id, user?.id]);

  const filtered = profiles;

  if (initialLoading) {
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
              className="w-full pl-9 pr-8 py-2 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-500" />
            )}
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
                      onClick={() => setChatTarget({ uid: profile.user_id, name: profile.user_name })}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {(profiles.length > 0 || page > 1) && (
          <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-white/5 pt-6 mt-8">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

      </div>

      {/* CometChat 1-on-1 Chat Modal */}
      <ChatModal
        isOpen={!!chatTarget}
        onClose={() => setChatTarget(null)}
        targetUid={chatTarget?.uid || ""}
        targetName={chatTarget?.name}
      />
    </div>
  );
}

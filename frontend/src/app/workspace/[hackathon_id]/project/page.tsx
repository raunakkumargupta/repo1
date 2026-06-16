"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, FolderGit2, Users, Plus, UserPlus, CheckCircle2 } from "lucide-react";
import { fetchApi } from "@/lib/api";
import TeamGroupChat from "@/components/chat/TeamGroupChat";
import { useCometChat } from "@/components/providers/CometChatProvider";
import { useAuth } from "@/lib/auth";

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type TeamDetails = {
  team: {
    id: string;
    team_name: string;
    invite_code: string;
    repository_url: string | null;
    is_submitted: boolean;
  } | null;
  members: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export default function ProjectPage({ params }: Props) {
  const { hackathon_id } = use(params);

  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState<"Solo" | "Has Team" | "Looking for Team">("Solo");
  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null);

  // Forms states
  const [createTeamName, setCreateTeamName] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [repoURL, setRepoURL] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // CometChat integration
  const { isInitialized, loginUser } = useCometChat();
  const { user: authUser } = useAuth();

  // Auto-login to CometChat when user is authenticated
  useEffect(() => {
    if (isInitialized && authUser?.id) {
      loginUser(authUser.id);
    }
  }, [isInitialized, authUser?.id, loginUser]);

  // Fetch current user's registration preference and team status
  const fetchWorkspaceStatus = async () => {
    try {
      const reg = await fetchApi<any>(`/hackathons/${hackathon_id}/my-registration`);
      setPreference(reg.team_preference);

      if (reg.team_preference === "Has Team" || reg.team_preference === "Looking for Team" || reg.team_preference === "Solo") {
        const team = await fetchApi<TeamDetails | null>(`/hackathons/${hackathon_id}/my-team`);
        setTeamDetails(team);
        if (team && team.team) {
          setRepoURL(team.team.repository_url || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceStatus();
  }, [hackathon_id]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTeamName.trim()) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/hackathons/${hackathon_id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: createTeamName }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to create team");
      }
      setMessage("Team created successfully!");
      setCreateTeamName("");
      await fetchWorkspaceStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/hackathons/${hackathon_id}/teams/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: joinInviteCode.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Invalid invite code or already in team");
      }
      setMessage("Joined team successfully!");
      setJoinInviteCode("");
      await fetchWorkspaceStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/hackathons/${hackathon_id}/teams/submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository_url: repoURL }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to submit project repository");
      }
      setMessage("Project repository submitted successfully!");
      await fetchWorkspaceStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      // For solo hackers, we automatically provision a dummy solo team matching their user name
      // If they don't have a team, we create one first, then submit repository URL.
      let currentTeam = teamDetails?.team;
      if (!currentTeam) {
        const profileRes = await fetch("/api/auth/me");
        const profileData = profileRes.ok ? await profileRes.json() : null;
        const name = profileData ? `Solo - ${profileData.id.slice(0,6)}` : "Solo Team";

        const createRes = await fetch(`/api/hackathons/${hackathon_id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_name: name }),
        });
        if (!createRes.ok) {
          throw new Error("Failed to initialize solo workspace");
        }
      }

      const res = await fetch(`/api/hackathons/${hackathon_id}/teams/submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository_url: repoURL }),
      });
      if (!res.ok) {
        throw new Error("Failed to save repository URL");
      }

      setMessage("Solo project repository submitted successfully!");
      await fetchWorkspaceStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-6 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Link 
          href={`/workspace/${hackathon_id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Workspace
        </Link>

        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Project Submission</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit your build repository URL and manage team members.</p>
        </header>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {message}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold"
          >
            {error}
          </motion.div>
        )}

        {/* --- DYNAMIC FLOW --- */}

        {preference === "Solo" && (
          <form onSubmit={handleSoloSubmit} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <FolderGit2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Solo Project Details</h2>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">GitHub Repository URL</label>
              <input
                type="url"
                required
                placeholder="https://github.com/username/project-repo"
                value={repoURL}
                onChange={(e) => setRepoURL(e.target.value)}
                className="input-base w-full text-sm"
              />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Repository URL"}
            </motion.button>
          </form>
        )}

        {(preference === "Has Team" || preference === "Looking for Team") && !teamDetails?.team && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Team Card */}
            <form onSubmit={handleCreateTeam} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Create a New Team</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Byte Builders"
                  value={createTeamName}
                  onChange={(e) => setCreateTeamName(e.target.value)}
                  className="input-base w-full text-sm"
                />
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Team"}
              </motion.button>
            </form>

            {/* Join Team Card */}
            <form onSubmit={handleJoinTeam} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Join Existing Team</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Invite Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. H3K7P2"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value)}
                  className="input-base w-full text-sm uppercase"
                />
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Join Team"}
              </motion.button>
            </form>
          </div>
        )}

        {(preference === "Has Team" || preference === "Looking for Team") && teamDetails?.team && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Team details & submit repo */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              <form onSubmit={handleSubmitRepo} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <FolderGit2 className="w-5 h-5 text-blue-500" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Team Submission</h2>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">GitHub Repository URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/username/project-repo"
                    value={repoURL}
                    onChange={(e) => setRepoURL(e.target.value)}
                    className="input-base w-full text-sm"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Project Repository"}
                </motion.button>
              </form>

              {/* Embedded Team Group Chat */}
              <TeamGroupChat teamId={teamDetails.team.id} teamName={teamDetails.team.team_name} />
            </div>

            {/* Invite code & Teammates List */}
            <div className="col-span-1 space-y-6">
              {/* Invite Code card */}
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 text-center">
                <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest block">Team Invite Code</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-widest uppercase">{teamDetails.team.invite_code}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Share this code with your teammates to let them join this group.</p>
              </div>

              {/* Members List */}
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Teammates</h3>
                </div>
                <ul className="space-y-3">
                  {teamDetails.members.map((m) => (
                    <li key={m.id} className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{m.name}</span>
                      <span className="text-[10px] text-slate-500">{m.email}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

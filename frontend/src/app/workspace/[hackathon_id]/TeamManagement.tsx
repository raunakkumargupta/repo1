"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, UserPlus, Check, X, Shield, Plus, Copy, Tag, MessageSquare, Trash2, Globe } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";

type Team = {
  id: string;
  hackathon_id: string;
  leader_id: string;
  team_name: string;
  invite_code: string;
  repository_url: string | null;
  is_submitted: boolean;
  members: any[];
};

type JoinRequest = {
  id: string;
  team_id: string;
  user_id: string;
  status: string;
  user_name: string;
  user_email: string;
  team_name: string;
};

type Invitation = {
  id: string;
  team_id: string;
  invitee_id: string;
  status: string;
  team_name: string;
};

export default function TeamManagement({ hackathon_id, user_id, event }: { hackathon_id: string; user_id: string; event: any }) {
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [publicTeams, setPublicTeams] = useState<Team[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]); // For leaders
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);     // For non-team members
  const [myInvitations, setMyInvitations] = useState<Invitation[]>([]); // For non-team members
  const [teamsOffset, setTeamsOffset] = useState(0);
  const [hasMoreTeams, setHasMoreTeams] = useState(true);
  const [isFetchingTeams, setIsFetchingTeams] = useState(false);

  // Forms
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const maxTeamSize = event?.max_team_size || 4;

  const fetchTeamData = async () => {
    try {
      // Fetch my team
      const teamData = await fetchApi<any>(`/hackathons/${hackathon_id}/my-team`);
      if (teamData && teamData.team) {
        setMyTeam({ ...teamData.team, members: teamData.members });
        // If leader, fetch requests
        if (teamData.team.leader_id === user_id) {
          const reqs = await fetchApi<JoinRequest[]>(`/hackathons/${hackathon_id}/teams/${teamData.team.id}/requests`);
          setJoinRequests(reqs || []);
        }
      } else {
        setMyTeam(null);
        // Fetch public teams, my requests, my invites
        const [pub, reqs, invs] = await Promise.all([
          fetchApi<Team[]>(`/hackathons/${hackathon_id}/teams/public?limit=6&offset=0`),
          fetchApi<JoinRequest[]>(`/hackathons/${hackathon_id}/my-requests`),
          fetchApi<Invitation[]>(`/hackathons/${hackathon_id}/my-invitations`),
        ]);
        setPublicTeams(pub || []);
        setHasMoreTeams((pub || []).length === 6);
        setTeamsOffset((pub || []).length);
        setMyRequests(reqs || []);
        setMyInvitations(invs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTeams = async () => {
    if (isFetchingTeams || !hasMoreTeams) return;
    setIsFetchingTeams(true);
    try {
      const pub = await fetchApi<Team[]>(`/hackathons/${hackathon_id}/teams/public?limit=6&offset=${teamsOffset}`);
      const data = pub || [];
      setPublicTeams((prev) => {
        const next = [...prev, ...data];
        const seen = new Set();
        return next.filter((t) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      });
      setHasMoreTeams(data.length === 6);
      setTeamsOffset((prev) => prev + data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingTeams(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [hackathon_id]);

  useEffect(() => {
    if (!hasMoreTeams || isFetchingTeams || loading || myTeam) return;
    const trigger = document.getElementById("teams-load-more-trigger");
    if (!trigger) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreTeams();
      }
    }, { threshold: 0.1 });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [teamsOffset, hasMoreTeams, isFetchingTeams, loading, myTeam]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/teams`, {
        method: "POST",
        body: JSON.stringify({ team_name: createName }),
      });
      setCreateName("");
      showSuccess("Team created successfully!");
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to create team");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/teams/join`, {
        method: "POST",
        body: JSON.stringify({ invite_code: joinCode }),
      });
      setJoinCode("");
      showSuccess("Joined team successfully!");
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to join team");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestToJoin = async (teamId: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/teams/${teamId}/request`, { method: "POST" });
      showSuccess("Request sent to team leader!");
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to request to join");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawRequest = async (reqId: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/requests/${reqId}`, { method: "DELETE" });
      showSuccess("Request withdrawn.");
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to withdraw");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageRequest = async (reqId: string, status: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/requests/${reqId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      showSuccess(`Request ${status.toLowerCase()}`);
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to manage request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !myTeam) return;
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/teams/${myTeam.id}/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail("");
      showSuccess("Invitation sent!");
    } catch (err: any) {
      showError(err.message || "Failed to send invite");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageInvitation = async (invId: string, status: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/invitations/${invId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      showSuccess(`Invitation ${status.toLowerCase()}`);
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to manage invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!myTeam || !confirm("Are you sure you want to remove this member?")) return;
    setActionLoading(true);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/teams/${myTeam.id}/members/${memberId}`, { method: "DELETE" });
      showSuccess("Member removed");
      fetchTeamData();
    } catch (err: any) {
      showError(err.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Invite code copied!");
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs">{errorMsg}</div>}
      {successMsg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs">{successMsg}</div>}

      {/* HAS TEAM: Show Team Dashboard */}
      {myTeam ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Shield className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Your Team</h2>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white">{myTeam.team_name}</h1>
                </div>
                <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Invite Code</p>
                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white tracking-widest">{myTeam.invite_code}</p>
                  </div>
                  <button onClick={() => copyToClipboard(myTeam.invite_code)} className="p-2 bg-slate-200 dark:bg-white/10 rounded-lg hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
                    <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>
              </div>
            </div>

            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Team Members ({myTeam.members.length}/{maxTeamSize})
                </h3>
              </div>
              <div className="grid gap-3">
                {myTeam.members.map((member) => (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center font-bold text-blue-600 text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {member.name}
                          {member.id === myTeam.leader_id && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 rounded text-[9px] uppercase font-black">Leader</span>}
                        </p>
                        <p className="text-[10px] text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    {myTeam.leader_id === user_id && member.id !== user_id && (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={actionLoading}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {myTeam.leader_id === user_id && (
              <>
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-500" />
                    Invite Hacker
                  </h3>
                  <form onSubmit={handleInviteUser} className="space-y-3">
                    <input
                      type="email"
                      placeholder="Enter hacker's email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || myTeam.members.length >= maxTeamSize}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Send Invite
                    </button>
                  </form>
                </div>

                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Join Requests</h3>
                  {joinRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No pending requests</p>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.map(req => (
                        <div key={req.id} className="p-3 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{req.user_name}</p>
                          <p className="text-[10px] text-slate-500 mb-3">{req.user_email}</p>
                          <div className="flex gap-2">
                            <button 
                              disabled={actionLoading || myTeam.members.length >= maxTeamSize}
                              onClick={() => handleManageRequest(req.id, "Accepted")}
                              className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button 
                              disabled={actionLoading}
                              onClick={() => handleManageRequest(req.id, "Rejected")}
                              className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* NO TEAM: Show create/join options */
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-8 space-y-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create a Team</h2>
                <p className="text-xs text-slate-500 mt-1">Start a new team and invite your friends or accept requests from other hackers.</p>
              </div>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <input
                  type="text"
                  placeholder="Awesome Team Name"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
                <button type="submit" disabled={actionLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25">
                  Create Team
                </button>
              </form>
            </div>

            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-8 space-y-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <Tag className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join via Invite Code</h2>
                <p className="text-xs text-slate-500 mt-1">Have an invite code from a team leader? Enter it here to join instantly.</p>
              </div>
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter 6-char code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" disabled={actionLoading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25">
                  Join Team
                </button>
              </form>
            </div>
          </div>

          {(myInvitations.length > 0 || myRequests.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myInvitations.length > 0 && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Pending Invitations</h3>
                  <div className="space-y-3">
                    {myInvitations.map(inv => (
                      <div key={inv.id} className="p-4 bg-white/50 dark:bg-slate-900/40 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-bold text-emerald-600">{inv.team_name}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleManageInvitation(inv.id, "Accepted")} className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => handleManageInvitation(inv.id, "Declined")} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {myRequests.length > 0 && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">My Requests</h3>
                  <div className="space-y-3">
                    {myRequests.map(req => (
                      <div key={req.id} className="p-4 bg-white/50 dark:bg-slate-900/40 border border-blue-500/20 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-bold text-blue-600">{req.team_name}</span>
                        <button onClick={() => handleWithdrawRequest(req.id)} className="text-[10px] px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg font-bold">Withdraw</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Browse Teams */}
          <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Browse Public Teams
            </h2>
            {publicTeams.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No public teams found for this hackathon yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicTeams.map(team => {
                    const isFull = team.members.length >= maxTeamSize;
                    const hasRequested = myRequests.some(r => r.team_id === team.id);
                    return (
                      <motion.div key={team.id} whileHover={{ y: -2 }} className="p-5 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col justify-between h-full">
                        <div>
                          <h3 className="font-black text-lg text-slate-900 dark:text-white">{team.team_name}</h3>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Members ({team.members.length}/{maxTeamSize})</p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {team.members.map(m => (
                              <span key={m.id} className="text-[10px] px-2 py-1 bg-slate-200/50 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300">
                                {m.name.split(' ')[0]} {m.id === team.leader_id && "👑"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-white/5">
                          <button
                            disabled={actionLoading || isFull || hasRequested}
                            onClick={() => handleRequestToJoin(team.id)}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                              hasRequested ? "bg-blue-500/10 text-blue-600 cursor-not-allowed" :
                              isFull ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" :
                              "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                          >
                            {hasRequested ? "Request Sent" : isFull ? "Team Full" : "Request to Join"}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                {hasMoreTeams && (
                  <div id="teams-load-more-trigger" className="h-16 w-full flex items-center justify-center mt-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

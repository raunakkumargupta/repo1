"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  LayoutDashboard, 
  Users, 
  Activity, 
  FolderGit2, 
  Send, 
  CheckCircle, 
  XCircle,
  Mail,
  UserPlus
} from "lucide-react";
import { fetchApi } from "@/lib/api";

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type Application = {
  id: string;
  user_id: string;
  github_url: string | null;
  linkedin_url: string | null;
  skills: string;
  team_preference: string;
  approval_status: string;
  user_name: string;
  user_email: string;
};

type TeamSubmission = {
  id: string;
  team_name: string;
  repository_url: string;
  is_submitted: boolean;
};

export default function OrganizerDashboard({ params }: Props) {
  const { hackathon_id } = use(params);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "applications" | "staff" | "broadcasts" | "submissions">("overview");
  const [eventTitle, setEventTitle] = useState("Hackathon Management Workspace");

  // Data states
  const [applications, setApplications] = useState<Application[]>([]);
  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    teams: 0,
    submissions: 0
  });

  // Action states
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("Mentor");
  const [staffMsg, setStaffMsg] = useState("");

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState("");

  const fetchData = async () => {
    try {
      // 1. Fetch title
      const ev = await fetch(`/api/hackathons/${hackathon_id}`).then((r) => r.ok ? r.json() : null);
      if (ev) setEventTitle(ev.title);

      // 2. Fetch applications
      const apps = await fetch(`/api/hackathons/${hackathon_id}/applications`).then((r) => r.ok ? r.json() : []);
      setApplications(apps);

      // 3. Fetch submissions
      const subs = await fetch(`/api/hackathons/${hackathon_id}/submissions`).then((r) => r.ok ? r.json() : []);
      setSubmissions(subs);

      // 4. Calculate local stats
      const pending = apps.filter((a: any) => a.approval_status === "Pending").length;
      const accepted = apps.filter((a: any) => a.approval_status === "Accepted").length;
      
      setStats({
        pending,
        accepted,
        teams: subs.length, // total registered teams
        submissions: subs.filter((s: any) => s.is_submitted).length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hackathon_id]);

  const handleUpdateStatus = async (regID: string, status: "Accepted" | "Rejected") => {
    try {
      await fetchApi(`/registrations/${regID}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await fetchData();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim()) return;
    setStaffMsg("");

    try {
      await fetch(`/api/hackathons/${hackathon_id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: staffEmail.trim(), role: staffRole }),
      });
      setStaffMsg("Staff assigned successfully!");
      setStaffEmail("");
    } catch (err: any) {
      setStaffMsg(`Error: ${err.message || "Failed to invite staff"}`);
    }
  };

  const handleSendBroadcast = async () => {
    setConfirmBroadcastOpen(false);
    setBroadcastStatus("sending");
    try {
      await fetch(`/api/hackathons/${hackathon_id}/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMsg }),
      });
      setBroadcastStatus("success");
      setBroadcastMsg("");
      setTimeout(() => setBroadcastStatus(""), 2000);
      await fetchData();
    } catch (err: any) {
      setBroadcastStatus(`Error: ${err.message || "Failed to broadcast"}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const sidebarLinks = [
    { id: "overview" as const, name: "Overview", icon: LayoutDashboard },
    { id: "applications" as const, name: "Applications", icon: Users },
    { id: "staff" as const, name: "Event Staff", icon: UserPlus },
    { id: "broadcasts" as const, name: "Broadcasts", icon: Activity },
    { id: "submissions" as const, name: "Submissions", icon: FolderGit2 }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      
      {/* Sidebar - fixed on desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-50 dark:bg-slate-950/40 border-r border-slate-200 dark:border-white/5 pt-20 p-6 space-y-6 flex-shrink-0">
        <div className="px-3">
          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest block">Command Center</span>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">{eventTitle}</h2>
        </div>

        <nav className="space-y-1">
          {sidebarLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer text-left ${
                activeTab === link.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 pt-24 px-6 md:px-12 pb-12 overflow-x-hidden">
        
        {/* Mobile Sidebar Selector */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200 dark:border-white/5">
          {sidebarLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all cursor-pointer ${
                activeTab === link.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
              }`}
            >
              {link.name}
            </button>
          ))}
        </div>

        {/* --- TAB VIEWS --- */}

        {activeTab === "overview" && (
          <div className="space-y-8">
            <header>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Command Overview</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Real-time platform and participant statistics.</p>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Pending Reviews", val: stats.pending, color: "text-amber-500 bg-amber-500/10" },
                { title: "Accepted Hackers", val: stats.accepted, color: "text-green-500 bg-green-500/10" },
                { title: "Formed Teams", val: stats.teams, color: "text-blue-500 bg-blue-500/10" },
                { title: "Submitted Projects", val: stats.submissions, color: "text-indigo-500 bg-indigo-500/10" }
              ].map((card) => (
                <div key={card.title} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{card.title}</span>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${card.color}`}>
                      #
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{card.val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "applications" && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Hacker Applications</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Review applicant profiles and allocate statuses.</p>
            </header>

            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Name</th>
                    <th className="py-3.5 px-5">GitHub / LinkedIn</th>
                    <th className="py-3.5 px-5">Skills</th>
                    <th className="py-3.5 px-5">Track Preference</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-200/40 dark:divide-white/5">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No hacker applications found.</td>
                    </tr>
                  ) : (
                    applications.map((app) => {
                      let skillsArr: string[] = [];
                      try {
                        skillsArr = JSON.parse(app.skills) || [];
                      } catch(e) {}

                      return (
                        <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{app.user_name}</span>
                            <span className="text-[10px] text-slate-500">{app.user_email}</span>
                          </td>
                          <td className="py-4 px-5 space-y-1">
                            {app.github_url && <a href={app.github_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline block">GitHub ↗</a>}
                            {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline block">LinkedIn ↗</a>}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1">
                              {skillsArr.slice(0,3).map((s) => (
                                <span key={s} className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[9px]">
                                  {s}
                                </span>
                              ))}
                              {skillsArr.length > 3 && <span className="text-[9px] text-slate-400">+{skillsArr.length - 3}</span>}
                            </div>
                          </td>
                          <td className="py-4 px-5 font-medium text-slate-600 dark:text-slate-400">{app.team_preference}</td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              app.approval_status === "Accepted" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                              app.approval_status === "Rejected" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                              "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}>
                              {app.approval_status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            {app.approval_status === "Pending" ? (
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "Accepted")}
                                  className="p-1 text-green-600 hover:bg-green-500/10 rounded-lg cursor-pointer"
                                  title="Accept"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(app.id, "Rejected")}
                                  className="p-1 text-red-600 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                  title="Reject"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Event Staff Assignment</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Assign invited users to Mentor or Judge roles for this hackathon.</p>
            </header>

            <form onSubmit={handleInviteStaff} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 max-w-md space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add Staff Member</h2>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff@hackathon.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="input-base w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Role Assign</label>
                <div className="flex gap-2">
                  {["Mentor", "Judge"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setStaffRole(r)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        staffRole === r 
                          ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {staffMsg && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold leading-relaxed ${
                  staffMsg.includes("Error") ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                }`}>
                  {staffMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={!staffEmail.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-sm disabled:opacity-50"
              >
                Assign Staff Member
              </button>
            </form>
          </div>
        )}

        {activeTab === "broadcasts" && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Live Broadcasts</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Draft announcements and notify all registered hackathon hackers instantly.</p>
            </header>

            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 max-w-xl space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Announcement Message</label>
                <textarea
                  rows={5}
                  required
                  placeholder="e.g. Submissions close in 1 hour! Get your repository URLs updated in your workspaces."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full p-3.5 bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="push"
                  checked={sendPush}
                  onChange={(e) => setSendPush(e.target.checked)}
                  className="rounded border-slate-200 dark:border-white/10 text-blue-600 focus:ring-blue-500 bg-transparent"
                />
                <label htmlFor="push" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Send Instant Push Notification Alerts</label>
              </div>

              {broadcastStatus && (
                <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  broadcastStatus.includes("Error") ? "bg-red-500/10 text-red-600" :
                  broadcastStatus === "success" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-500"
                }`}>
                  {broadcastStatus === "sending" ? "Publishing announcement..." : 
                   broadcastStatus === "success" ? "Broadcast successfully enqueued!" : 
                   broadcastStatus}
                </div>
              )}

              <button
                type="button"
                onClick={() => setConfirmBroadcastOpen(true)}
                disabled={!broadcastMsg.trim() || broadcastStatus === "sending"}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Announcement
              </button>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
              {confirmBroadcastOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/45 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="max-w-md w-full glass p-6 rounded-2xl border border-slate-200 dark:border-white/10 text-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center mx-auto text-lg font-black font-mono">!</div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Global Broadcast</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Are you sure you want to broadcast this message to all participants? This will trigger a live notification on their workspaces and devices.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setConfirmBroadcastOpen(false)} className="flex-1 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer">Cancel</button>
                      <button onClick={handleSendBroadcast} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs cursor-pointer">Confirm Broadcast</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Submitted Projects</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Review repository submissions and finalize the event judging portal.</p>
            </header>

            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Team Name</th>
                    <th className="py-3.5 px-5">GitHub Repository</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-200/40 dark:divide-white/5">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">No project submissions yet.</td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                        <td className="py-4 px-5 font-bold text-slate-800 dark:text-slate-200">{sub.team_name}</td>
                        <td className="py-4 px-5">
                          {sub.repository_url ? (
                            <a href={sub.repository_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                              {sub.repository_url}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No repo url</span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sub.is_submitted ? "bg-green-500/10 text-green-500" : "bg-slate-100 dark:bg-white/5 text-slate-400"
                          }`}>
                            {sub.is_submitted ? "Submitted" : "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

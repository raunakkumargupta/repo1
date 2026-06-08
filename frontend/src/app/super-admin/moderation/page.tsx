"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  UserX, 
  ShieldAlert, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Search,
  Shield,
  Trash
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type ModerationLog = {
  id: string;
  user_id: string;
  content: string;
  timestamp: string;
};

export default function SuperAdminModeration() {
  const { user, loading: authLoading } = useAuth(["SuperAdmin", "Admin"]);
  const [users, setUsers] = useState<User[]>([]);
  const [modLogs, setModLogs] = useState<ModerationLog[]>([]);
  
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [banningId, setBanningId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const data = await fetchApi<User[]>("/users");
      setUsers(data || []);
    } catch (err: any) {
      console.error("Failed to load user directory:", err);
      setErrorMessage(err.message || "Failed to load user database catalog.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadModerationLogs = async () => {
    try {
      const data = await fetchApi<ModerationLog[]>("/admin/moderation/logs");
      setModLogs(data || []);
    } catch (err: any) {
      console.error("Failed to load moderation logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const initData = async () => {
    setLoadingUsers(true);
    setLoadingLogs(true);
    await Promise.all([loadUsers(), loadModerationLogs()]);
  };

  useEffect(() => {
    if (user) {
      initData();
    }
  }, [user]);

  const showFeedback = (success: string, error = "") => {
    if (success) {
      setSuccessMessage(success);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
    if (error) {
      setErrorMessage(error);
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await fetchApi(`/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      showFeedback(`User privileges upgraded to ${newRole}.`);
      await loadUsers();
    } catch (err: any) {
      showFeedback("", err.message || "Failed to upgrade user privileges.");
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate/ban this account? They will lose access immediately.")) {
      return;
    }
    setBanningId(userId);
    try {
      await fetchApi(`/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "deactivated" }),
      });
      showFeedback("Account has been banned and JWT sessions invalidated.");
      await loadUsers();
    } catch (err: any) {
      showFeedback("", err.message || "Failed to suspend account.");
    } finally {
      setBanningId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Validating moderator console credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-left relative z-10">
      
      {/* Ambient backgrounds */}
      <div className="absolute top-[-100px] right-0 w-[400px] h-[300px] bg-rose-500/5 dark:bg-rose-600/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Response Alert Feedback */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/2"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-white/5 pb-8">
        <div>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            Global Moderation
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
            Moderation & Privileges
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Manage user roles override parameters, review automated platform flags, and ban malicious actors.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
          />
        </div>
      </header>

      {/* Privilege Controller table */}
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-white/5">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Privilege Overrides</h2>
          <p className="text-xs text-slate-400 mt-1">Directly change user privilege levels or lock them out of platform access.</p>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 font-semibold text-xs tracking-wider uppercase">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Security Level</th>
                <th className="px-6 py-4">Access Status</th>
                <th className="px-6 py-4 text-right">Suspend Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                      <span>Retrieving directory catalogs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-slate-500 text-center italic font-medium">
                    No matching users found in the active databases.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isBanned = u.status === "deactivated";
                  return (
                    <tr key={u.id} className="hover:bg-slate-100/30 dark:hover:bg-white/5 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">{u.name}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        <select
                          className="bg-white/50 dark:bg-slate-950/45 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-rose-500 focus:border-rose-500 outline-none font-bold cursor-pointer"
                          value={u.role}
                          disabled={u.role === "SuperAdmin" || isBanned}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        >
                          <option value="SuperAdmin">SuperAdmin</option>
                          <option value="Admin">Admin</option>
                          <option value="Organizer">Organizer</option>
                          <option value="Judge">Judge</option>
                          <option value="Mentor">Mentor</option>
                          <option value="Hacker">Hacker</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          isBanned 
                            ? "bg-red-500/10 border-red-500/20 text-red-500" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        }`}>
                          {isBanned ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleBanUser(u.id)}
                          disabled={isBanned || u.role === "SuperAdmin" || banningId === u.id}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 disabled:opacity-40 disabled:hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {banningId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          Suspend Account
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cyberpunk retro log terminal */}
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
          <div className="flex items-center text-rose-600 dark:text-rose-400 gap-2">
            <Terminal className="w-5 h-5" />
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Security & Chat Moderation Terminal</h2>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <Shield className="w-3 h-3 animate-spin" />
            Active Websocket feed
          </span>
        </div>

        <div className="font-mono text-xs leading-relaxed text-slate-400 bg-black p-5 rounded-xl border border-slate-200 dark:border-white/10 overflow-y-auto h-48 space-y-2.5 text-left select-text relative shadow-inner">
          {loadingLogs ? (
            <p className="text-slate-500 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Listening to socket feeds...</span>
            </p>
          ) : modLogs.length === 0 ? (
            <p className="text-slate-500 italic">No toxic messaging infractions flagged in this session.</p>
          ) : (
            modLogs.map((log) => (
              <p key={log.id} className="text-slate-400">
                <span className="text-indigo-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                <span className="text-amber-500 font-semibold">[FLAGGED]</span>{" "}
                <span className="text-slate-300 font-bold">User {log.user_id}:</span> {log.content}
              </p>
            ))
          )}
          <p className="animate-pulse text-indigo-400/80 text-[10px] select-none">
            &gt;&gt; Listening to incoming CometChat Data Moderation webhooks...
          </p>
        </div>
      </div>

    </div>
  );
}

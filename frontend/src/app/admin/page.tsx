"use client";

import { useEffect, useState } from "react";
import { Users, Ticket, CheckCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth(["Admin", "SuperAdmin"]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await fetchApi<User[]>("/users");
      if (data) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
          Authorizing administrative credentials...
        </div>
      </div>
    );
  }

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await fetchApi(`/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch (err) {
      alert("Failed to update role");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 relative p-6 md:p-12 overflow-hidden">
      
      {/* Background Glow Mesh */}
      <div className="absolute top-0 right-0 w-[600px] h-[300px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none rounded-full z-0" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-10 text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">
            Real-time analytics and management dashboard.
          </p>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Metric 1 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex items-center shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 group"
          >
            <div className="p-3.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 mr-4 transition-transform group-hover:scale-105">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                Total Users Seeded
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                {users.length}
              </h3>
            </div>
          </motion.div>

          {/* Metric 2 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex items-center shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-orange-500/5 dark:hover:shadow-orange-500/10 group"
          >
            <div className="p-3.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400 mr-4 transition-transform group-hover:scale-105">
              <Ticket className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                Active Queue
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                14
              </h3>
            </div>
          </motion.div>

          {/* Metric 3 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex items-center shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-green-500/5 dark:hover:shadow-green-500/10 group"
          >
            <div className="p-3.5 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400 mr-4 transition-transform group-hover:scale-105">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                Resolved Tickets
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                128
              </h3>
            </div>
          </motion.div>
        </div>

        {/* Directory Table */}
        <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl overflow-hidden mb-12 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.1)]">
          <div className="p-6 border-b border-slate-200/50 dark:border-white/10 text-left">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Directory
            </h2>
            <p className="text-xs text-slate-400 mt-1">Manage user privilege levels and authorization roles.</p>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/30 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 text-slate-400 dark:text-slate-500 font-semibold text-xs tracking-wider uppercase">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-left text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                        Retrieving user directory records...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-left text-slate-500 dark:text-slate-400">
                      No active database entries found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <select
                            className="bg-white/60 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-40 p-2 transition-colors cursor-pointer outline-none"
                            value={u.role}
                            onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Agent">Agent</option>
                            <option value="User">User</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center mb-4 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Audit & Moderation Logs
            </h2>
          </div>
          <div className="font-mono text-[11px] leading-relaxed text-slate-400 bg-slate-950 p-5 rounded-xl border border-slate-200/50 dark:border-white/10 overflow-y-auto h-48 space-y-2.5 text-left">
            <p className="text-slate-500"><span className="text-blue-500">[2026-06-07 15:42:01]</span> INFO: Webhook dispatched - Ticket 489 resolved by Agent 12</p>
            <p className="text-yellow-600 dark:text-yellow-500/90"><span className="text-blue-500">[2026-06-07 15:45:12]</span> WARN: Rate Limit Triggered - IP 192.168.1.5 blocked for POST /api/tickets</p>
            <p className="text-slate-500"><span className="text-blue-500">[2026-06-07 15:50:00]</span> INFO: Webhook dispatched - Team "Alpha" created by Admin</p>
            <p className="animate-pulse text-blue-400">Listening to socket for incoming log payloads...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

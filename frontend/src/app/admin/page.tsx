"use client";

import { useEffect, useState } from "react";
import { Users, Ticket, CheckCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export default function AdminDashboard() {
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
    fetchUsers();
  }, []);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await fetchApi(`/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      // Refresh user list
      fetchUsers();
    } catch (err) {
      alert("Failed to update role");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">System Metrics & Directory</p>
      </header>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-[var(--surface)] p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm hover:shadow-xl hover:shadow-blue-900/10 dark:hover:shadow-blue-500/10 transition-all duration-300 ease-in-out"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-[var(--primary)] mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 transition-colors">Total Users Seeded</p>
            <h3 className="text-2xl font-bold">{users.length}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-[var(--surface)] p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm hover:shadow-xl hover:shadow-orange-900/10 dark:hover:shadow-orange-500/10 transition-all duration-300 ease-in-out"
        >
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 mr-4">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Queue</p>
            <h3 className="text-2xl font-bold">14</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-[var(--surface)] p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm hover:shadow-xl hover:shadow-green-900/10 dark:hover:shadow-green-500/10 transition-all duration-300 ease-in-out"
        >
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 mr-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Resolved Tickets</p>
            <h3 className="text-2xl font-bold">128</h3>
          </div>
        </motion.div>
      </div>

      {/* Directory Table */}
      <div className="bg-[var(--surface)] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-12 shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">User Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="bg-[var(--background)] border border-slate-300 dark:border-slate-600 text-sm rounded-lg focus:ring-[var(--primary)] focus:border-[var(--primary)] block w-full p-2 transition-colors duration-200 ease-in-out cursor-pointer hover:border-[var(--primary)]"
                        value={u.role}
                        onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Agent">Agent</option>
                        <option value="User">User</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mock Webhook Logs */}
      <div className="bg-[var(--surface)] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center mb-4 text-[var(--destructive)]">
          <ShieldAlert className="w-5 h-5 mr-2" />
          <h2 className="text-xl font-bold text-[var(--foreground)]">Audit & Moderation Logs</h2>
        </div>
        <div className="font-mono text-xs text-slate-400 bg-gray-900 p-4 rounded-lg overflow-y-auto h-48 space-y-2">
          <p>[2026-06-07 15:42:01] INFO: Webhook dispatched - Ticket 489 resolved by Agent 12</p>
          <p>[2026-06-07 15:45:12] WARN: Rate Limit Triggered - IP 192.168.1.5 blocked for POST /api/tickets</p>
          <p>[2026-06-07 15:50:00] INFO: Webhook dispatched - Team "Alpha" created by Admin</p>
          <p className="animate-pulse">Waiting for new events...</p>
        </div>
      </div>
    </div>
  );
}

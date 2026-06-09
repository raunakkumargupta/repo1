"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderGit2, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Search,
  Calendar
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type Hackathon = {
  id: string;
  title: string;
  is_approved: boolean;
  registration_status: string;
  start_date: string;
  end_date: string;
};

export default function SuperAdminHackathons() {
  const { user, loading: authLoading } = useAuth(["SuperAdmin", "Admin"]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHackathons = async () => {
    try {
      setLoading(true);
      const dataRaw = await fetchApi<Hackathon[] | null>("/hackathons/all");
      const data = dataRaw || [];
      setHackathons(data);
    } catch (err: any) {
      console.error("Failed to load hackathons:", err);
      setErrorMessage(err.message || "Failed to load hackathons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHackathons();
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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete hackathon: ${title}? This action cannot be undone.`)) {
      return;
    }
    
    setDeletingId(id);
    try {
      await fetchApi(`/admin/hackathons/${id}`, {
        method: "DELETE",
      });
      showFeedback(`Hackathon "${title}" has been deleted successfully.`);
      await loadHackathons();
    } catch (err: any) {
      showFeedback("", err.message || "Failed to delete hackathon.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredHackathons = hackathons.filter((h) =>
    h.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Loading hackathons...</p>
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
            Global Administration
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
            All Hackathons
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Manage, review, and delete live hackathons across the platform.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search hackathons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
          />
        </div>
      </header>

      {/* Hackathons Table */}
      <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-xs uppercase font-bold text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredHackathons.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <FolderGit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          <Link href={`/workspace/${h.id}`} className="hover:underline">
                            {h.title}
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500">{h.id.split("-")[0]}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{new Date(h.start_date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      h.is_approved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {h.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(h.id, h.title)}
                      disabled={deletingId === h.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        deletingId === h.id
                          ? 'bg-red-500/20 text-red-700 cursor-not-allowed'
                          : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300'
                      }`}
                    >
                      {deletingId === h.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredHackathons.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No hackathons found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

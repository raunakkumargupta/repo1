"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type PendingHackathon = {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  tracks: string;
  start_date: string;
  end_date: string;
  organizer_id: string;
};

export default function SuperAdminOrganizers() {
  const { user, loading: authLoading } = useAuth(["SuperAdmin", "Admin"]);
  const [pendingHacks, setPendingHacks] = useState<PendingHackathon[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPendingHackathons = async () => {
    try {
      const data = await fetchApi<PendingHackathon[]>("/admin/organizers/pending");
      setPendingHacks(data || []);
    } catch (err: any) {
      console.error("Failed to load pending hackathons:", err);
      setErrorMessage(err.message || "Failed to retrieve pending organizers queue.");
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPendingHackathons();
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

  const handleApproveHackathon = async (hackId: string) => {
    setApprovingId(hackId);
    try {
      await fetchApi(`/admin/organizers/${hackId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Accepted" }),
      });
      showFeedback("Tenant approved successfully. The host's role has been upgraded to Organizer.");
      await loadPendingHackathons();
    } catch (err: any) {
      showFeedback("", err.message || "Failed to approve hackathon request.");
    } finally {
      setApprovingId(null);
    }
  };

  const filteredHacks = pendingHacks.filter((hack) =>
    hack.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hack.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hack.organizer_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Validating tenant manager credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-left relative z-10">
      
      {/* Background ambient glow */}
      <div className="absolute top-[-100px] left-0 w-[400px] h-[300px] bg-indigo-500/10 dark:bg-indigo-600/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Action Alerts */}
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
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Tenant Approvals
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
            Host Requests Queue
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Verify workspace requests to host events, review organizer criteria, and grant event hosting credentials.
          </p>
        </div>

        {/* Search Input bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
        </div>
      </header>

      {/* Requests table container */}
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Tenant Applications</h2>
            <p className="text-xs text-slate-400 mt-1">Accepting an application automatically promotes the requester to Organizer.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {filteredHacks.length} pending
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 font-semibold text-xs tracking-wider uppercase">
                <th className="px-6 py-4">Hackathon Context</th>
                <th className="px-6 py-4">Technology Tracks</th>
                <th className="px-6 py-4">Event Duration</th>
                <th className="px-6 py-4">Organizer ID</th>
                <th className="px-6 py-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
              {loadingPending ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Retrieving organizers queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHacks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-slate-500 text-center italic font-medium">
                    No pending hackathon requests found.
                  </td>
                </tr>
              ) : (
                filteredHacks.map((hack) => {
                  let tracksArr: string[] = [];
                  try {
                    tracksArr = JSON.parse(hack.tracks) || [];
                  } catch {
                    tracksArr = [];
                  }
                  return (
                    <tr key={hack.id} className="hover:bg-slate-100/30 dark:hover:bg-white/5 transition-all">
                      <td className="px-6 py-4 max-w-sm">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight text-sm">
                          {hack.title}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {hack.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {tracksArr.map((tr) => (
                            <span key={tr} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                              {tr}
                            </span>
                          ))}
                          {tracksArr.length === 0 && (
                            <span className="text-slate-500 italic text-[10px]">No tracks</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(hack.start_date).toLocaleDateString()} - {new Date(hack.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{hack.organizer_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleApproveHackathon(hack.id)}
                          disabled={approvingId !== null}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 hover:shadow-lg disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {approvingId === hack.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Promoting...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Approve request
                            </>
                          )}
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

      {/* Guide Banner */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 flex gap-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 dark:text-white block mb-1">Approval Verification Notice</span>
          Applications are verified against platform code of conduct. Approving a request upgrades the tenant user role to <strong className="text-blue-500">Organizer</strong>, granting them access to configure registration fields, define timelines, configure evaluation criteria, and manage mentors/judges.
        </div>
      </div>

    </div>
  );
}

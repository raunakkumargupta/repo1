"use client";

import { useEffect, useState, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderGit2, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Search,
  ExternalLink,
  Trophy,
  Megaphone
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Team = {
  id: string;
  hackathon_id: string;
  team_name: string;
  repository_url: string | null;
  is_submitted: boolean;
  is_winner: boolean;
};

export default function OrganizerSubmissions({ params }: { params: Promise<{ hackathon_id: string }> }) {
  const { hackathon_id } = use(params);
  const { user, loading: authLoading } = useAuth(["Organizer", "Admin", "SuperAdmin"]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const router = useRouter();

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<Team[]>(`/hackathons/${hackathon_id}/submissions`);
      setTeams(data || []);
    } catch (err: any) {
      console.error("Failed to load submissions:", err);
      setErrorMessage(err.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && hackathon_id) {
      loadSubmissions();
    }
  }, [user, hackathon_id]);

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

  const handleToggleWinner = async (teamId: string, currentStatus: boolean) => {
    setUpdatingId(teamId);
    try {
      await fetchApi(`/hackathons/${hackathon_id}/teams/${teamId}/winner`, {
        method: "PUT",
        body: JSON.stringify({ is_winner: !currentStatus }),
      });
      showFeedback(`Team winner status updated successfully.`);
      await loadSubmissions();
    } catch (err: any) {
      showFeedback("", err.message || "Failed to update team winner status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAnnounceWinners = () => {
    const winners = teams.filter(t => t.is_winner);
    if (winners.length === 0) {
      showFeedback("", "Please mark at least one team as a winner before announcing.");
      return;
    }
    const winnerNames = winners.map(w => w.team_name).join(", ");
    
    // Store message in local storage and redirect to broadcasts tab
    localStorage.setItem("prefilled_broadcast", `🏆 Congratulations to our winners!\n\nWe are thrilled to announce that the following teams have won:\n\n**${winnerNames}**\n\nAmazing work everyone!`);
    router.push(`/organizer/${hackathon_id}/broadcasts`);
  };

  const filteredTeams = teams.filter((t) =>
    t.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-left relative z-10">
      
      <div className="absolute top-[-100px] right-0 w-[400px] h-[300px] bg-blue-500/5 dark:bg-blue-600/5 blur-[100px] pointer-events-none rounded-full" />

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

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-white/5 pb-8">
        <div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            Hackathon Management
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
            Submissions & Results
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Review submitted projects, mark winning teams, and announce results.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
            />
          </div>
          <button 
            onClick={handleAnnounceWinners}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
          >
            <Megaphone className="w-4 h-4" />
            Announce Results
          </button>
        </div>
      </header>

      <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-xs uppercase font-bold text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4">Repository</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredTeams.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${t.is_winner ? 'bg-yellow-500/5 dark:bg-yellow-500/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Trophy className={`w-4 h-4 ${t.is_winner ? 'text-yellow-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {t.team_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {t.repository_url ? (
                      <a href={t.repository_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                        <FolderGit2 className="w-4 h-4" />
                        View Repo <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Submitted
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleWinner(t.id, t.is_winner)}
                      disabled={updatingId === t.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        t.is_winner
                          ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20'
                      }`}
                    >
                      {updatingId === t.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      )}
                      {t.is_winner ? 'Winner' : 'Mark as Winner'}
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredTeams.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No submitted teams found.</p>
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

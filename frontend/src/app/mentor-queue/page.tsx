"use client";

import { useEffect, useState } from "react";
import { Ticket, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";

import { useAuth } from "@/lib/auth";

type TicketData = {
  id: string;
  team_id: string;
  description: string;
  status: string;
  created_at: string;
};

export default function MentorQueue() {
  const { user, loading: authLoading } = useAuth(["Agent", "Manager"]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const data = await fetchApi<TicketData[]>("/tickets/queue");
      if (data) setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchQueue();
    // Poll every 10 seconds for live feel
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
          Authorizing agent access credentials...
        </div>
      </div>
    );
  }

  const handleAccept = async (id: string) => {
    try {
      await fetchApi(`/tickets/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      });
      // Remove from UI optimistically with Framer Motion slide-out
      setTickets(tickets.filter((t) => t.id !== id));
    } catch (err) {
      alert("Failed to accept ticket");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 relative p-6 md:p-12 overflow-hidden">
      
      {/* Background Glow Mesh */}
      <div className="absolute top-0 right-0 w-[600px] h-[300px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none rounded-full z-0" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="mb-10 pb-6 border-b border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Mentor Support Queue
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">
              Live requests from participating teams in real-time.
            </p>
          </div>
          <div className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
            Live Sync Active
          </div>
        </header>

        {/* Dynamic Grid layout */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <motion.div
                key="loading-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full py-12 text-left text-slate-500 dark:text-slate-400"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                  Streaming active queue data...
                </div>
              </motion.div>
            ) : tickets.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="col-span-full py-20 text-center bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/10 rounded-2xl backdrop-blur-xl flex flex-col items-center justify-center p-8"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500/80 mb-4" />
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Queue Cleared
                </h3>
                <p className="text-sm text-slate-400 mt-1.5 max-w-sm">
                  There are no active requests in the queue. Mentors can stand by.
                </p>
              </motion.div>
            ) : (
              tickets.map((t, index) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 100, damping: 15, delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex flex-col shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 text-left"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Needs Help
                    </span>
                    <span className="text-xs text-slate-400 flex items-center font-medium">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-2 flex items-center">
                    <Ticket className="w-5 h-5 mr-2 text-blue-500" />
                    Team {t.team_id.substring(0, 8)}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 flex-grow leading-relaxed">
                    {t.description}
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAccept(t.id)}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-600/10 hover:shadow-blue-500/20 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    Accept Ticket
                  </motion.button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

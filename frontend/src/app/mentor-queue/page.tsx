"use client";

import { useEffect, useState } from "react";
import { Ticket, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";

type TicketData = {
  id: string;
  team_id: string;
  description: string;
  status: string;
  created_at: string;
};

export default function MentorQueue() {
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
    fetchQueue();
    // Poll every 10 seconds for live feel
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await fetchApi(`/tickets/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      });
      // Remove from UI optimistically or refetch
      setTickets(tickets.filter((t) => t.id !== id));
    } catch (err) {
      alert("Failed to accept ticket");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <header className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Mentor Support Queue</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Live requests from participating teams</p>
        </div>
        <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
          Live Sync Active
        </div>
      </header>

      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {loading ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-slate-500 col-span-full">Loading queue...</motion.p>
          ) : tickets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="col-span-full py-20 text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-500">Inbox Zero</h3>
              <p className="text-slate-400 mt-2">There are currently no active mentor requests.</p>
            </motion.div>
          ) : (
            tickets.map((t, index) => (
              <motion.div 
                key={t.id} 
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-[var(--surface)] p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-lg transition-shadow duration-200 ease-in-out"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    Needs Help
                  </span>
                  <span className="text-xs text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold mb-2 flex items-center transition-all duration-200">
                  <Ticket className="w-5 h-5 mr-2 text-[var(--primary)]" />
                  Team {t.team_id.substring(0, 8)}...
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 flex-grow">
                  {t.description}
                </p>

                <button
                  onClick={() => handleAccept(t.id)}
                  className="w-full py-2.5 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all duration-200 ease-in-out"
                >
                  Accept Ticket
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

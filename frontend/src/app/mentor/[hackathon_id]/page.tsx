"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, HelpCircle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type Ticket = {
  id: string;
  hackathon_id: string;
  team_id: string;
  assigned_mentor_id: string | null;
  description: string;
  status: string;
  created_at: string;
  team_name?: string;
};

export default function MentorTerminal({ params }: Props) {
  const { hackathon_id } = use(params);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchTickets = async () => {
    try {
      const u = await fetch("/api/auth/me").then((r) => r.ok ? r.json() : null);
      setUser(u);

      const list = await fetch(`/api/hackathons/${hackathon_id}/tickets`).then((r) => r.ok ? r.json() : []);
      
      // Fetch team names for each ticket to show beautiful details
      const ticketsWithTeams = await Promise.all(
        list.map(async (t: Ticket) => {
          try {
            // Note: Since standard routes might restrict fetching specific team details,
            // we can fallback to mock team names if needed, or query them.
            // Let's resolve with a fallback team slice
            return {
              ...t,
              team_name: `Team ${t.team_id.slice(0, 5).toUpperCase()}`
            };
          } catch(e) {
            return t;
          }
        })
      );

      setTickets(ticketsWithTeams);

      // Find if this mentor already has an active ticket assigned to them
      if (u) {
        const active = ticketsWithTeams.find(
          (t: Ticket) => t.status === "Active" && t.assigned_mentor_id === u.id
        );
        if (active) setActiveTicket(active);
        else setActiveTicket(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [hackathon_id]);

  const handleAcceptTicket = async (ticketID: string) => {
    try {
      await fetchApi(`/tickets/${ticketID}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Active" }),
      });
      await fetchTickets();
    } catch (err: any) {
      alert(`Failed to claim ticket: ${err.message}`);
    }
  };

  const handleResolveTicket = async (ticketID: string) => {
    try {
      await fetchApi(`/tickets/${ticketID}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Resolved" }),
      });
      setActiveTicket(null);
      await fetchTickets();
    } catch (err: any) {
      alert(`Failed to resolve ticket: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const openTickets = tickets.filter((t) => t.status === "Open");

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-6 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center border-b border-slate-200/60 dark:border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live Support Terminal</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">Mentor Support Desk</h1>
          </div>
          <button 
            onClick={fetchTickets}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 text-xs font-bold rounded-xl bg-white/60 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            Refresh Queue
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Open Queue List */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Unassigned Help Requests ({openTickets.length})</h2>
            
            <AnimatePresence mode="popLayout">
              {openTickets.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-8 text-center space-y-2"
                >
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Queue is clear!</h3>
                  <p className="text-xs text-slate-500">No unassigned help requests. Excellent work.</p>
                </motion.div>
              ) : (
                openTickets.map((ticket) => {
                  const elapsed = Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60000);
                  return (
                    <motion.div
                      layout
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                    >
                      <div className="space-y-2 max-w-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{ticket.team_name}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {elapsed}m ago
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-100/50 dark:bg-white/2 p-3 rounded-lg border border-slate-200/30 dark:border-white/5">
                          {ticket.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAcceptTicket(ticket.id)}
                        disabled={activeTicket !== null}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shrink-0 cursor-pointer disabled:opacity-40"
                      >
                        Accept Ticket
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Active Workspace / Ticket Panel */}
          <div className="col-span-1 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Active Workspace</h2>
            
            {activeTicket ? (
              <div className="glass border border-blue-500/30 dark:border-blue-500/20 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />

                <div>
                  <span className="text-[9px] font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-widest block">Currently Reviewing</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{activeTicket.team_name}</h3>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Issue Statement</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-100/50 dark:bg-white/2 p-3 rounded-lg border border-slate-200/30 dark:border-white/5">
                    {activeTicket.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 space-y-2">
                  <button
                    onClick={() => alert("CometChat 1-on-1 chat/video widget will programmatically spawn here in Step 2!")}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    Open Live Hacker Chat
                  </button>

                  <button
                    onClick={() => handleResolveTicket(activeTicket.id)}
                    className="w-full py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Mark as Resolved
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 text-center py-10 space-y-2">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No active tickets</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">Accept an unassigned ticket from the queue on the left to begin resolving.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

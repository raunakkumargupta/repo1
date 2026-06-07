"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Shield, Clock, Users, Terminal } from "lucide-react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApi("/registrations/me")
      .then((data) => setProfile(data))
      .catch((err) => console.error("No profile found", err));
  }, []);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDescription) return;
    setIsSubmitting(true);
    setMessage("");

    try {
      // Temporary team ID, in a real app this would be tied to the user's actual team
      await fetchApi("/tickets", {
        method: "POST",
        body: JSON.stringify({
          team_id: "00000000-0000-0000-0000-000000000000", 
          description: ticketDescription,
        }),
      });
      setMessage("Mentor requested successfully! They will arrive shortly.");
      setTicketDescription("");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Participant Dashboard</h1>
          <p className="text-slate-500">Manage your hackathon experience.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Status Card */}
          <motion.div whileHover={{ y: -5 }} className="col-span-1 md:col-span-2 bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-primary w-6 h-6" />
              <h2 className="text-xl font-bold text-foreground">Team Status</h2>
            </div>
            {profile ? (
              <div className="space-y-2">
                <p className="text-foreground"><span className="font-semibold">Current Status:</span> {profile.status}</p>
                <p className="text-foreground"><span className="font-semibold">Skills:</span> {profile.skills ? JSON.parse(profile.skills).join(", ") : "None listed"}</p>
              </div>
            ) : (
              <p className="text-slate-500">Loading profile data...</p>
            )}
          </motion.div>

          {/* Schedule Card */}
          <motion.div whileHover={{ y: -5 }} className="col-span-1 bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-primary w-6 h-6" />
              <h2 className="text-xl font-bold text-foreground">Schedule</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex justify-between"><span className="font-semibold text-foreground">Hacking Begins</span><span>10:00 AM</span></li>
              <li className="flex justify-between"><span className="font-semibold text-foreground">Lunch</span><span>1:00 PM</span></li>
              <li className="flex justify-between"><span className="font-semibold text-foreground">Mentor Check-in</span><span>4:00 PM</span></li>
              <li className="flex justify-between"><span className="font-semibold text-foreground">Submissions Due</span><span>10:00 AM Sun</span></li>
            </ul>
          </motion.div>
        </div>

        {/* Mentor Request */}
        <motion.div whileHover={{ y: -5 }} className="bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="text-primary w-6 h-6" />
            <h2 className="text-xl font-bold text-foreground">Request Technical Mentor</h2>
          </div>
          <p className="text-slate-500 mb-6">Stuck on a bug? Need architectural advice? Ping a mentor to your table.</p>
          
          <form onSubmit={handleTicketSubmit} className="flex flex-col gap-4">
            <textarea 
              className="w-full p-4 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground resize-none focus:ring-2 focus:ring-primary outline-none"
              rows={3}
              placeholder="Describe your technical issue... e.g. My Next.js server actions are throwing CORS errors."
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
            />
            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.includes("Error") ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}`}>
                {message}
              </div>
            )}
            <button 
              type="submit" 
              disabled={isSubmitting || !ticketDescription}
              className="self-end px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

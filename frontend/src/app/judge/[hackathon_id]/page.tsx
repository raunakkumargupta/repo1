"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Award, ClipboardCheck } from "lucide-react";

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type Project = {
  id: string;
  hackathon_id: string;
  team_name: string;
  repository_url: string;
  is_submitted: boolean;
};

export default function JudgeDashboard({ params }: Props) {
  const { hackathon_id } = use(params);

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [evaluated, setEvaluated] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/hackathons/${hackathon_id}/projects`)
      .then((res) => (res.ok ? res.json() : { projects: [], evaluated: {} }))
      .then((data) => {
        setProjects(data.projects || []);
        setEvaluated(data.evaluated || {});
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [hackathon_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center border-b border-slate-200/60 dark:border-white/5 pb-6">
          <div>
            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">VIP Evaluation Portal</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">Submitted Projects</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Grade finalized repository submissions across evaluation criteria.</p>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="text-center py-20 glass border border-slate-200/60 dark:border-white/10 rounded-2xl">
            <Award className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No project submissions yet</h3>
            <p className="text-xs text-slate-500 mt-1">Once teams submit their repositories, they will appear here for evaluation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const isEvaluated = evaluated[proj.id] || false;
              return (
                <motion.div
                  key={proj.id}
                  whileHover={{ y: -3 }}
                  className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{proj.team_name}</h3>
                      {isEvaluated && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-bold uppercase tracking-wider">
                          <ClipboardCheck className="w-3 h-3" />
                          Graded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono overflow-hidden text-ellipsis line-clamp-1">{proj.repository_url}</p>
                  </div>

                  <div className="mt-6 border-t border-slate-200/40 dark:border-white/5 pt-4">
                    <Link
                      href={`/judge/${hackathon_id}/project/${proj.id}`}
                      className={`w-full py-2.5 font-semibold rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all ${
                        isEvaluated 
                          ? "border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                          : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                      }`}
                    >
                      {isEvaluated ? "Edit Evaluation" : "Grade Submission"}
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  ExternalLink, 
  Code, 
  Cpu, 
  Paintbrush, 
  Lightbulb, 
  CheckCircle2, 
  Loader2,
  FileText
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Props = {
  params: Promise<{
    hackathon_id: string;
    team_id: string;
  }>;
};

type ProjectDetails = {
  id: string;
  team_name: string;
  repository_url: string;
  is_submitted: boolean;
};

export default function JudgeProjectEvaluation({ params }: Props) {
  const { hackathon_id, team_id } = use(params);
  const router = useRouter();
  
  // Ensure only authorized Judges or Admins can access
  const { user, loading: authLoading } = useAuth(["Judge", "Moderator", "SuperAdmin", "Admin"]);

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Scoring states (1-10 scale)
  const [technicalScore, setTechnicalScore] = useState<number>(7);
  const [designScore, setDesignScore] = useState<number>(7);
  const [innovationScore, setInnovationScore] = useState<number>(7);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!user) return;
    
    // Fetch all submitted projects for this hackathon to extract this specific team's details
    // since we do not have a single project GET endpoint.
    fetch(`/api/hackathons/${hackathon_id}/projects`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load projects list");
        return res.json();
      })
      .then((data) => {
        const found = (data.projects || []).find((p: any) => p.id === team_id);
        if (found) {
          setProject(found);
        } else {
          setErrorMsg("Project submission not found under this hackathon.");
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Failed to load submission details.");
      })
      .finally(() => setLoadingProject(false));
  }, [hackathon_id, team_id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      // POST evaluation scoring schema
      const response = await fetch(`/api/hackathons/${hackathon_id}/evaluations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_id: team_id,
          technical_score: technicalScore,
          design_score: designScore,
          innovation_score: innovationScore,
          feedback: feedback,
        }),
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(errData || "Failed to submit score");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/judge/${hackathon_id}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const averageScore = ((technicalScore + designScore + innovationScore) / 3).toFixed(1);

  if (authLoading || (loadingProject && !errorMsg)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Loading submission metadata...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 relative p-6 md:p-12 overflow-x-hidden pt-28">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[250px] bg-indigo-500/10 dark:bg-indigo-600/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Back and Page Header */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push(`/judge/${hackathon_id}`)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project List
          </button>
          
          <header className="border-b border-slate-200 dark:border-white/5 pb-6">
            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">VIP Assessment Panel</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              Evaluate Project
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Review code repository resources and submit feedback scoring matrices.
            </p>
          </header>
        </div>

        {errorMsg ? (
          <div className="glass border border-red-500/20 bg-red-500/5 rounded-2xl p-6 text-center">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">Error Occurred</h3>
            <p className="text-sm text-red-500/90 mt-2">{errorMsg}</p>
            <button
              onClick={() => router.push(`/judge/${hackathon_id}`)}
              className="mt-4 px-5 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 rounded-xl text-xs font-semibold transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Repository Link & Project details */}
            <div className="lg:col-span-5 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Team Name</h3>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {project?.team_name || "Unknown Team"}
                  </h2>
                </div>

                <div className="border-t border-slate-200/50 dark:border-white/5 pt-5 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Workspace Deliverables</h3>
                    {project?.repository_url ? (
                      <div className="space-y-3">
                        <a 
                          href={project.repository_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                              <Code className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Repository Link</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] sm:max-w-none">
                                {project.repository_url}
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        No repository URL provided.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Rules & Guidelines</h3>
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-left space-y-2">
                      <p>• Grade teams on a strict scale from 1 (poor) to 10 (outstanding).</p>
                      <p>• Provide constructive feedback to explain evaluation choices.</p>
                      <p>• Make sure to inspect the codebase for security credentials leak, performance optimization, and robust project structures.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Scoring Form */}
            <div className="lg:col-span-7">
              <motion.form 
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 space-y-8 text-left"
              >
                
                {/* Score Summary Metrics */}
                <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <div>
                    <h4 className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Evaluation Summary</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Calculated average rating</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                      {averageScore}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold"> / 10</span>
                  </div>
                </div>

                {/* Score Criteria 1: Technical Implementation */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      Technical Execution
                    </label>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{technicalScore} / 10</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    How complex, secure, optimized, and robust is the technical integration? Is the codebase high performance and scalable?
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={technicalScore}
                    onChange={(e) => setTechnicalScore(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                    <span>1 (Poor)</span>
                    <span>5 (Average)</span>
                    <span>10 (Excellent)</span>
                  </div>
                </div>

                {/* Score Criteria 2: UX & Design */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <Paintbrush className="w-4 h-4 text-purple-500" />
                      Design & UX
                    </label>
                    <span className="text-sm font-black text-purple-600 dark:text-purple-400">{designScore} / 10</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Is the user interface premium, fast-loading, beautiful, responsive, and intuitive? Are micro-animations and accessibility features done correctly?
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={designScore}
                    onChange={(e) => setDesignScore(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                    <span>1 (Poor)</span>
                    <span>5 (Average)</span>
                    <span>10 (Excellent)</span>
                  </div>
                </div>

                {/* Score Criteria 3: Innovation */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Innovation & Creativity
                    </label>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">{innovationScore} / 10</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    How original is the concept? Does it solve a real-world problem in an ingenious or highly creative way?
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={innovationScore}
                    onChange={(e) => setInnovationScore(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                    <span>1 (Poor)</span>
                    <span>5 (Average)</span>
                    <span>10 (Excellent)</span>
                  </div>
                </div>

                {/* Criteria 4: Written Feedback */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Feedback & Comments
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Write constructive feedback notes to help the hackers identify code flaws, UX bottlenecks, or future expansion ideas.
                  </p>
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    required
                    placeholder="Describe what stood out, areas of security improvement, styling critiques, or general project evaluation notes..."
                    className="w-full p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Submission State */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => router.push(`/judge/${hackathon_id}`)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || success}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saved Successfully
                      </>
                    ) : (
                      "Submit Scorecard"
                    )}
                  </button>
                </div>

              </motion.form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

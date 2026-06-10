"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  LayoutDashboard, 
  Users, 
  Activity, 
  FolderGit2, 
  ShieldAlert, 
  Send, 
  CheckCircle, 
  XCircle,
  Mail,
  UserPlus,
  FileEdit,
  Plus,
  Trash2,
  Save,
  Layers,
  DollarSign,
  Trophy,
  Calendar,
  BookOpen,
  Medal,
  Star,
  Play,
  Coffee,
  Clock,
  Terminal,
  UserCheck,
  Code,
  Upload,
  Download,
  X,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { parseSchedule, parsePrizes, parseRounds, parseMarkdownForHackathon } from "@/app/host/page";
import type { DaySchedule, PrizeEntry, RoundEntry } from "@/app/host/page";

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type Application = {
  id: string;
  user_id: string;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  skills: string;
  team_preference: string;
  approval_status: string;
  user_name: string;
  user_email: string;
};

type TeamSubmission = {
  id: string;
  team_name: string;
  repository_url: string;
  is_submitted: boolean;
};

// --- Helper to convert ISO dates to datetime-local format ---
const formatForDateTimeLocal = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
};

// --- Tilt Card Component ---
function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const maxRotate = 6;
    const rotX = ((y - centerY) / centerY) * -maxRotate;
    const rotY = ((x - centerX) / centerX) * maxRotate;
    
    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div style={{ perspective: 1000 }} className={className}>
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full transform-gpu"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// --- Schedule Preview Timelines ---
function getActivityIcon(activity: string) {
  const act = activity.toLowerCase();
  if (act.includes("register") || act.includes("check-in") || act.includes("checkin")) {
    return <UserCheck className="w-4 h-4 text-emerald-500" />;
  }
  if (act.includes("kickoff") || act.includes("opening") || act.includes("start") || act.includes("welcome")) {
    return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
  }
  if (act.includes("hack") || act.includes("code") || act.includes("build") || act.includes("work")) {
    return <Code className="w-4 h-4 text-cyan-500" />;
  }
  if (act.includes("lunch") || act.includes("dinner") || act.includes("breakfast") || act.includes("food") || act.includes("meal") || act.includes("snack") || act.includes("coffee") || act.includes("tea")) {
    return <Coffee className="w-4 h-4 text-amber-500" />;
  }
  if (act.includes("submit") || act.includes("submission") || act.includes("deadline")) {
    return <Clock className="w-4 h-4 text-rose-500" />;
  }
  if (act.includes("pitch") || act.includes("present") || act.includes("demo") || act.includes("judg")) {
    return <Terminal className="w-4 h-4 text-purple-500" />;
  }
  if (act.includes("award") || act.includes("closing") || act.includes("winner") || act.includes("trophy") || act.includes("result")) {
    return <Trophy className="w-4 h-4 text-yellow-500 animate-bounce" />;
  }
  if (act.includes("team") || act.includes("match") || act.includes("social") || act.includes("networking")) {
    return <Users className="w-4 h-4 text-indigo-500" />;
  }
  return <Activity className="w-4 h-4 text-slate-400" />;
}

function getActivityColors(activity: string) {
  const act = activity.toLowerCase();
  if (act.includes("register") || act.includes("check-in") || act.includes("checkin")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/5",
      border: "border-emerald-500/20 group-hover:border-emerald-500/50",
      iconBg: "bg-emerald-500/15 text-emerald-500",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
      lineColor: "bg-emerald-500"
    };
  }
  if (act.includes("kickoff") || act.includes("opening") || act.includes("start") || act.includes("welcome")) {
    return {
      bg: "bg-blue-500/10 dark:bg-blue-500/5",
      border: "border-blue-500/20 group-hover:border-blue-500/50",
      iconBg: "bg-blue-500/15 text-blue-500",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
      lineColor: "bg-blue-500"
    };
  }
  if (act.includes("hack") || act.includes("code") || act.includes("build") || act.includes("work")) {
    return {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/5",
      border: "border-cyan-500/20 group-hover:border-cyan-500/50",
      iconBg: "bg-cyan-500/15 text-cyan-500",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.15)]",
      lineColor: "bg-cyan-500"
    };
  }
  if (act.includes("lunch") || act.includes("dinner") || act.includes("breakfast") || act.includes("food") || act.includes("meal") || act.includes("snack") || act.includes("coffee") || act.includes("tea")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/5",
      border: "border-amber-500/20 group-hover:border-amber-500/50",
      iconBg: "bg-amber-500/15 text-amber-500",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
      lineColor: "bg-amber-500"
    };
  }
  if (act.includes("submit") || act.includes("submission") || act.includes("deadline")) {
    return {
      bg: "bg-rose-500/10 dark:bg-rose-500/5",
      border: "border-rose-500/20 group-hover:border-rose-500/50",
      iconBg: "bg-rose-500/15 text-rose-500",
      glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      lineColor: "bg-rose-500"
    };
  }
  if (act.includes("pitch") || act.includes("present") || act.includes("demo") || act.includes("judg")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-500/5",
      border: "border-purple-500/20 group-hover:border-purple-500/50",
      iconBg: "bg-purple-500/15 text-purple-500",
      glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
      lineColor: "bg-purple-500"
    };
  }
  if (act.includes("award") || act.includes("closing") || act.includes("winner") || act.includes("trophy") || act.includes("result")) {
    return {
      bg: "bg-yellow-500/10 dark:bg-yellow-500/5",
      border: "border-yellow-500/20 group-hover:border-yellow-500/50",
      iconBg: "bg-yellow-500/15 text-yellow-500",
      glow: "shadow-[0_0_15px_rgba(234,179,8,0.2)]",
      lineColor: "bg-yellow-500"
    };
  }
  if (act.includes("team") || act.includes("match") || act.includes("social") || act.includes("networking")) {
    return {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/5",
      border: "border-indigo-500/20 group-hover:border-indigo-500/50",
      iconBg: "bg-indigo-500/15 text-indigo-500",
      glow: "shadow-[0_0_15px_rgba(99,102,241,0.15)]",
      lineColor: "bg-indigo-500"
    };
  }
  return {
    bg: "bg-slate-500/10 dark:bg-white/5",
    border: "border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20",
    iconBg: "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400",
    glow: "shadow-none",
    lineColor: "bg-slate-300 dark:bg-white/20"
  };
}

function SchedulePreview({ schedule }: { schedule: DaySchedule[] }) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  if (schedule.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 text-xs italic text-center py-6 bg-slate-500/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
        No schedule parsed yet. Type in standard format to preview timeline.
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-100/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 mt-3">
      <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-white/5 relative shadow-inner overflow-x-auto gap-1">
        {schedule.map((day, idx) => (
          <button
            key={day.dayTitle}
            type="button"
            onClick={() => setActiveDayIdx(idx)}
            className={`flex-1 py-1.5 px-3.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider relative transition-all duration-300 cursor-pointer min-w-[100px] text-center ${
              activeDayIdx === idx 
                ? "text-slate-900 dark:text-white bg-white dark:bg-slate-800 shadow-sm border border-slate-200/40 dark:border-white/5" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 bg-transparent"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 opacity-60" />
              {day.dayTitle}
            </span>
          </button>
        ))}
      </div>

      <div className="relative pl-7 border-l-2 border-slate-200/60 dark:border-white/10 ml-3.5 space-y-5 py-2">
        <div className="absolute top-0 bottom-0 left-[-2px] w-[2px] bg-gradient-to-b from-blue-500 to-indigo-500 rounded pointer-events-none opacity-40" />

        {schedule[activeDayIdx]?.items.map((item, itemIdx) => {
          const colors = getActivityColors(item.activity);
          return (
            <div key={itemIdx} className="relative group">
              <div className="absolute -left-[40px] top-[12px] w-5 h-5 rounded-full bg-background border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all duration-300 z-10 shadow-sm">
                <span className={`w-1.5 h-1.5 rounded-full ${colors.lineColor} relative flex`} />
              </div>
              <div className={`flex items-center gap-4 bg-white dark:bg-slate-900/30 border border-slate-200/60 dark:border-white/5 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-sm ${colors.glow}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.iconBg} shrink-0`}>
                  {getActivityIcon(item.activity)}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full">
                  <span className="text-slate-700 dark:text-slate-200 text-xs font-bold tracking-wide">
                    {item.activity}
                  </span>
                  {item.time && (
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${colors.bg} ${colors.iconBg.split(" ")[1]} border border-current/10 rounded-md`}>
                      {item.time}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Prizes Preview Cards ---
const PRIZE_RANK_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode; badge: string }> = {
  "1": {
    bg: "bg-gradient-to-br from-yellow-500/20 to-amber-500/10 dark:from-yellow-500/10",
    border: "border-yellow-500/40",
    icon: <Trophy className="w-4 h-4 text-yellow-500" />,
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  "2": {
    bg: "bg-gradient-to-br from-slate-400/20 to-slate-300/10 dark:from-slate-400/10",
    border: "border-slate-400/40",
    icon: <Medal className="w-4 h-4 text-slate-400" />,
    badge: "bg-slate-400/10 text-slate-500 dark:text-slate-300 border-slate-400/20",
  },
  "3": {
    bg: "bg-gradient-to-br from-amber-700/20 to-orange-700/10 dark:from-amber-700/10",
    border: "border-amber-700/40",
    icon: <Medal className="w-4 h-4 text-amber-700" />,
    badge: "bg-amber-700/10 text-amber-700 dark:text-amber-500 border-amber-700/20",
  },
  "default": {
    bg: "bg-gradient-to-br from-blue-500/10 to-indigo-500/5",
    border: "border-blue-500/20",
    icon: <Star className="w-4 h-4 text-blue-500" />,
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
};

function getPrizeStyle(rank: string) {
  if (/1st|first|gold|grand|🥇/i.test(rank)) return PRIZE_RANK_STYLES["1"];
  if (/2nd|second|silver|🥈/i.test(rank)) return PRIZE_RANK_STYLES["2"];
  if (/3rd|third|bronze|🥉/i.test(rank)) return PRIZE_RANK_STYLES["3"];
  return PRIZE_RANK_STYLES["default"];
}

function PrizesPreview({ prizes }: { prizes: PrizeEntry[] }) {
  if (prizes.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 text-xs italic text-center py-6 bg-slate-500/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
        No prizes parsed yet. Type in standard format to preview rewards.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-100/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 mt-3">
      {prizes.map((prize, i) => {
        const style = getPrizeStyle(prize.rank);
        return (
          <div
            key={i}
            className={`relative p-4 rounded-xl border ${style.bg} ${style.border} shadow-sm transition-all duration-300 hover:scale-[1.02] cursor-default overflow-hidden`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${style.badge} shrink-0`}>
                {style.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${style.badge} inline-block`}>
                  {prize.label}
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white leading-tight break-words">
                  {prize.amount}
                </p>
                {prize.detail && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                    {prize.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrganizerDashboard({ params }: Props) {
  const { hackathon_id } = use(params);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "applications" | "staff" | "broadcasts" | "submissions">("overview");
  const [eventTitle, setEventTitle] = useState("Hackathon Management Workspace");
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [prizes, setPrizes] = useState<PrizeEntry[]>([]);

  // Data states
  const [applications, setApplications] = useState<Application[]>([]);
  const [submissions, setSubmissions] = useState<TeamSubmission[]>([]);
  const [stats, setStats] = useState({ pending: 0, accepted: 0, teams: 0, submissions: 0 });

  // Profile modal states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const viewProfile = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingProfile(true);
    try {
      const res = await fetchApi<any>(`/users/${userId}/profile`);
      setSelectedProfile(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Action states
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("Mentor");
  const [staffMsg, setStaffMsg] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState("");

  // Event Details Form States
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [titleVal, setTitleVal] = useState("");
  const [coverImageVal, setCoverImageVal] = useState("");
  const [startDateVal, setStartDateVal] = useState("");
  const [endDateVal, setEndDateVal] = useState("");
  const [descriptionVal, setDescriptionVal] = useState("");
  const [problemStatementVal, setProblemStatementVal] = useState("");
  const [prizesVal, setPrizesVal] = useState("");
  const [scheduleVal, setScheduleVal] = useState("");
  const [sponsorsVal, setSponsorsVal] = useState("");
  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [registrationFee, setRegistrationFee] = useState("Free");
  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [tracks, setTracks] = useState<string[]>([]);
  const [customTrackInput, setCustomTrackInput] = useState("");

  // Markdown Importer States
  const [mdInput, setMdInput] = useState("");
  const [showMdPaste, setShowMdPaste] = useState(false);

  const PRESET_TRACKS = ["AI", "Web3", "Blockchain", "Mobile", "Design", "Hardware", "AR/VR", "Cybersecurity", "Cloud", "IoT", "Fintech", "HealthTech", "EdTech", "Open Source"];

  const handleTrackToggle = (track: string) => {
    if (tracks.includes(track)) {
      setTracks(tracks.filter((t) => t !== track));
    } else {
      setTracks([...tracks, track]);
    }
  };

  const addCustomTrack = () => {
    const trimmed = customTrackInput.trim();
    if (!trimmed) return;
    if (!tracks.includes(trimmed)) {
      setTracks([...tracks, trimmed]);
    }
    setCustomTrackInput("");
  };

  const removeTrack = (track: string) => {
    setTracks(tracks.filter((t) => t !== track));
  };

  const applyParsedData = (data: any) => {
    if (data.title) setTitleVal(data.title);
    if (data.description) setDescriptionVal(data.description);
    if (data.problem_statement) setProblemStatementVal(data.problem_statement);
    if (data.sponsors) setSponsorsVal(data.sponsors);
    if (data.registration_fee) setRegistrationFee(data.registration_fee);
    if (data.min_team_size) setMinTeamSize(data.min_team_size);
    if (data.max_team_size) setMaxTeamSize(data.max_team_size);
    if (data.tracks && data.tracks.length > 0) setTracks(data.tracks);
    if (data.roundsList) setRounds(data.roundsList);

    if (data.prizesList && data.prizesList.length > 0) {
      setPrizes(data.prizesList);
      const formattedPrizes = data.prizesList.map((prize: any) => {
        let line = `${prize.rank}: ${prize.amount}`;
        if (prize.detail) line += ` - ${prize.detail}`;
        return line;
      }).join("\n");
      setPrizesVal(formattedPrizes);
    }

    if (data.scheduleDays && data.scheduleDays.length > 0) {
      setSchedule(data.scheduleDays);
      const formattedSchedule = data.scheduleDays.map((day: any) => {
        const itemsStr = day.items.map((item: any) => `- ${item.time} : ${item.activity}`).join("\n");
        return `📅 ${day.dayTitle}:\n${itemsStr}`;
      }).join("\n\n");
      setScheduleVal(formattedSchedule);
    }
  };

  const handleMdPasteSubmit = () => {
    if (!mdInput.trim()) return;
    const parsed = parseMarkdownForHackathon(mdInput);
    applyParsedData(parsed);
    setShowMdPaste(false);
    setMdInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseMarkdownForHackathon(content);
        applyParsedData(parsed);
      }
    };
    reader.readAsText(file);
  };

  function serializeRoundsToText(rs: RoundEntry[]): string {
    return rs.map((r, i) => {
      let line = `Round ${i + 1}: ${r.title}`;
      if (r.duration) line += ` – ${r.duration}`;
      if (r.type || r.description) {
        const desc = [r.type, r.description].filter(Boolean).join(": ");
        line += `\n${desc}`;
      }
      return line;
    }).join("\n\n");
  }

  const fetchData = async () => {
    try {
      const ev = await fetch(`/api/hackathons/${hackathon_id}`).then((r) => r.ok ? r.json() : null);
      if (ev) {
        setEventTitle(ev.title);
        setTitleVal(ev.title || "");
        setCoverImageVal(ev.cover_image || "");
        setStartDateVal(formatForDateTimeLocal(ev.start_date));
        setEndDateVal(formatForDateTimeLocal(ev.end_date));
        setDescriptionVal(ev.description || "");
        setProblemStatementVal(ev.problem_statement || "");
        setSchedule(parseSchedule(ev.schedule || ""));
        setPrizes(parsePrizes(ev.prizes || ""));
        setPrizesVal(ev.prizes || "");
        setScheduleVal(ev.schedule || "");
        setSponsorsVal(ev.sponsors || "");
        setMinTeamSize(ev.min_team_size || 1);
        setMaxTeamSize(ev.max_team_size || 4);
        setRegistrationFee(ev.registration_fee || "Free");
        if (ev.rounds) {
          try { setRounds(parseRounds(ev.rounds)); } catch { setRounds([]); }
        }
        let tracksList: string[] = [];
        if (ev.tracks) {
          try { tracksList = JSON.parse(ev.tracks); } catch { tracksList = []; }
        }
        setTracks(tracksList);
      }
      const apps = await fetch(`/api/hackathons/${hackathon_id}/applications`).then((r) => r.ok ? r.json() : []);
      setApplications(apps);
      const subs = await fetch(`/api/hackathons/${hackathon_id}/submissions`).then((r) => r.ok ? r.json() : []);
      setSubmissions(subs);
      setStats({
        pending: apps.filter((a: any) => a.approval_status === "Pending").length,
        accepted: apps.filter((a: any) => a.approval_status === "Accepted").length,
        teams: subs.length,
        submissions: subs.filter((s: any) => s.is_submitted).length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [hackathon_id]);

  const handleUpdateStatus = async (regID: string, status: "Accepted" | "Rejected") => {
    try {
      await fetchApi(`/registrations/${regID}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      await fetchData();
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim()) return;
    setStaffMsg("");
    try {
      const res = await fetch(`/api/hackathons/${hackathon_id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: staffEmail.trim(), role: staffRole }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to invite staff member");
      }
      setStaffMsg("Staff assigned successfully!");
      setStaffEmail("");
    } catch (err: any) { setStaffMsg(`Error: ${err.message || "Failed"}`); }
  };

  const handleSendBroadcast = async () => {
    setConfirmBroadcastOpen(false);
    setBroadcastStatus("sending");
    try {
      await fetch(`/api/hackathons/${hackathon_id}/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMsg }),
      });
      setBroadcastStatus("success");
      setBroadcastMsg("");
      setTimeout(() => setBroadcastStatus(""), 2000);
    } catch (err: any) { setBroadcastStatus(`Error: ${err.message || "Failed"}`); }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsSaved(false);
    setDetailsError("");
    try {
      const res = await fetch(`/api/hackathons/${hackathon_id}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleVal,
          tracks: JSON.stringify(tracks),
          cover_image: coverImageVal,
          start_date: startDateVal ? new Date(startDateVal).toISOString() : null,
          end_date: endDateVal ? new Date(endDateVal).toISOString() : null,
          description: descriptionVal,
          problem_statement: problemStatementVal,
          prizes: prizesVal,
          schedule: scheduleVal,
          sponsors: sponsorsVal,
          min_team_size: minTeamSize,
          max_team_size: maxTeamSize,
          registration_fee: registrationFee,
          rounds: serializeRoundsToText(rounds),
        }),
      });
      if (!res.ok) throw new Error("Failed to save event details");
      setDetailsSaved(true);
      setEventTitle(titleVal);
      setTimeout(() => setDetailsSaved(false), 3000);
    } catch (err: any) {
      setDetailsError(err.message || "An error occurred");
    } finally {
      setDetailsLoading(false);
    }
  };

  const addRound = () => setRounds([...rounds, { title: `Round ${rounds.length + 1}`, type: "Online", description: "", duration: "" }]);
  const removeRound = (i: number) => setRounds(rounds.filter((_, idx) => idx !== i));
  const updateRound = (i: number, field: keyof RoundEntry, value: string) => {
    setRounds(rounds.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tabLinks = [
    { id: "overview" as const, name: "Overview", icon: LayoutDashboard },
    { id: "details" as const, name: "Event Details", icon: FileEdit },
    { id: "applications" as const, name: "Applications", icon: Users },
    { id: "staff" as const, name: "Event Staff", icon: UserPlus },
    { id: "broadcasts" as const, name: "Broadcasts", icon: Activity },
    { id: "submissions" as const, name: "Submissions", icon: FolderGit2 },
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Premium Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200/60 dark:border-white/10 pb-6 gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest block font-mono">Workspace Organizer Console</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            {eventTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Configure event info, review registrants, handle communications, and manage submissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/workspace/${hackathon_id}`}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold transition-all"
          >
            Hacker Dashboard
          </Link>
        </div>
      </div>

      {/* Horizontal Nav Bar */}
      <div className="flex bg-slate-100/60 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 relative shadow-inner overflow-x-auto gap-1">
        {tabLinks.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider relative transition-all duration-300 cursor-pointer min-w-[120px] text-center justify-center shrink-0 ${
                isActive 
                  ? "text-white bg-blue-600 shadow-md shadow-blue-500/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 bg-transparent"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            
            {/* ─── OVERVIEW ─── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: "Pending Reviews", val: stats.pending, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
                    { title: "Accepted Hackers", val: stats.accepted, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
                    { title: "Formed Teams", val: stats.teams, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
                    { title: "Submitted Projects", val: stats.submissions, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
                  ].map((card) => (
                    <div key={card.title} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-mono">{card.title}</span>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${card.color}`}>#</div>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{card.val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-white/10 pb-2">Quick Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => setActiveTab("details")} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-blue-500/30 rounded-xl text-left transition-all group">
                        <FileEdit className="w-5 h-5 text-blue-500 mb-2" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Event Details</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Edit schedule, rounds, and prizes.</p>
                      </button>
                      <button onClick={() => setActiveTab("applications")} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 rounded-xl text-left transition-all group">
                        <Users className="w-5 h-5 text-emerald-500 mb-2" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Review Hackers</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Accept or reject applicants.</p>
                      </button>
                      <button onClick={() => setActiveTab("broadcasts")} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-purple-500/30 rounded-xl text-left transition-all group">
                        <Activity className="w-5 h-5 text-purple-500 mb-2" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Broadcast Announcement</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Notify all registered hackers.</p>
                      </button>
                      <button onClick={() => setActiveTab("staff")} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 rounded-xl text-left transition-all group">
                        <UserPlus className="w-5 h-5 text-indigo-500 mb-2" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Assign Staff</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Invite judges or mentors.</p>
                      </button>
                    </div>
                  </div>

                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-white/10 pb-2">Hacker Status Pool</h3>
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          <span>Review Progress</span>
                          <span>{applications.length ? Math.round(((applications.length - stats.pending) / applications.length) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${applications.length ? ((applications.length - stats.pending) / applications.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold font-mono">
                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
                          <span className="text-slate-500 block uppercase">Pending</span>
                          <span className="text-base text-amber-500 block mt-1">{stats.pending}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
                          <span className="text-slate-500 block uppercase">Accepted</span>
                          <span className="text-base text-emerald-500 block mt-1">{stats.accepted}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
                          <span className="text-slate-500 block uppercase">Total Apps</span>
                          <span className="text-base text-slate-800 dark:text-white block mt-1">{applications.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── EVENT DETAILS ─── */}
            {activeTab === "details" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                
                {/* Markdown Import Panel */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 dark:border-white/10 pb-4 gap-4">
                  <div className="text-left">
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-500" /> Auto-fill Manager
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Paste or upload a Markdown outline structure to auto-fill all form configurations instantly.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMdPaste(!showMdPaste)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {showMdPaste ? "Hide Markdown Drawer" : "Paste Markdown"}
                    </button>
                    <label className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload .md
                      <input
                        type="file"
                        accept=".md,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <a
                      href="/sample_hackathon.md"
                      download="sample_hackathon.md"
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Sample
                    </a>
                  </div>
                </div>

                {showMdPaste && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-5 rounded-2xl glass border border-blue-500/20 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 font-mono">
                        Paste Markdown Outline
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          fetch("/sample_hackathon.md")
                            .then((r) => r.text())
                            .then((text) => setMdInput(text));
                        }}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                      >
                        Load Sample Content
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Supported Sections</p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { tag: "# Title", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
                          { tag: "## Description", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
                          { tag: "## Problem Statement", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
                          { tag: "## Tracks", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
                          { tag: "## Prizes", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
                          { tag: "## Rounds", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
                          { tag: "## Schedule", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
                          { tag: "## Sponsors", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
                        ].map(({ tag, color }) => (
                          <span key={tag} className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black font-mono ${color}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      value={mdInput}
                      onChange={(e) => setMdInput(e.target.value)}
                      placeholder="# Hackathon Title\n\n## Description\nExplain hackathon details here..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono leading-relaxed"
                    />

                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 font-mono">{mdInput.length} characters</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMdInput("");
                            setShowMdPaste(false);
                          }}
                          className="px-3 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleMdPasteSubmit}
                          disabled={!mdInput.trim()}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 disabled:opacity-45 transition-all cursor-pointer flex items-center gap-1"
                        >
                          Parse & Auto-fill
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSaveDetails} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Descriptions, Schedule, Prizes, Rounds */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Basic Info */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                        <FileEdit className="w-4 h-4 text-blue-500" /> Event Details
                      </h2>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Event Title <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={titleVal}
                          onChange={(e) => setTitleVal(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Event Description <span className="text-rose-500">*</span></label>
                        <textarea
                          rows={4}
                          required
                          value={descriptionVal}
                          onChange={(e) => setDescriptionVal(e.target.value)}
                          placeholder="Describe your hackathon in detail..."
                          className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-y min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Problem Statement</label>
                        <textarea
                          rows={4}
                          value={problemStatementVal}
                          onChange={(e) => setProblemStatementVal(e.target.value)}
                          placeholder="Describe the core challenges and guidelines..."
                          className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-y font-mono"
                        />
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-500" /> Event Schedule
                        </h2>
                        <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-500/5 px-2 py-0.5 border border-slate-700/25 rounded">Timeline Parser</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Format: <code className="text-emerald-500 bg-emerald-500/10 px-1 rounded">📅 Day 1:</code> then <code className="text-emerald-500 bg-emerald-500/10 px-1 rounded">- 09:00 AM : Activity</code>
                      </p>
                      <textarea
                        rows={8}
                        value={scheduleVal}
                        onChange={(e) => {
                          setScheduleVal(e.target.value);
                          setSchedule(parseSchedule(e.target.value));
                        }}
                        placeholder={"📅 Day 1:\n- 09:00 AM : Opening Ceremony\n- 10:00 AM : Hacking Begins"}
                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-y font-mono"
                      />
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Live Preview Timeline:</span>
                        <SchedulePreview schedule={schedule} />
                      </div>
                    </div>

                    {/* Prizes */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-500" /> Prizes &amp; Rewards
                        </h2>
                        <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-500/5 px-2 py-0.5 border border-slate-700/25 rounded">Prizes Parser</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Format: <code className="text-blue-500 bg-blue-500/10 px-1 rounded">1st Place: $5,000 USD - Best innovation award</code>
                      </p>
                      <textarea
                        rows={6}
                        value={prizesVal}
                        onChange={(e) => {
                          setPrizesVal(e.target.value);
                          setPrizes(parsePrizes(e.target.value));
                        }}
                        placeholder={"1st Place: $5,000 USD\n2nd Place: $2,500 USD"}
                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-y font-mono"
                      />
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Live Preview Rewards:</span>
                        <PrizesPreview prizes={prizes} />
                      </div>
                    </div>

                    {/* Competition Rounds */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-500" />
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Competition Rounds</h2>
                        </div>
                        <button
                          type="button"
                          onClick={addRound}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Round
                        </button>
                      </div>

                      {rounds.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-transparent">
                          <Layers className="w-8 h-8 opacity-30" />
                          <p className="text-xs font-semibold">No rounds configured.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {rounds.map((round, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="relative bg-slate-50/60 dark:bg-white/3 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 font-mono">
                                  Round {i + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeRound(i)}
                                  className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Round Title *</label>
                                  <input
                                    type="text"
                                    value={round.title}
                                    onChange={(e) => updateRound(i, "title", e.target.value)}
                                    placeholder="e.g. Idea Submission"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Format / Type</label>
                                  <select
                                    value={round.type}
                                    onChange={(e) => updateRound(i, "type", e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                                  >
                                    <option value="Online">Online</option>
                                    <option value="Virtual">Virtual</option>
                                    <option value="In-Person">In-Person</option>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="Shortlisting">Shortlisting</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Presentation">Presentation</option>
                                    <option value="Judging">Judging</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Duration</label>
                                  <input
                                    type="text"
                                    value={round.duration}
                                    onChange={(e) => updateRound(i, "duration", e.target.value)}
                                    placeholder="e.g. 48 hours"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Description</label>
                                  <input
                                    type="text"
                                    value={round.description}
                                    onChange={(e) => updateRound(i, "description", e.target.value)}
                                    placeholder="Brief description..."
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Parameters, Cover Image, Logistics, Tracks */}
                  <div className="space-y-6">
                    
                    {/* Event Timeline (Start & End Dates) */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                        <Calendar className="w-4 h-4 text-blue-500" /> Event Timeline
                      </h2>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Start Date <span className="text-rose-500">*</span></label>
                        <input
                          type="datetime-local"
                          required
                          value={startDateVal}
                          onChange={(e) => setStartDateVal(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">End Date <span className="text-rose-500">*</span></label>
                        <input
                          type="datetime-local"
                          required
                          value={endDateVal}
                          onChange={(e) => setEndDateVal(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Cover Image & Logistics */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> Parameters &amp; Fee
                      </h2>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cover Image URL</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo..."
                          value={coverImageVal}
                          onChange={(e) => setCoverImageVal(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Registration Fee</label>
                        <input
                          type="text"
                          placeholder="Free / $10 USD"
                          value={registrationFee}
                          onChange={(e) => setRegistrationFee(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Min Team</label>
                          <input
                            type="number"
                            min={1}
                            value={minTeamSize}
                            onChange={(e) => setMinTeamSize(Number(e.target.value))}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Max Team</label>
                          <input
                            type="number"
                            min={1}
                            value={maxTeamSize}
                            onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sponsors (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="Google, GitHub, Microsoft"
                          value={sponsorsVal}
                          onChange={(e) => setSponsorsVal(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Technology Tracks (Exact Replicated Chip System) */}
                    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                        <Layers className="w-4 h-4 text-blue-500" /> Technology Tracks
                      </h2>

                      {/* Custom Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type track & press Add..."
                          value={customTrackInput}
                          onChange={(e) => setCustomTrackInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTrack(); } }}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={addCustomTrack}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>

                      {/* Selected Tracks removable chips */}
                      {tracks.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tracks.map((track) => (
                            <span
                              key={track}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 text-[10px] font-black uppercase tracking-wide font-mono"
                            >
                              {track}
                              <button
                                type="button"
                                onClick={() => removeTrack(track)}
                                className="text-blue-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quick preset suggestions */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Quick Add Presets</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_TRACKS.filter((t) => !tracks.includes(t)).map((track) => (
                            <button
                              key={track}
                              type="button"
                              onClick={() => handleTrackToggle(track)}
                              className="px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer"
                            >
                              + {track}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Details Submit Panel */}
                    <div className="space-y-4">
                      {detailsError && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold leading-relaxed">
                          {detailsError}
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={detailsLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full py-4 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-lg transition-all ${
                          detailsSaved
                            ? "bg-emerald-600 text-white shadow-emerald-600/25 border border-emerald-500/25"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                        } disabled:opacity-60`}
                      >
                        {detailsLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...</>
                        ) : detailsSaved ? (
                          <><CheckCircle className="w-4 h-4" /> Saved Successfully!</>
                        ) : (
                          <><Save className="w-4 h-4" /> Save All Event Settings</>
                        )}
                      </motion.button>
                    </div>

                  </div>
                </form>
              </div>
            )}

            {/* ─── APPLICATIONS ─── */}
            {activeTab === "applications" && (
              <div className="space-y-6">
                <header>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Hacker Applications</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Review applicant profiles and allocate statuses.</p>
                </header>
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200/60 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                        <th className="py-4 px-5">Name</th>
                        <th className="py-4 px-5">Links</th>
                        <th className="py-4 px-5">Skills</th>
                        <th className="py-4 px-5">Track Preference</th>
                        <th className="py-4 px-5">Status</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-200/40 dark:divide-white/5 font-semibold text-slate-800 dark:text-slate-200">
                      {applications.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hacker applications found.</td></tr>
                      ) : (
                        applications.map((app) => {
                          let skillsArr: string[] = [];
                          try { skillsArr = JSON.parse(app.skills); } catch(e) {}
                          return (
                            <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                              <td className="py-4.5 px-5">
                                <span 
                                  className="font-extrabold text-slate-900 dark:text-white block text-sm hover:text-blue-500 cursor-pointer transition-colors"
                                  onClick={() => viewProfile(app.user_id)}
                                >
                                  {app.user_name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{app.user_email}</span>
                              </td>
                              <td className="py-4.5 px-5 space-y-1">
                                {app.github_url ? (
                                  <a href={app.github_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono">
                                    GitHub ↗
                                  </a>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">No GitHub</span>
                                )}
                                {app.linkedin_url ? (
                                  <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono">
                                    LinkedIn ↗
                                  </a>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">No LinkedIn</span>
                                )}
                                {app.resume_url ? (
                                  <a href={app.resume_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono">
                                    Resume ↗
                                  </a>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">No Resume</span>
                                )}
                              </td>
                              <td className="py-4.5 px-5">
                                <div className="flex flex-wrap gap-1">
                                  {skillsArr.slice(0, 3).map((s) => (
                                    <span key={s} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[9px] text-slate-600 dark:text-slate-300 font-mono">{s}</span>
                                  ))}
                                  {skillsArr.length > 3 && <span className="text-[9px] text-slate-400 font-mono">+{skillsArr.length - 3}</span>}
                                </div>
                              </td>
                              <td className="py-4.5 px-5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{app.team_preference}</td>
                              <td className="py-4.5 px-5">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border font-mono ${
                                  app.approval_status === "Accepted" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                                  app.approval_status === "Rejected" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" :
                                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}>{app.approval_status}</span>
                              </td>
                              <td className="py-4.5 px-5 text-right">
                                {app.approval_status === "Pending" ? (
                                  <div className="inline-flex gap-2">
                                    <button onClick={() => handleUpdateStatus(app.id, "Accepted")} className="p-1 text-emerald-500 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/20 rounded-lg cursor-pointer transition-all" title="Accept">
                                      <CheckCircle className="w-4.5 h-4.5" />
                                    </button>
                                    <button onClick={() => handleUpdateStatus(app.id, "Rejected")} className="p-1 text-rose-500 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/20 rounded-lg cursor-pointer transition-all" title="Reject">
                                      <XCircle className="w-4.5 h-4.5" />
                                    </button>
                                  </div>
                                ) : <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">-</span>}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── STAFF ─── */}
            {activeTab === "staff" && (
              <div className="space-y-6">
                <header>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Event Staff Assignment</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Assign invited users to Mentor or Judge roles for this hackathon.</p>
                </header>
                <form onSubmit={handleInviteStaff} className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 max-w-md space-y-4">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add Staff Member</h2>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Email Address</label>
                    <input type="email" required placeholder="staff@hackathon.com" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="w-full px-3.5 py-2.5 bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Role Assign</label>
                    <div className="flex gap-2">
                      {["Mentor", "Judge"].map((r) => (
                        <button key={r} type="button" onClick={() => setStaffRole(r)} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${staffRole === r ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  {staffMsg && <div className={`p-3 rounded-xl text-xs font-semibold ${staffMsg.includes("Error") ? "bg-red-500/10 text-red-600 border border-red-500/25" : "bg-green-500/10 text-green-600 border border-green-500/25"}`}>{staffMsg}</div>}
                  <button type="submit" disabled={!staffEmail.trim()} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50 transition-all">Assign Staff Member</button>
                </form>
              </div>
            )}

            {/* ─── BROADCASTS ─── */}
            {activeTab === "broadcasts" && (
              <div className="space-y-6">
                <header>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Live Broadcasts</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Draft announcements and notify all registered hackers instantly.</p>
                </header>
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 max-w-xl space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Announcement message</label>
                    <textarea rows={5} required placeholder="e.g. Submissions close in 1 hour! Get your repository URLs updated." value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} className="w-full p-3.5 bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="push" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} className="rounded border-slate-200 dark:border-white/10 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer" />
                    <label htmlFor="push" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">Send Instant Push Notification Alerts</label>
                  </div>
                  {broadcastStatus && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${broadcastStatus.includes("Error") ? "bg-red-500/10 text-red-600 border border-red-500/25" : broadcastStatus === "success" ? "bg-green-500/10 text-green-600 border border-green-500/25" : "bg-blue-500/10 text-blue-500 border border-blue-500/25"}`}>
                      {broadcastStatus === "sending" ? "Publishing..." : broadcastStatus === "success" ? "Broadcast sent!" : broadcastStatus}
                    </div>
                  )}
                  <button type="button" onClick={() => setConfirmBroadcastOpen(true)} disabled={!broadcastMsg.trim() || broadcastStatus === "sending"} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md transition-all">
                    <Send className="w-3.5 h-3.5" /> Publish Announcement
                  </button>
                </div>
                <AnimatePresence>
                  {confirmBroadcastOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/45 backdrop-blur-sm">
                      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-md w-full glass p-6 rounded-2xl border border-slate-200 dark:border-white/10 text-center space-y-4 shadow-xl">
                        <div className="w-12 h-12 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto text-lg font-black font-mono">!</div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Global Broadcast</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">This message will be sent to all participants in real time. Are you sure you want to broadcast this message to all participants?</p>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => setConfirmBroadcastOpen(false)} className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all">Cancel</button>
                          <button onClick={handleSendBroadcast} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all">Confirm Broadcast</button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ─── SUBMISSIONS ─── */}
            {activeTab === "submissions" && (
              <div className="space-y-6">
                <header>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Submitted Projects</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Review repository submissions and finalize the event judging portal.</p>
                </header>
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200/60 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                        <th className="py-4 px-5">Team Name</th>
                        <th className="py-4 px-5">GitHub Repository</th>
                        <th className="py-4 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-200/40 dark:divide-white/5 font-semibold text-slate-800 dark:text-slate-200">
                      {submissions.length === 0 ? (
                        <tr><td colSpan={3} className="py-8 text-center text-slate-500">No project submissions yet.</td></tr>
                      ) : (
                        submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                            <td className="py-4 px-5 font-extrabold text-slate-900 dark:text-white text-sm">{sub.team_name}</td>
                            <td className="py-4 px-5 font-mono">
                              {sub.repository_url ? (
                                <a href={sub.repository_url} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">{sub.repository_url}</a>
                              ) : <span className="text-slate-400 dark:text-slate-500 italic">No repository URL</span>}
                            </td>
                            <td className="py-4 px-5">
                              <span className={`px-2.5 py-1 border rounded-full text-[9px] font-black uppercase tracking-wider font-mono ${sub.is_submitted ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5"}`}>
                                {sub.is_submitted ? "Submitted" : "Draft"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Public Profile Modal */}
        <AnimatePresence>
          {selectedUserId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSelectedUserId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Applicant Profile</h2>
                  <button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto">
                  {loadingProfile ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : selectedProfile ? (
                    <div className="space-y-6">
                      {/* Links */}
                      <div className="flex flex-wrap gap-4">
                        {selectedProfile.github_url && (
                          <a href={selectedProfile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
                            GitHub
                          </a>
                        )}
                        {selectedProfile.linkedin_url && (
                          <a href={selectedProfile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
                            LinkedIn
                          </a>
                        )}
                        {selectedProfile.resume_url && (
                          <a href={selectedProfile.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Resume
                          </a>
                        )}
                      </div>

                      {/* Bio / Readme */}
                      {selectedProfile.readme_md ? (
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Readme</h3>
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 overflow-y-auto">
                            {selectedProfile.readme_md}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Bio</h3>
                          <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{selectedProfile.bio || "No bio or readme provided."}</p>
                        </div>
                      )}

                      {/* Tech Stack */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Tech Stack</h3>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            let skillsArr: string[] = [];
                            try {
                              if (selectedProfile.skills) {
                                skillsArr = typeof selectedProfile.skills === 'string' ? JSON.parse(selectedProfile.skills) : selectedProfile.skills;
                              }
                            } catch (e) {
                              if (typeof selectedProfile.skills === 'string' && selectedProfile.skills.includes(',')) {
                                skillsArr = selectedProfile.skills.split(',').map((s: string) => s.trim());
                              } else if (selectedProfile.skills) {
                                skillsArr = [selectedProfile.skills];
                              }
                            }
                            if (!Array.isArray(skillsArr) || skillsArr.length === 0) return <p className="text-sm text-slate-500">Not specified</p>;
                            return skillsArr.map((skill, i) => (
                              <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full border border-blue-100 dark:border-blue-800/30">
                                {skill}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Education</h3>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{selectedProfile.institution || "Not specified"}</p>
                          <p className="text-xs text-slate-500">{selectedProfile.degree_type} {selectedProfile.field_of_study}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</h3>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{selectedProfile.city || "Not specified"}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</h3>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{selectedProfile.gender || "Not specified"}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">T-Shirt Size</h3>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{selectedProfile.t_shirt_size || "Not specified"}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Details</h3>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{selectedProfile.phone_number || "No phone number"}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dietary & Allergies</h3>
                          <p className="text-sm text-slate-800 dark:text-slate-200">{selectedProfile.dietary_preference || "None"}</p>
                          <p className="text-xs text-slate-500">{selectedProfile.allergies || "No allergies"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-500">Failed to load profile.</p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

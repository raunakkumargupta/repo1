"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import TeamManagement from "./TeamManagement";

type ScheduleItem = {
  time: string;
  activity: string;
};

type DaySchedule = {
  dayTitle: string;
  items: ScheduleItem[];
};

function parseSchedule(scheduleText: string): DaySchedule[] {
  if (!scheduleText) return [];
  const lines = scheduleText.split("\n");
  const days: DaySchedule[] = [];
  let currentDay: DaySchedule | null = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("📅") || line.toLowerCase().includes("day")) {
      const dayTitle = line.replace("📅", "").trim();
      currentDay = { dayTitle, items: [] };
      days.push(currentDay);
    } else if (line.startsWith("-") && currentDay) {
      const content = line.substring(1).trim();
      const match = content.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[:\s-]\s*(.*)$/);
      if (match) {
        currentDay.items.push({ time: match[1].trim(), activity: match[2].trim() });
      } else {
        const parts = content.split(":");
        if (parts.length >= 2) {
          const time = parts[0].trim();
          const activity = parts.slice(1).join(":").trim();
          currentDay.items.push({ time, activity });
        } else {
          currentDay.items.push({ time: "", activity: content });
        }
      }
    }
  }
  return days;
}

import { 
  Loader2, 
  ArrowRight, 
  ShieldAlert, 
  Calendar, 
  ExternalLink, 
  HelpCircle, 
  Send, 
  Users,
  DollarSign,
  Sparkles,
  Info,
  ChevronLeft,
  Play,
  Coffee,
  Code,
  Trophy,
  Terminal,
  UserCheck,
  Activity,
  Clock,
  Medal,
  Star,
  Layers,
  Award
} from "lucide-react";
import { fetchApi } from "@/lib/api";

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

type EventScheduleProps = {
  scheduleText: string;
  isDashboard?: boolean;
};

export function EventSchedule({ scheduleText, isDashboard = false }: EventScheduleProps) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const days = parseSchedule(scheduleText);

  if (days.length === 0) {
    return (
      <div className="whitespace-pre-line text-slate-600 dark:text-slate-300 text-xs font-semibold leading-relaxed space-y-3 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-slate-100 dark:border-white/5 font-mono">
        {scheduleText}
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.97 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 120,
        damping: 14,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Day Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 relative shadow-inner">
        {days.map((day, idx) => (
          <button
            key={day.dayTitle}
            type="button"
            onClick={() => setActiveDayIdx(idx)}
            className={`flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider relative transition-all duration-300 cursor-pointer z-10 ${
              activeDayIdx === idx 
                ? "text-slate-900 dark:text-white" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
            }`}
          >
            {activeDayIdx === idx && (
              <motion.div
                layoutId={isDashboard ? "dashboardActiveScheduleDay" : "activeScheduleDay"}
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-slate-200/40 dark:border-white/5 z-[-1]"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
            <span className="flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 opacity-60" />
              {day.dayTitle}
            </span>
          </button>
        ))}
      </div>

      {/* Active Day Timeline */}
      <div className="relative pl-8 border-l-2 border-slate-200/60 dark:border-white/10 ml-4.5 space-y-6 py-2">
        {/* Animated accent gradient line overlays the border */}
        <div className="absolute top-0 bottom-0 left-[-2px] w-[2px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded pointer-events-none opacity-40 dark:opacity-60" />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeDayIdx}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            {days[activeDayIdx]?.items.map((item, itemIdx) => {
              const colors = getActivityColors(item.activity);
              return (
                <motion.div
                  key={itemIdx}
                  variants={itemVariants}
                  className="relative group"
                >
                  {/* Timeline Node Point */}
                  <div className="absolute -left-[45px] top-[14px] w-6 h-6 rounded-full bg-background border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:border-blue-500 z-10 shadow-sm">
                    {/* Pulsing ring inside the node */}
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.lineColor} transition-transform duration-300 group-hover:scale-110 relative flex`}>
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.lineColor} opacity-75`} />
                    </span>
                  </div>

                  {/* Card Container */}
                  <div className={`flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 p-5 rounded-2xl hover:bg-white dark:hover:bg-slate-900/80 transition-all hover:translate-x-1.5 duration-300 shadow-sm ${colors.glow}`}>
                    {/* Activity Icon and Time Container */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg} transition-transform duration-300 group-hover:scale-110 shadow-inner`}>
                        {getActivityIcon(item.activity)}
                      </div>
                      
                      {item.time && (
                        <span className={`inline-flex items-center justify-center px-3.5 py-1 text-[10px] font-black uppercase tracking-wider ${colors.bg} ${colors.iconBg.split(" ")[1]} border border-current/10 rounded-lg shadow-sm font-mono`}>
                          {item.time}
                        </span>
                      )}
                    </div>

                    {/* Activity Text Description */}
                    <span className="text-slate-700 dark:text-slate-200 text-sm font-bold tracking-wide leading-relaxed">
                      {item.activity}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PrizesDisplay — parses structured prize text into rank cards
// ──────────────────────────────────────────────────────────────
type PrizeEntry = { rank: string; label: string; amount: string; detail: string };

function parsePrizes(text: string): PrizeEntry[] {
  if (!text) return [];
  if (text.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return parsed.map((p: any) => {
        let amt = p.amount || "";
        let det = p.detail || "";
        if (!det && amt.includes("—")) {
          const parts = amt.split("—");
          amt = parts[0].trim();
          det = parts.slice(1).join("—").trim();
        } else if (!det && amt.includes("-")) {
          const parts = amt.split("-");
          amt = parts[0].trim();
          det = parts.slice(1).join("-").trim();
        }
        return { ...p, amount: amt, detail: det };
      });
    } catch (e) {}
  }
  const lines = text.split(/\n|\|/).map((l) => l.trim()).filter(Boolean);
  const prizes: PrizeEntry[] = [];

  for (const line of lines) {
    const t = line.trim();
    const rankMatch = t.match(/^((?:🥇|🥈|🥉|1st|2nd|3rd|First|Second|Third|Runner[- ]?[Uu]p|Special|Best|Grand)[\w\s]*?)[\s:-]+(.+)$/i);
    if (rankMatch) {
      const label = rankMatch[1].trim();
      const rest = rankMatch[2].trim();
      const amountMatch = rest.match(/^(\$[\d,]+(?:\s*(?:USD|INR|EUR|GBP))?)\s*[-–]?\s*(.*)$/);
      if (amountMatch) {
        prizes.push({ rank: label, label, amount: amountMatch[1], detail: amountMatch[2] });
      } else {
        prizes.push({ rank: label, label, amount: rest, detail: "" });
      }
    } else {
      if (prizes.length > 0) {
        const cleaned = t.replace(/^[-•\s]+/, "").trim();
        if (cleaned) {
          prizes[prizes.length - 1].detail += (prizes[prizes.length - 1].detail ? " • " : "") + cleaned;
        }
      }
    }
  }

  if (prizes.length === 0) {
    prizes.push({ rank: "Prize Pool", label: "Prize Pool", amount: text.substring(0, 80), detail: "" });
  }

  return prizes;
}

const PRIZE_RANK_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode; badge: string }> = {
  "1": {
    bg: "bg-gradient-to-br from-yellow-500/20 to-amber-500/10 dark:from-yellow-500/10",
    border: "border-yellow-500/40",
    icon: <Trophy className="w-5 h-5 text-yellow-500" />,
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  "2": {
    bg: "bg-gradient-to-br from-slate-400/20 to-slate-300/10 dark:from-slate-400/10",
    border: "border-slate-400/40",
    icon: <Medal className="w-5 h-5 text-slate-400" />,
    badge: "bg-slate-400/10 text-slate-500 dark:text-slate-300 border-slate-400/20",
  },
  "3": {
    bg: "bg-gradient-to-br from-amber-700/20 to-orange-700/10 dark:from-amber-700/10",
    border: "border-amber-700/40",
    icon: <Medal className="w-5 h-5 text-amber-700" />,
    badge: "bg-amber-700/10 text-amber-700 dark:text-amber-500 border-amber-700/20",
  },
  "default": {
    bg: "bg-gradient-to-br from-blue-500/10 to-indigo-500/5",
    border: "border-blue-500/20",
    icon: <Star className="w-5 h-5 text-blue-500" />,
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
};

function getPrizeStyle(rank: string) {
  if (/1st|first|gold|grand|🥇/i.test(rank)) return PRIZE_RANK_STYLES["1"];
  if (/2nd|second|silver|🥈/i.test(rank)) return PRIZE_RANK_STYLES["2"];
  if (/3rd|third|bronze|🥉/i.test(rank)) return PRIZE_RANK_STYLES["3"];
  return PRIZE_RANK_STYLES["default"];
}

function PrizesDisplay({ prizesText }: { prizesText: string }) {
  const prizes = parsePrizes(prizesText);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 14 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {prizes.map((prize, i) => {
        const style = getPrizeStyle(prize.rank);
        const hideLabel = !prize.label || /^[🥇🥈🥉🏆⭐️⭐]$/.test(prize.label.trim());
        
        return (
          <motion.div
            key={i}
            variants={cardVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            className={`relative p-8 rounded-[2rem] border ${style.bg} ${style.border} shadow-lg transition-all duration-300 cursor-default overflow-hidden flex flex-col items-center text-center`}
          >
            {/* Glow shimmer */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 dark:bg-white/5 blur-3xl pointer-events-none" />

            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${style.badge} mb-5 shadow-inner bg-white/5`}>
              {style.icon}
            </div>

            {!hideLabel && (
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${style.badge} mb-3 inline-block shadow-sm`}>
                {prize.label}
              </span>
            )}

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight mb-3">
              {prize.amount.replace(/^(🥇|🥈|🥉|🏆|⭐|⭐️)\s*/, '')}
            </h3>
            
            {prize.detail && (
              <div className="w-full h-px bg-slate-200/50 dark:bg-white/10 my-3" />
            )}

            {prize.detail && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium px-2">
                {prize.detail}
              </p>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// RoundsDisplay — renders numbered competition rounds as steps
// ──────────────────────────────────────────────────────────────
type RoundEntry = { title: string; type: string; description: string; duration: string };

function parseRounds(text: string): RoundEntry[] {
  if (!text) return [];
  if (text.trim().startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch (e) {}
  }
  const blocks = text.split(/\n(?=(?:Round|Stage|Phase|\d+[\.\)]|•))/i);
  const rounds: RoundEntry[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").filter((l) => l.trim());
    if (!lines.length) continue;

    const titleLine = lines[0];
    // Try to extract title and type/duration from first line
    const titleMatch = titleLine.match(/^(?:Round|Stage|Phase)?\s*(\d+)?[\.\):]?\s*(.+?)(?:\s*[–-]\s*(.+))?$/i);
    if (!titleMatch) continue;

    const title = titleMatch[2]?.trim() || titleLine;
    const duration = titleMatch[3]?.trim() || "";

    // Parse remaining lines for type and description
    let type = "";
    let description = lines.slice(1).map((l) => l.replace(/^[-•:]\s*/, "").trim()).join(" ").trim();

    const typeMatch = description.match(/^(Online|Virtual|In-Person|Hybrid|Shortlisting|Technical|Presentation|Judging)[:\s]/i);
    if (typeMatch) {
      type = typeMatch[1];
      description = description.substring(typeMatch[0].length).trim();
    }

    rounds.push({ title, type, description, duration });
  }

  // Fallback: split by newlines into simple rounds
  if (rounds.length === 0) {
    const lines = text.split("\n").filter((l) => l.trim());
    lines.forEach((line, i) => {
      rounds.push({ title: `Round ${i + 1}`, type: "", description: line.replace(/^[-•\d\.]\s*/, ""), duration: "" });
    });
  }

  return rounds;
}

const ROUND_COLORS = [
  { dot: "bg-blue-500", connector: "border-blue-500/30", icon: "bg-blue-500/15 text-blue-500 border-blue-500/20", number: "text-blue-600 dark:text-blue-400" },
  { dot: "bg-indigo-500", connector: "border-indigo-500/30", icon: "bg-indigo-500/15 text-indigo-500 border-indigo-500/20", number: "text-indigo-600 dark:text-indigo-400" },
  { dot: "bg-violet-500", connector: "border-violet-500/30", icon: "bg-violet-500/15 text-violet-500 border-violet-500/20", number: "text-violet-600 dark:text-violet-400" },
  { dot: "bg-purple-500", connector: "border-purple-500/30", icon: "bg-purple-500/15 text-purple-500 border-purple-500/20", number: "text-purple-600 dark:text-purple-400" },
  { dot: "bg-pink-500", connector: "border-pink-500/30", icon: "bg-pink-500/15 text-pink-500 border-pink-500/20", number: "text-pink-600 dark:text-pink-400" },
];

function RoundsDisplay({ roundsText }: { roundsText: string }) {
  const rounds = parseRounds(roundsText);

  return (
    <div className="relative space-y-4">
      {/* Vertical connector line */}
      <div className="absolute top-6 bottom-6 left-[19px] w-[2px] bg-gradient-to-b from-blue-500/40 via-purple-500/40 to-pink-500/40 rounded-full pointer-events-none" />

      {rounds.map((round, i) => {
        const color = ROUND_COLORS[i % ROUND_COLORS.length];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="flex gap-4 group relative"
          >
            {/* Step number bubble */}
            <div className={`relative z-10 w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 ${color.icon} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
              {i + 1}
            </div>

            {/* Round card */}
            <div className="flex-1 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 p-4 rounded-2xl hover:bg-white dark:hover:bg-slate-900/80 transition-all hover:translate-x-1 duration-300 shadow-sm mb-2">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-black text-slate-900 dark:text-white text-sm">{round.title}</span>
                {round.type && (
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${color.icon}`}>
                    {round.type}
                  </span>
                )}
                {round.duration && (
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {round.duration}
                  </span>
                )}
              </div>
              {round.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {round.description}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

type Props = {
  params: Promise<{ hackathon_id: string }>;
};

type HackathonDetails = {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  tracks: string;
  start_date: string;
  end_date: string;
  problem_statement: string;
  prizes: string;
  schedule: string;
  sponsors: string;
  min_team_size: number;
  max_team_size: number;
  registration_fee: string;
  rounds: string;
};

type Announcement = {
  id: string;
  message: string;
  created_at: string;
};

export default function WorkspacePage({ params }: Props) {
  const router = useRouter();
  const { hackathon_id } = use(params);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<HackathonDetails | null>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "team">("dashboard");

  // Apply Form State
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [skills, setSkills] = useState("");
  const [resume, setResume] = useState("");
  const [preference, setPreference] = useState("Solo");
  const [error, setError] = useState("");

  // Ticket request state
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);

  useEffect(() => {
    // 1. Fetch Event details
    fetch(`/api/hackathons/${hackathon_id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEvent(data))
      .catch((err) => console.error(err));

    // 2. Fetch User registration details
    fetchApi<any>(`/hackathons/${hackathon_id}/my-registration`)
      .then((reg) => {
        if (reg && reg.id) {
          setRegistration(reg);
          if (reg.approval_status === "Accepted") {
            fetch(`/api/hackathons/${hackathon_id}/broadcasts`)
              .then((res) => (res.ok ? res.json() : []))
              .then((data) => setAnnouncements(data || []));
          }
        }
      })
      .catch(() => setRegistration(null))
      .finally(() => setLoading(false));

    // Pre-fill profile fields if they exist globally
    fetchApi<any>("/profile/me")
      .then((profile) => {
        if (profile && profile.user_id) {
          setFullProfile(profile);
          setGithub(profile.github_url || "");
          setLinkedin(profile.linkedin_url || "");
          setResume(profile.resume_url || "");
          setPreference(profile.default_team_preference || "Solo");
          setSkills(profile.skills || "");
        }
      })
      .catch((err) => console.log("Failed to fetch global profile:", err));

    // Fetch my team's tickets
    fetchMyTickets();
  }, [hackathon_id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!fullProfile) {
        throw new Error("Please complete your global profile at /profile before applying.");
      }

      const requiredFields = [
        "gender", "tshirt_size", "city", "phone_number", 
        "emergency_contact_name", "emergency_contact_number"
      ];
      
      const missing = requiredFields.filter(f => !fullProfile[f]);
      
      if (!fullProfile.bio && !fullProfile.readme_md) {
        missing.push("bio or readme");
      }
      
      if (missing.length > 0) {
        throw new Error(`Your profile is missing required fields: ${missing.join(', ')}. Please complete your global profile at /profile.`);
      }
      
      if (fullProfile.has_formal_education) {
        if (!fullProfile.institution || !fullProfile.degree_type || !fullProfile.field_of_study || !fullProfile.grad_year) {
          throw new Error("Your profile is missing education details. Please complete them at /profile.");
        }
      }

      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!github || !linkedin || skillsArray.length === 0 || !resume) {
        throw new Error("Please complete all your profile details (GitHub, LinkedIn, Skills, Resume) to apply.");
      }

      const res = await fetch(`/api/hackathons/${hackathon_id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_url: github || null,
          linkedin_url: linkedin || null,
          skills: skillsArray,
          team_preference: preference,
          resume_url: resume || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit application");
      }

      const data = await res.json();
      setRegistration(data);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim()) return;
    setTicketSubmitting(true);
    setTicketMsg("");

    try {
      // Fetch user's team ID
      const teamData = await fetchApi<any>(`/hackathons/${hackathon_id}/my-team`);
      let teamID = "";
      if (teamData && teamData.team) {
        teamID = teamData.team.id;
      }

      if (!teamID) {
        throw new Error("You must create or join a team first to request mentor support.");
      }

      await fetchApi(`/hackathons/${hackathon_id}/tickets`, {
        method: "POST",
        body: JSON.stringify({
          team_id: teamID,
          description: ticketDesc,
        }),
      });

      setTicketMsg("Help ticket created! An active mentor will claim it shortly.");
      setTicketDesc("");
      // Refresh my tickets list
      fetchMyTickets(teamID);
    } catch (err: any) {
      setTicketMsg(`Error: ${err.message || "Failed to create ticket"}`);
    } finally {
      setTicketSubmitting(false);
    }
  };

  const fetchMyTickets = async (teamID?: string) => {
    try {
      let tid = teamID;
      if (!tid) {
        const teamData = await fetchApi<any>(`/hackathons/${hackathon_id}/my-team`).catch(() => null);
        if (teamData && teamData.team) tid = teamData.team.id;
      }
      if (!tid) return;
      const data = await fetch(`/api/hackathons/${hackathon_id}/my-tickets?team_id=${tid}`).then(r => r.ok ? r.json() : []);
      setMyTickets(data || []);
    } catch { setMyTickets([]); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // --- 1. NOT REGISTERED (APPLY FLOW) ---
  if (!registration || !registration.id) {
    let tracksArr: string[] = [];
    try {
      if (event?.tracks) tracksArr = JSON.parse(event.tracks);
    } catch (e) {
      tracksArr = [];
    }

    return (
      <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 sm:px-6 transition-colors duration-200 relative">
        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-1/4 w-[700px] h-[350px] bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen" />
          <div className="absolute top-[10%] right-[-5%] w-[400px] h-[300px] bg-indigo-500/5 dark:bg-indigo-600/5 blur-[110px] rounded-full mix-blend-screen" />
        </div>

        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          {/* Back to Explore button */}
          <Link 
            href="/explore" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Explore All
          </Link>

          {/* Hero Section Banner */}
          <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/10 dark:shadow-none relative">
            <div className="h-60 sm:h-72 w-full relative overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={event?.cover_image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"} 
                alt={event?.title || "Hackathon Banner"}
                className="object-cover w-full h-full opacity-65"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tracksArr.map((tr) => (
                    <span key={tr} className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-md border border-blue-500/30">
                      {tr}
                    </span>
                  ))}
                  <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {event?.registration_fee || "Free"}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                  {event?.title}
                </h1>
                <p className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  {event?.start_date && new Date(event.start_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  {" — "}
                  {event?.end_date && new Date(event.end_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Details & Registration Form split grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Details Panel (Left Column) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Event Description */}
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                  <Info className="w-5 h-5 text-blue-500" />
                  Event Overview
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                  {event?.description}
                </p>
              </div>

              {/* Problem Statement */}
              {event?.problem_statement && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 bg-gradient-to-r from-blue-500/5 to-transparent">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                    Problem Statement
                  </h2>
                  <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {event.problem_statement}
                  </div>
                </div>
              )}

              {/* Prizes Section */}
              {event?.prizes && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Prizes & Rewards
                  </h2>
                  <PrizesDisplay prizesText={event.prizes} />
                </div>
              )}

              {/* Rounds Section */}
              {event?.rounds && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Competition Rounds
                  </h2>
                  <RoundsDisplay roundsText={event.rounds} />
                </div>
              )}

              {/* Schedule Section */}
              {event?.schedule && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Event Schedule
                  </h2>

                  <EventSchedule scheduleText={event.schedule} />
                </div>
              )}

              {/* Sponsors Section */}
              {event?.sponsors && (
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Sponsors & Partners
                  </h2>
                  <div className="flex flex-wrap gap-2.5">
                    {event.sponsors.split(",").map((s) => (
                      <span key={s} className="px-4.5 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black tracking-wide">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Logistics (Team Size, Fee) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Size Limits</h4>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {event?.min_team_size || 1} to {event?.max_team_size || 4} Members
                    </p>
                  </div>
                </div>

                <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registration Fee</h4>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {event?.registration_fee || "Free"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form Column (Right Column) */}
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/5 dark:shadow-none">
                <header className="space-y-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Join this Hackathon</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Submit your developer profile details to apply for registration.
                  </p>
                </header>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">GitHub Profile URL</label>
                      <input
                        type="url"
                        placeholder="https://github.com/username"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">LinkedIn Profile URL</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Skills (comma separated)</label>
                      <input
                        type="text"
                        placeholder="React, Go, Solidity"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resume Link</label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/..."
                        value={resume}
                        onChange={(e) => setResume(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Team Preference</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Solo", "Looking for Team", "Has Team"].map((opt) => (
                        <label key={opt} className={`flex flex-col items-center justify-center p-3.5 rounded-xl border cursor-pointer text-center transition-all ${
                          preference === opt 
                            ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold scale-102" 
                            : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                        }`}>
                          <input
                            type="radio"
                            name="preference"
                            value={opt}
                            checked={preference === opt}
                            onChange={() => setPreference(opt)}
                            className="hidden"
                          />
                          <span className="text-[10px] uppercase font-bold tracking-wide">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {preference === "Has Team" && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold leading-relaxed flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Note: All team members must apply individually and be approved before forming a team.</span>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Apply Now"
                    )}
                  </motion.button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- 2. PENDING SCREEN ---
  if (registration.approval_status === "Pending") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 transition-colors duration-200">
        <div className="max-w-md w-full text-center space-y-4 glass p-8 rounded-2xl border border-slate-200/60 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center mx-auto text-xl font-bold animate-pulse">!</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Application Under Review</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your application to <span className="font-semibold text-slate-900 dark:text-slate-300">{event?.title}</span> is pending review by event organizers. You will be redirected here once approved.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Back to Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // --- 3. REJECTED SCREEN ---
  if (registration.approval_status === "Rejected") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 transition-colors duration-200">
        <div className="max-w-md w-full text-center space-y-4 glass p-8 rounded-2xl border border-slate-200/60 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">✕</div>
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Application Rejected</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            We regret to inform you that your application to {event?.title} was not accepted. Contact the organizers if you believe this is a mistake.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // --- 4. ACCEPTED WORKSPACE ---
  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Title */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-white/5 pb-6">
          <div>
            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">Active Workspace</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">{event?.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{event?.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4.5 py-2.5 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 ${
                activeTab === "dashboard" ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4.5 py-2.5 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 ${
                activeTab === "team" ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Team Management
            </button>
            <Link href={`/workspace/${hackathon_id}/project`} className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_10px_rgba(79,70,229,0.15)] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              My Project Submission
            </Link>
          </div>
        </header>

        {activeTab === "team" ? (
          <TeamManagement hackathon_id={hackathon_id} user_id={registration?.user_id || fullProfile?.user_id || ""} event={event} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main workspace info */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            
            {/* Live Announcements */}
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Event Broadcasts</h2>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No announcements broadcast yet.</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{ann.message}</p>
                      <span className="text-[9px] text-slate-400 mt-2 block">
                        {new Date(ann.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule Section */}
            {event?.schedule && (
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Event Schedule
                </h3>

                <EventSchedule scheduleText={event.schedule} isDashboard={true} />
              </div>
            )}

            {/* Quick Tracks Card */}
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Event Tracks</h3>
              <div className="flex flex-wrap gap-2">
                {event?.tracks && JSON.parse(event.tracks).map((tr: string) => (
                  <span key={tr} className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-lg">
                    {tr}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Before you apply</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Make sure your <strong>Global Profile</strong> (accessed from the sidebar) is completely filled out. 
                    Organizers review your skills, GitHub, and LinkedIn. 
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold">
                    Important: If you are participating as a team, <strong>each team member must apply individually</strong> and complete their own profile!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mentor help Request panel */}
          <div className="col-span-1 space-y-6">
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mentor Support</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Encountered a blocking code error or infrastructure issue? Submit a ticket to alert active mentors.
              </p>

              <form onSubmit={handleRequestMentor} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue... e.g., Throwing a compilation error in our Go middleware route mapping."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full p-3 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />

                {ticketMsg && (
                  <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                    ticketMsg.includes("Error") ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                  }`}>
                    {ticketMsg}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={ticketSubmitting || !ticketDesc.trim()}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {ticketSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      Request Mentor
                      <Send className="w-3 h-3" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* My Tickets History */}
              {myTickets.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">My Tickets</h3>
                  <div className="space-y-2">
                    {myTickets.map((t: any) => (
                      <div key={t.id} className="p-3 bg-white/30 dark:bg-slate-900/30 border border-slate-200/40 dark:border-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            t.status === "Open" ? "text-yellow-600" :
                            t.status === "Active" ? "text-blue-600" :
                            t.status === "Resolved" ? "text-green-600" : "text-slate-500"
                          }`}>
                            {t.status === "Open" ? "⏳ Open" : t.status === "Active" ? "🔧 In Progress" : "✅ Resolved"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{t.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
        )}
      </div>
    </div>
  );
}

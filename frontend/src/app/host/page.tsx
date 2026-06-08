"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Plus, FileText, Calendar, Award, ShieldAlert, 
  Layers, DollarSign, Users, Upload, Code, Sparkles, X, 
  ChevronRight, Laptop, HelpCircle, ArrowLeft, ArrowUp, ArrowDown, Trash2, Download
} from "lucide-react";
import { fetchApi } from "@/lib/api";

type HostedHackathon = {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  cover_image: string;
  tracks: string;
  start_date: string;
  end_date: string;
  registration_status: string;
  is_approved: boolean;
};

export type RoundEntry = { title: string; type: string; description: string; duration: string };
export type PrizeEntry = { rank: string; label: string; amount: string; detail: string };
export type ScheduleItem = { time: string; activity: string };
export type DaySchedule = { dayTitle: string; items: ScheduleItem[] };

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
    <motion.div
      style={{ perspective: 1000 }}
      className={className}
    >
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

// --- Schedule Parser ---
export function parseSchedule(scheduleText: string): DaySchedule[] {
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

// --- Prizes Parser ---
export function parsePrizes(text: string): PrizeEntry[] {
  if (!text) return [];
  if (text.trim().startsWith("[")) {
    try {
      return JSON.parse(text);
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

// --- Rounds Parser ---
export function parseRounds(text: string): RoundEntry[] {
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
    const titleMatch = titleLine.match(/^(?:Round|Stage|Phase)?\s*(\d+)?[\.\):]?\s*(.+?)(?:\s*[–-]\s*(.+))?$/i);
    if (!titleMatch) continue;

    const title = titleMatch[2]?.trim() || titleLine;
    const duration = titleMatch[3]?.trim() || "";

    let type = "Online";
    let description = lines.slice(1).map((l) => l.replace(/^[-•:]\s*/, "").trim()).join(" ").trim();

    const typeMatch = description.match(/^(Online|Virtual|In-Person|Hybrid|Shortlisting|Technical|Presentation|Judging)[:\s]/i);
    if (typeMatch) {
      type = typeMatch[1];
      description = description.substring(typeMatch[0].length).trim();
    }

    rounds.push({ title, type, description, duration });
  }

  if (rounds.length === 0) {
    const lines = text.split("\n").filter((l) => l.trim());
    lines.forEach((line, i) => {
      rounds.push({ title: `Round ${i + 1}`, type: "Online", description: line.replace(/^[-•\d\.]\s*/, ""), duration: "" });
    });
  }

  return rounds;
}

// --- Client-side Markdown Importer ---
export function parseMarkdownForHackathon(md: string) {
  const result = {
    title: "",
    description: "",
    problem_statement: "",
    sponsors: "",
    registration_fee: "Free",
    min_team_size: 1,
    max_team_size: 4,
    tracks: [] as string[],
    prizesList: [] as PrizeEntry[],
    roundsList: [] as RoundEntry[],
    scheduleDays: [] as DaySchedule[]
  };

  const titleMatch = md.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  const extractSection = (headerName: string): string => {
    const escapedHeader = headerName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`##\\s+${escapedHeader}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = md.match(regex);
    return match ? match[1].trim() : "";
  };

  result.description = extractSection("Description") || extractSection("Event Overview") || extractSection("Overview");
  result.problem_statement = extractSection("Problem Statement");
  result.sponsors = extractSection("Sponsors") || extractSection("Sponsors & Partners");

  const feeText = extractSection("Registration Fee") || extractSection("Fee");
  if (feeText) {
    result.registration_fee = feeText.replace(/^[:\s\-•*]+/, "").trim();
  }

  const teamSizeText = extractSection("Team Size") || extractSection("Team Size Limits");
  if (teamSizeText) {
    const match = teamSizeText.match(/(\d+)\s*(?:to|-)\s*(\d+)/i);
    if (match) {
      result.min_team_size = parseInt(match[1], 10);
      result.max_team_size = parseInt(match[2], 10);
    }
  }

  const tracksText = extractSection("Tracks");
  if (tracksText) {
    // Extract any track names from bullet points, comma-separated lists, or lines
    const parsedTracks: string[] = [];
    const lines = tracksText.split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•\d.)\s]+/, "").trim();
      if (!cleaned) continue;
      // Handle comma-separated on one line
      const parts = cleaned.split(/[,|]+/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        // Remove markdown bold/italic formatting
        const trackName = part.replace(/\*+/g, "").replace(/_+/g, "").trim();
        if (trackName && !parsedTracks.includes(trackName)) {
          parsedTracks.push(trackName);
        }
      }
    }
    if (parsedTracks.length > 0) {
      result.tracks = parsedTracks;
    }
  }

  const prizesText = extractSection("Prizes") || extractSection("Prizes & Rewards");
  if (prizesText) {
    result.prizesList = parsePrizes(prizesText);
  }

  const roundsText = extractSection("Rounds") || extractSection("Competition Rounds");
  if (roundsText) {
    result.roundsList = parseRounds(roundsText);
  }

  const scheduleText = extractSection("Schedule") || extractSection("Event Schedule");
  if (scheduleText) {
    result.scheduleDays = parseSchedule(scheduleText);
  }

  return result;
}

export default function HostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [hostedHackathons, setHostedHackathons] = useState<HostedHackathon[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tracks, setTracks] = useState<string[]>([]);
  const [problemStatement, setProblemStatement] = useState("");
  const [sponsors, setSponsors] = useState("");
  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [registrationFee, setRegistrationFee] = useState("Free");

  // Dynamic Lists State
  const [prizesList, setPrizesList] = useState<PrizeEntry[]>([]);
  const [roundsList, setRoundsList] = useState<RoundEntry[]>([]);
  const [scheduleDays, setScheduleDays] = useState<DaySchedule[]>([]);

  const [mdInput, setMdInput] = useState("");
  const [showMdPaste, setShowMdPaste] = useState(false);
  const [customTrackInput, setCustomTrackInput] = useState("");

  const PRESET_TRACKS = ["AI", "Web3", "Blockchain", "Mobile", "Design", "Hardware", "AR/VR", "Cybersecurity", "Cloud", "IoT", "Fintech", "HealthTech", "EdTech", "Open Source"];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data);
        if (!data) {
          router.push("/login");
          return;
        }

        fetchApi<HostedHackathon[]>("/hackathons/all")
          .then((list) => {
            if (Array.isArray(list)) {
              setHostedHackathons(list.filter((h) => h.organizer_id === data.id));
            }
          })
          .catch((err) => console.error("Error fetching hosted hackathons:", err))
          .finally(() => setLoading(false));
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [router]);

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

  // --- Dynamic Rounds Builder Operations ---
  const addRound = () => {
    setRoundsList([...roundsList, { title: "", type: "Online", description: "", duration: "" }]);
  };

  const removeRound = (index: number) => {
    setRoundsList(roundsList.filter((_, i) => i !== index));
  };

  const updateRound = (index: number, key: keyof RoundEntry, value: string) => {
    const updated = [...roundsList];
    updated[index] = { ...updated[index], [key]: value };
    setRoundsList(updated);
  };

  const moveRound = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === roundsList.length - 1) return;
    const target = direction === "up" ? index - 1 : index + 1;
    const updated = [...roundsList];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setRoundsList(updated);
  };

  // --- Dynamic Prizes Builder Operations ---
  const addPrize = () => {
    setPrizesList([...prizesList, { rank: "", label: "", amount: "", detail: "" }]);
  };

  const removePrize = (index: number) => {
    setPrizesList(prizesList.filter((_, i) => i !== index));
  };

  const updatePrize = (index: number, key: keyof PrizeEntry, value: string) => {
    const updated = [...prizesList];
    updated[index] = { ...updated[index], [key]: value };
    if (key === "label") {
      updated[index].rank = value; // link rank to label
    }
    setPrizesList(updated);
  };

  const movePrize = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === prizesList.length - 1) return;
    const target = direction === "up" ? index - 1 : index + 1;
    const updated = [...prizesList];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setPrizesList(updated);
  };

  // --- Dynamic Schedule Builder Operations ---
  const addDay = () => {
    setScheduleDays([...scheduleDays, { dayTitle: `Day ${scheduleDays.length + 1}`, items: [] }]);
  };

  const removeDay = (dayIndex: number) => {
    setScheduleDays(scheduleDays.filter((_, i) => i !== dayIndex));
  };

  const updateDayTitle = (dayIndex: number, value: string) => {
    const updated = [...scheduleDays];
    updated[dayIndex].dayTitle = value;
    setScheduleDays(updated);
  };

  const moveDay = (dayIndex: number, direction: "up" | "down") => {
    if (direction === "up" && dayIndex === 0) return;
    if (direction === "down" && dayIndex === scheduleDays.length - 1) return;
    const target = direction === "up" ? dayIndex - 1 : dayIndex + 1;
    const updated = [...scheduleDays];
    const temp = updated[dayIndex];
    updated[dayIndex] = updated[target];
    updated[target] = temp;
    setScheduleDays(updated);
  };

  const addScheduleItem = (dayIndex: number) => {
    const updated = [...scheduleDays];
    updated[dayIndex].items.push({ time: "", activity: "" });
    setScheduleDays(updated);
  };

  const removeScheduleItem = (dayIndex: number, itemIndex: number) => {
    const updated = [...scheduleDays];
    updated[dayIndex].items = updated[dayIndex].items.filter((_, i) => i !== itemIndex);
    setScheduleDays(updated);
  };

  const updateScheduleItem = (dayIndex: number, itemIndex: number, key: keyof ScheduleItem, value: string) => {
    const updated = [...scheduleDays];
    updated[dayIndex].items[itemIndex] = { ...updated[dayIndex].items[itemIndex], [key]: value };
    setScheduleDays(updated);
  };

  // --- Parse & Auto-fill Markdown ---
  const applyParsedData = (data: any) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.problem_statement) setProblemStatement(data.problem_statement);
    if (data.sponsors) setSponsors(data.sponsors);
    if (data.registration_fee) setRegistrationFee(data.registration_fee);
    if (data.min_team_size) setMinTeamSize(data.min_team_size);
    if (data.max_team_size) setMaxTeamSize(data.max_team_size);
    if (data.tracks && data.tracks.length > 0) setTracks(data.tracks);
    if (data.prizesList) setPrizesList(data.prizesList);
    if (data.roundsList) setRoundsList(data.roundsList);
    if (data.scheduleDays) setScheduleDays(data.scheduleDays);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!title.trim() || !description.trim() || !startDate || !endDate) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    try {
      // 1. Serialize schedule list back into standard text outline format
      const formattedSchedule = scheduleDays.map(day => {
        const itemsStr = day.items.map(item => `- ${item.time} : ${item.activity}`).join("\n");
        return `📅 ${day.dayTitle}:\n${itemsStr}`;
      }).join("\n\n");

      const body = {
        title,
        description,
        cover_image: coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
        tracks,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        problem_statement: problemStatement,
        prizes: JSON.stringify(prizesList),
        schedule: formattedSchedule,
        sponsors,
        min_team_size: Number(minTeamSize),
        max_team_size: Number(maxTeamSize),
        registration_fee: registrationFee,
        rounds: JSON.stringify(roundsList),
      };

      await fetchApi("/hackathons", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsFormOpen(false);
        fetchApi<HostedHackathon[]>("/hackathons/all")
          .then((list) => {
            if (Array.isArray(list)) {
              setHostedHackathons(list.filter((h) => h.organizer_id === user.id));
            }
          })
          .catch((err) => console.error("Error refreshing list:", err));
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit hackathon request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 dark:border-white/10 pb-6 gap-4">
        <div className="text-left">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Laptop className="w-8 h-8 text-blue-500" />
            Hackathon Hosting Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit, manage, and edit your hosted hackathon structures in one dashboard.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => {
              setTitle("");
              setDescription("");
              setCoverImage("");
              setStartDate("");
              setEndDate("");
              setTracks([]);
              setProblemStatement("");
              setPrizesList([]);
              setScheduleDays([]);
              setSponsors("");
              setMinTeamSize(1);
              setMaxTeamSize(4);
              setRegistrationFee("Free");
              setRoundsList([]);
              setIsFormOpen(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.25)] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Host a Hackathon
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          // --- DASHBOARD LIST VIEW ---
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {hostedHackathons.length === 0 ? (
              <div className="text-center py-20 glass border border-slate-200/60 dark:border-white/10 rounded-3xl space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-500">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">You haven&apos;t hosted any hackathons yet</h3>
                  <p className="text-xs text-slate-500 mt-1">Click the &quot;Host a Hackathon&quot; button above to create and request approval for your first event.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hostedHackathons.map((hack) => {
                  let tracksArr: string[] = [];
                  try {
                    tracksArr = JSON.parse(hack.tracks);
                  } catch (e) {
                    tracksArr = [];
                  }

                  return (
                    <TiltCard key={hack.id}>
                      <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col group h-full shadow-lg relative bg-white dark:bg-slate-900/40">
                        <div className={`absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${
                          hack.is_approved 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                          {hack.is_approved ? "Approved & Live" : "Pending Approval"}
                        </div>

                        <div className="h-44 w-full relative overflow-hidden bg-slate-950/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={hack.cover_image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"} 
                            alt={hack.title}
                            className="object-cover w-full h-full opacity-70 group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                        </div>

                        <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                              {hack.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {hack.description}
                            </p>
                          </div>

                          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                            <div className="flex flex-wrap gap-1">
                              {tracksArr.map((tr) => (
                                <span key={tr} className="text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/10 px-2 py-0.5 rounded-md">
                                  {tr}
                                </span>
                              ))}
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              {new Date(hack.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              {" - "}
                              {new Date(hack.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {hack.is_approved && (
                          <div className="px-5 pb-5 pt-1">
                            <Link 
                              href={`/workspace/${hack.id}/organizer`}
                              className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center gap-1 border border-slate-200 dark:border-white/5"
                            >
                              Organizer Console <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          // --- FORM CREATION VIEW ---
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200/60 dark:border-white/5 rounded-2xl">
              <button
                onClick={() => setIsFormOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMdPaste(!showMdPaste)}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Code className="w-3.5 h-3.5" />
                  {showMdPaste ? "Hide Markdown" : "Paste Markdown"}
                </button>
                <label className="px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
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
                  className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Sample
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
                  <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Copy & Paste Markdown
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        fetch("/sample_hackathon.md")
                          .then((r) => r.text())
                          .then((text) => setMdInput(text));
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Code className="w-3.5 h-3.5" /> Load Sample
                    </button>
                    <a
                      href="/sample_hackathon.md"
                      download="sample_hackathon.md"
                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Sample
                    </a>
                  </div>
                </div>

                {/* Supported sections badge legend */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supported Markdown Sections</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { tag: "# Title", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
                      { tag: "## Description", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
                      { tag: "## Problem Statement", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
                      { tag: "## Tracks", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
                      { tag: "## Prizes", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
                      { tag: "## Rounds", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
                      { tag: "## Schedule", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
                      { tag: "## Sponsors", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
                      { tag: "## Registration Fee", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
                      { tag: "## Team Size", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
                    ].map(({ tag, color }) => (
                      <span key={tag} className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black font-mono ${color}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Tracks: use bullet lists (one per line). Prizes: use emoji ranks like <span className="font-mono bg-slate-100 dark:bg-white/5 px-1 rounded">🥇 1st Place: $15,000</span>. Schedule: group by <span className="font-mono bg-slate-100 dark:bg-white/5 px-1 rounded">📅 Day 1</span> then <span className="font-mono bg-slate-100 dark:bg-white/5 px-1 rounded">- 09:00 AM : Activity</span>. Team Size: write <span className="font-mono bg-slate-100 dark:bg-white/5 px-1 rounded">1 to 5</span>.
                  </p>
                </div>

                <textarea
                  rows={8}
                  placeholder={`# My Hackathon 2026\n\n## Description\nWelcome to this event...\n\n## Tracks\n- AI / Machine Learning\n- HealthTech\n\n## Prizes\n🥇 1st Place: $15,000\n🥈 2nd Place: $8,000\n\n## Rounds\nRound 1: Idea Submission\n- Online submission, 3 days\n\n## Schedule\n📅 Day 1\n- 09:00 AM : Opening Ceremony`}
                  value={mdInput}
                  onChange={(e) => setMdInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono leading-relaxed"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">{mdInput.length} characters</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setMdInput("");
                        setShowMdPaste(false);
                      }}
                      className="px-3.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMdPasteSubmit}
                      disabled={!mdInput.trim()}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Parse & Auto-fill
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            {success ? (
              <div className="p-10 rounded-2xl glass border border-emerald-500/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto text-xl font-black">✓</div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Hosting Application Submitted!</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your hackathon request was successfully submitted for approval. Returning to dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column: Main Details */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Basic Info */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                      <FileText className="w-4 h-4 text-blue-500" /> Event Basics
                    </h2>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Event Title <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Global AI Hackathon 2026"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tagline / Overview Description <span className="text-rose-500">*</span></label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Provide a compelling overview describing the hackathon..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Problem Statement / Theme Detail</label>
                      <textarea
                        rows={4}
                        placeholder="Describe the detailed problem statement or building challenge..."
                        value={problemStatement}
                        onChange={(e) => setProblemStatement(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic Competition Rounds */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-500" /> Competition Rounds
                      </h2>
                      <button
                        type="button"
                        onClick={addRound}
                        className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Round
                      </button>
                    </div>

                    {roundsList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-4">No rounds configured. Click &quot;Add Round&quot; to define stages.</p>
                    ) : (
                      <div className="space-y-4">
                        {roundsList.map((round, index) => (
                          <div key={index} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 space-y-3 relative group">
                            
                            {/* Controls Header */}
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-500">Round {index + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveRound(index, "up")}
                                  className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === roundsList.length - 1}
                                  onClick={() => moveRound(index, "down")}
                                  className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRound(index)}
                                  className="p-1 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Inputs grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400">Round Title</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Technical Screening"
                                  value={round.title}
                                  onChange={(e) => updateRound(index, "title", e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Type</label>
                                <select
                                  value={round.type}
                                  onChange={(e) => updateRound(index, "type", e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                                >
                                  {["Online", "Virtual", "In-Person", "Hybrid", "Shortlisting", "Technical", "Presentation", "Judging"].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Duration</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 2 days, 3 hours"
                                  value={round.duration}
                                  onChange={(e) => updateRound(index, "duration", e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400">Description</label>
                                <input
                                  type="text"
                                  placeholder="Describe what builders submit or present..."
                                  value={round.description}
                                  onChange={(e) => updateRound(index, "description", e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Event Schedule */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-500" /> Event Schedule
                      </h2>
                      <button
                        type="button"
                        onClick={addDay}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Day
                      </button>
                    </div>

                    {scheduleDays.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-4">No schedule configured. Click &quot;Add Day&quot; to build timeline.</p>
                    ) : (
                      <div className="space-y-6">
                        {scheduleDays.map((day, dayIdx) => (
                          <div key={dayIdx} className="p-5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 relative group">
                            
                            {/* Day Header Control */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-2">
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-xs font-black uppercase text-emerald-500">Day Title:</span>
                                <input
                                  type="text"
                                  value={day.dayTitle}
                                  onChange={(e) => updateDayTitle(dayIdx, e.target.value)}
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-900 dark:text-white w-40"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => addScheduleItem(dayIdx)}
                                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/10 rounded-lg text-[10px] font-black uppercase"
                                >
                                  + Event Slot
                                </button>
                                <button
                                  type="button"
                                  disabled={dayIdx === 0}
                                  onClick={() => moveDay(dayIdx, "up")}
                                  className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={dayIdx === scheduleDays.length - 1}
                                  onClick={() => moveDay(dayIdx, "down")}
                                  className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeDay(dayIdx)}
                                  className="p-1 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Day Slots Items List */}
                            {day.items.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic text-center py-2">No event slots. Click &quot;+ Event Slot&quot; to add.</p>
                            ) : (
                              <div className="space-y-2.5">
                                {day.items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      placeholder="09:00 AM"
                                      value={item.time}
                                      onChange={(e) => updateScheduleItem(dayIdx, itemIdx, "time", e.target.value)}
                                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white font-mono w-28"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Opening Ceremony & Speaker Keynote"
                                      value={item.activity}
                                      onChange={(e) => updateScheduleItem(dayIdx, itemIdx, "activity", e.target.value)}
                                      className="flex-grow px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeScheduleItem(dayIdx, itemIdx)}
                                      className="p-1.5 border border-red-500/10 text-red-500 hover:bg-red-500/10 rounded-lg"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Parameters & Logistics */}
                <div className="space-y-6">
                  
                  {/* Timeline Details */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                      <Calendar className="w-4 h-4 text-blue-500" /> Event Timeline
                    </h2>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Start Date <span className="text-rose-500">*</span></label>
                      <input
                        type="datetime-local"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">End Date <span className="text-rose-500">*</span></label>
                      <input
                        type="datetime-local"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Logistics Parameters */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                      <DollarSign className="w-4 h-4 text-emerald-500" /> Logistics
                    </h2>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cover Image URL</label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo..."
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Registration Fee</label>
                      <input
                        type="text"
                        placeholder="e.g. Free, $10 USD"
                        value={registrationFee}
                        onChange={(e) => setRegistrationFee(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Min Team Size</label>
                        <input
                          type="number"
                          min={1}
                          value={minTeamSize}
                          onChange={(e) => setMinTeamSize(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Max Team Size</label>
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
                        placeholder="Google, QuickNode, Figma"
                        value={sponsors}
                        onChange={(e) => setSponsors(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Dynamic Prizes Builder Card */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" /> Prizes & Rewards
                      </h2>
                      <button
                        type="button"
                        onClick={addPrize}
                        className="px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    {prizesList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-2">No prizes configured. Click &quot;Add&quot; to build categories.</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {prizesList.map((prize, index) => (
                          <div key={index} className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/20 space-y-2.5 relative group">
                            
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-500">Prize #{index + 1}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => movePrize(index, "up")}
                                  className="p-1 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === prizesList.length - 1}
                                  onClick={() => movePrize(index, "down")}
                                  className="p-1 rounded-md border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removePrize(index)}
                                  className="p-1 rounded-md border border-red-500/10 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400">Name / Category</label>
                              <input
                                type="text"
                                placeholder="e.g. 1st Place, Best Web3 Track"
                                value={prize.label}
                                onChange={(e) => updatePrize(index, "label", e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400">Amount / Reward</label>
                              <input
                                type="text"
                                placeholder="e.g. $15,000, Custom Swags"
                                value={prize.amount}
                                onChange={(e) => updatePrize(index, "amount", e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white font-semibold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400">Details</label>
                              <input
                                type="text"
                                placeholder="e.g. includes swags, quicknode credits"
                                value={prize.detail}
                                onChange={(e) => updatePrize(index, "detail", e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tracks */}
                  <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                      <Layers className="w-4 h-4 text-blue-500" /> Technology Tracks
                    </h2>

                    {/* Custom Track Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type any track (e.g. Quantum, ClimateTech…)"
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

                    {/* Selected Tracks as removable chips */}
                    {tracks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tracks.map((track) => (
                          <span
                            key={track}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 text-[10px] font-black uppercase tracking-wide"
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
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Add Presets</p>
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

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

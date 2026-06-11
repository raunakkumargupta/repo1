"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Search, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Award,
  CalendarPlus
} from "lucide-react";

type Hackathon = {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  tracks: string; // JSON string representation
  start_date: string;
  end_date: string;
  registration_status: string;
};

// --- Tilt Card Component for 3D effect ---
function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const maxRotate = 10;
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

export default function ExplorePage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTrack, setActiveTrack] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 10;

  // Fetch live approved hackathons
  useEffect(() => {
    fetch("/api/hackathons")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHackathons(data))
      .catch((err) => console.error("Error fetching hackathons", err))
      .finally(() => setLoading(false));
  }, []);

  // Reset page to 1 when search query or track filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTrack]);

  const mockHackathons: Hackathon[] = [
    {
      id: "hack-1",
      title: "Global AI Hackathon 2026",
      description: "Build cutting-edge intelligence systems and decentralized agents using latest Large Language Models.",
      cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
      tracks: JSON.stringify(["AI", "Web3"]),
      start_date: "2026-06-15T10:00:00Z",
      end_date: "2026-06-17T18:00:00Z",
      registration_status: "open",
    },
    {
      id: "hack-2",
      title: "Obsidian Web3 build-athon",
      description: "Develop high-performance decentralised applications and smart contracts for scalable blockchain ecosystems.",
      cover_image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=60",
      tracks: JSON.stringify(["Web3", "Mobile"]),
      start_date: "2026-07-01T09:00:00Z",
      end_date: "2026-07-04T18:00:00Z",
      registration_status: "open",
    },
    {
      id: "hack-3",
      title: "Quantum Computing Sprint",
      description: "Tackle real-world mathematical optimization and cryptography challenges on simulation hardware.",
      cover_image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=60",
      tracks: JSON.stringify(["QC", "AI"]),
      start_date: "2026-07-20T10:00:00Z",
      end_date: "2026-07-22T17:00:00Z",
      registration_status: "open",
    }
  ];

  const allHackathons = hackathons.length > 0 ? hackathons : mockHackathons;

  // Dynamically build the track filter list from actual hackathon data
  const availableTracks = useMemo(() => {
    const trackSet = new Set<string>();
    allHackathons.forEach((h) => {
      try {
        const arr = JSON.parse(h.tracks) as string[];
        arr.forEach((t) => trackSet.add(t));
      } catch (e) {}
    });
    return ["All", ...Array.from(trackSet).sort()];
  }, [allHackathons]);

  // Filter hackathons correctly (fixing legacy empty DB fallback bugs)
  const filteredHackathons = allHackathons.filter((h) => {
    const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          h.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTrack = true;
    if (activeTrack !== "All") {
      try {
        const tracksArr = JSON.parse(h.tracks) as string[];
        matchesTrack = tracksArr.some(
          (t) => t.toLowerCase() === activeTrack.toLowerCase()
        );
      } catch (e) {
        matchesTrack = false;
      }
    }
    return matchesSearch && matchesTrack;
  });

  const totalPages = Math.ceil(filteredHackathons.length / ITEMS_PER_PAGE);
  const paginatedHackathons = filteredHackathons.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  return (
    <div className="w-full bg-background text-foreground relative transition-colors duration-200 selection:bg-blue-500/30 pb-20">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/3 w-[800px] h-[450px] bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[130px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
      </div>

      <div className="relative z-10 space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-slate-200/60 dark:border-white/10 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Explore commands
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Discover Live Events</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Search and filter hackathons by tracks, skills, and technologies to build your next project.
            </p>
          </div>

          {/* Search Box + Host Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search hackathons..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              />
            </div>
            <Link
              href="/host"
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] whitespace-nowrap"
            >
              <CalendarPlus className="w-4 h-4" />
              Host a Hackathon
            </Link>
          </div>
        </div>

        {/* Tracks Filters - dynamically built from actual data */}
        <div className="flex flex-wrap gap-2.5">
          {availableTracks.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTrack(t)}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTrack === t
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Event Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-600 animate-spin" />
          </div>
        ) : filteredHackathons.length === 0 ? (
          <div className="text-center py-24 glass rounded-3xl border border-slate-200/60 dark:border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-500">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-300">No hackathons match your search</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting your filter tracks or search query.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedHackathons.map((hack, idx) => {
                let tracksArr: string[] = [];
                try { tracksArr = JSON.parse(hack.tracks); } catch (e) { tracksArr = []; }
                return (
                  <TiltCard key={hack.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      className="glass rounded-3xl overflow-hidden border border-slate-200/60 dark:border-white/10 flex flex-col group h-full shadow-lg shadow-slate-200/20 dark:shadow-none"
                    >
                      {/* Image Header */}
                      <div className="h-52 w-full relative overflow-hidden bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={hack.cover_image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"} 
                          alt={hack.title}
                          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                        
                        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {hack.registration_status}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {tracksArr.map((tr) => (
                              <span key={tr} className="text-[10px] font-black uppercase bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md">
                                {tr}
                              </span>
                            ))}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                            {hack.title}
                          </h3>
                          <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed font-medium">
                            {hack.description}
                          </p>
                        </div>

                        <div className="mt-8 pt-5 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(hack.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <Link 
                            href={`/workspace/${hack.id}`}
                            className="text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            Workspace
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  </TiltCard>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-slate-200/50 dark:border-white/5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                        : "bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

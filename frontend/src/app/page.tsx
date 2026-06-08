"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Plus, 
  Minus, 
  Calendar, 
  Users,
  Terminal,
  Code,
  Globe,
  Zap,
  Quote
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
    
    // Rotate max 10 degrees
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

export default function LandingPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 8, hours: 14, minutes: 22 });

  const { scrollYProgress } = useScroll();
  
  // Advanced Parallax Hero
  const yText1 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const yText2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const yBtns = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const yBanner = useTransform(scrollYProgress, [0, 1], [0, 250]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  // Wild parallax layers for the ambient background
  const yBg1 = useTransform(scrollYProgress, [0, 1], [0, 500]);
  const yBg2 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  // Hacker Journey Animated Line
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: journeyScroll } = useScroll({
    target: journeyRef,
    offset: ["start 80%", "end 50%"]
  });
  const lineScale = useTransform(journeyScroll, [0, 1], [0, 1]);

  // 1. Fetch live approved hackathons
  useEffect(() => {
    fetch("/api/hackathons")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHackathons(data))
      .catch((err) => console.error("Error fetching hackathons", err));
  }, []);

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59 };
        return prev;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fallback mock hackathons if DB is empty
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

  // Slice to only show 3 recently added on the landing page
  const allHackathons = hackathons.length > 0 ? hackathons : mockHackathons;
  const displayedHackathons = allHackathons.slice(0, 3);

  const tracks = ["All", "AI", "Web3", "QC", "Mobile", "Design"];

  const faqs = [
    {
      question: "How do I join or form a team?",
      answer: "Once you register for an event and select 'Looking for Team', you'll unlock our Matcher Dashboard. You can search other hackers by skills, swipe on profiles, and instantly chat. Alternatively, if you already have friends, create a team and share the 6-digit invite code!"
    },
    {
      question: "Is my Hacker Profile reusable across events?",
      answer: "Yes! Your hacker portfolio—including your GitHub, LinkedIn, skills matrix, and uploaded Resume PDF—is saved globally. You fill it out once, and apply to any hackathon with one click."
    },
    {
      question: "What if I get stuck on a technical bug during the event?",
      answer: "We built a Live Support Queue directly into your project workspace. Hit 'Request Mentor', describe your bug, and an available technical mentor will accept your ticket and instantly join your workspace to help you debug."
    },
    {
      question: "Can I participate individually as a Solo Hacker?",
      answer: "Absolutely. During application, just select the 'Solo' team preference. You will be routed straight to your submission dashboard where you can manage your repository without any team setup friction."
    }
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden relative transition-colors duration-200 selection:bg-blue-500/30">
      
      {/* --- Ambient 3D Decorative Mesh Background --- */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none z-0">
        <motion.div style={{ y: yBg1 }} className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] rounded-full mix-blend-screen" />
        <motion.div style={{ y: yBg2 }} className="absolute top-[20%] right-[-10%] w-[600px] h-[400px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
        {/* Abstract Grid Lines */}
        <motion.div style={{ scale: scaleBg }} className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
      </div>

      {/* --- Hero Section --- */}
      <motion.section 
        style={{ opacity: opacityHero }}
        className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center min-h-[90vh] flex justify-center"
      >
        <motion.div 
          style={{ y: yText1 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-7 backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4" />
          The Global Hacker Command Arena
        </motion.div>

        <motion.h1 
          style={{ y: yText1 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
          className="text-5xl sm:text-[4rem] md:text-[5.25rem] font-extrabold tracking-tighter text-slate-900 dark:text-white leading-[1.05] max-w-4xl"
        >
          Build the Future.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Without the Friction.
          </span>
        </motion.h1>

        <motion.p 
          style={{ y: yText2 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-7 text-[17px] sm:text-[19px] text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed"
        >
          Join world-class hackathons, match with brilliant teammates, request live technical mentors, and submit your builds on a sleek, production-grade interface.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          style={{ y: yBtns }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-9 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto"
        >
          <Link href="#hackathons-list" className="w-full px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 text-[15px] group hover:scale-105">
            Browse Live Hackathons
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </Link>
          <Link href="/host" className="w-full px-7 py-3.5 border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold rounded-2xl transition-all text-[15px] flex items-center justify-center backdrop-blur-md hover:scale-105">
            Host an Event
          </Link>
        </motion.div>

        {/* Countdown Banner */}
        <motion.div 
          style={{ y: yBanner }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 w-full max-w-xl glass p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-200/60 dark:border-white/10 shadow-2xl shadow-blue-500/5"
        >
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-widest">Next Global Sprint</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">AI Innovation Battle</p>
          </div>
          <div className="flex gap-3 text-center">
            {[{ label: "Days", val: timeLeft.days }, { label: "Hours", val: timeLeft.hours }, { label: "Mins", val: timeLeft.minutes }].map((t) => (
              <div key={t.label} className="flex flex-col bg-slate-100 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 rounded-xl px-4 py-2 min-w-[70px]">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{t.val}</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* --- How It Works Timeline --- */}
      <section ref={journeyRef} className="relative z-10 px-6 py-24 bg-slate-50 dark:bg-slate-950/30 border-y border-slate-200/60 dark:border-slate-800/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">The Hacker Journey</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mt-4 leading-relaxed">A seamless flow from discovering an event to submitting your final repository. No friction, just building.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative mt-16 pt-12">
            {/* Desktop connecting line (Base track) */}
            <div className="hidden md:block absolute top-0 left-[15%] right-[15%] h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0 overflow-hidden">
              {/* Animated Progress Line that draws on scroll */}
              <motion.div 
                style={{ scaleX: lineScale, originX: 0 }}
                className="absolute inset-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              />
            </div>
            
            {[
              { idx: "01", title: "Global Profile", desc: "Set up your developer portfolio once. Upload your resume, link GitHub, and apply to any hackathon instantly.", icon: <Code className="w-6 h-6 text-blue-500" /> },
              { idx: "02", title: "Match & Assemble", desc: "Use our intelligent Matching Dashboard to find hackers looking for teams, or use private invite codes.", icon: <Users className="w-6 h-6 text-blue-500" /> },
              { idx: "03", title: "Build & Submit", desc: "Access the Live Mentor Queue for debugging help. Submit your project seamlessly before the countdown ends.", icon: <Zap className="w-6 h-6 text-blue-500" /> }
            ].map((step, i) => (
              <div key={step.idx} className="relative">
                {/* Timeline Dot */}
                <div className="hidden md:block absolute -top-[50px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10" />
                
                <TiltCard className="h-full">
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: i * 0.2 }}
                    className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-8 relative z-10 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 h-full"
                  >
                    <div className="absolute top-6 right-6 text-6xl font-black text-slate-900/5 dark:text-white/5 select-none">{step.idx}</div>
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-6 shadow-inner border border-blue-500/20">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{step.desc}</p>
                  </motion.div>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Live Events Grid (Tilt Cards) --- */}
      <section id="hackathons-list" className="relative z-10 px-6 py-28 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest mb-4"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Actively Recruiting
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">Discover Live Events</h2>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedHackathons.map((hack, idx) => {
            let tracksArr: string[] = [];
            try { tracksArr = JSON.parse(hack.tracks); } catch (e) { tracksArr = []; }
            return (
              <TiltCard key={hack.id}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="glass rounded-3xl overflow-hidden border border-slate-200/60 dark:border-white/10 flex flex-col group h-full shadow-lg shadow-slate-200/20 dark:shadow-none"
                >
                  {/* Image Header */}
                  <div className="h-52 w-full relative overflow-hidden bg-slate-900">
                    <img 
                      src={hack.cover_image || "/placeholder.jpg"} 
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

        {/* Explore All Events CTA */}
        <div className="mt-16 flex justify-center">
          <Link 
            href="/explore" 
            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl flex items-center gap-2.5 text-sm hover:scale-105"
          >
            Explore All Hackathons
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* --- Hacker Testimonials --- */}
      <section className="relative z-10 py-24 bg-blue-600 dark:bg-blue-900/20 border-y border-blue-500/20 overflow-hidden">
        {/* Fixed background for true CSS Parallax effect */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=2000&auto=format&fit=crop&q=80')] bg-cover bg-fixed bg-center opacity-5 dark:opacity-10 mix-blend-overlay" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">Built by Hackers. For Hackers.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl text-white"
            >
              <Quote className="w-10 h-10 text-blue-300 mb-4 opacity-50" />
              <p className="text-lg leading-relaxed font-medium mb-6">&quot;I didn't have a team going into the Quantum Sprint. I updated my skills on Matrix, unlocked the Matcher Dashboard, and found two amazing engineers. We built an app in 48 hours and took home 1st place!&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-300 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" alt="Sarah J." />
                </div>
                <div>
                  <h4 className="font-bold">Sarah Jenkins</h4>
                  <span className="text-sm text-blue-200">Full-Stack Engineer</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl text-white"
            >
              <Quote className="w-10 h-10 text-blue-300 mb-4 opacity-50" />
              <p className="text-lg leading-relaxed font-medium mb-6">&quot;The Live Mentor Queue is a game changer. We hit a massive CORS bug at 3:00 AM. Submitted a ticket via the workspace, and a mentor jumped into our repo 5 minutes later. Matrix saved our project.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-300 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop" alt="David M." />
                </div>
                <div>
                  <h4 className="font-bold">David Chen</h4>
                  <span className="text-sm text-blue-200">Web3 Developer</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FAQ Accordion --- */}
      <section className="relative z-10 px-6 py-28 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">Questions? We got you.</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg mt-4">Everything you need to know about competing on the Matrix platform.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-8 py-6 text-left font-bold text-lg text-slate-800 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                {faq.question}
                <div className={`p-2 rounded-full transition-colors ${openFaq === i ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                  {openFaq === i ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
              </button>
              
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-8 pb-8 pt-2 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="relative z-10 bg-slate-900 dark:bg-slate-950 py-16 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 group mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Terminal className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">MATRIX</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm mb-6">The world's most advanced multi-tenant hackathon infrastructure. Designed for speed, collaboration, and high-performance engineering.</p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"><Globe className="w-4 h-4" /></Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"><Code className="w-4 h-4" /></Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#hackathons-list" className="hover:text-white transition-colors">Browse Events</Link></li>
              <li><Link href="/host" className="hover:text-white transition-colors">Host a Hackathon</Link></li>
              <li><Link href="/community" className="hover:text-white transition-colors">Community Hub</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Code of Conduct</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-white/10 pt-8 text-xs font-medium flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Matrix Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Built for Builders.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

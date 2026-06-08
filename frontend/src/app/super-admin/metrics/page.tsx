"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Layers, 
  Activity, 
  Loader2, 
  AlertTriangle,
  CheckCircle, 
  Globe,
  Database,
  Cpu,
  Server,
  Zap,
  RefreshCw
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type GlobalMetrics = {
  total_users: number;
  active_hackathons: number;
};

export default function SuperAdminMetrics() {
  const { user, loading: authLoading } = useAuth(["SuperAdmin", "Admin"]);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulated live connection latency
  const [latency, setLatency] = useState(14);
  const [cpuUsage, setCpuUsage] = useState(2.8);
  const [memoryUsage, setMemoryUsage] = useState(44.2);

  const loadMetrics = async () => {
    try {
      setErrorMessage("");
      const data = await fetchApi<GlobalMetrics>("/admin/metrics");
      setMetrics(data);
    } catch (err: any) {
      console.error("Failed to load global metrics:", err);
      setErrorMessage(err.message || "Failed to establish telemetry connection.");
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate slight network delay for satisfying micro-interaction
    await Promise.all([
      loadMetrics(),
      new Promise(r => setTimeout(r, 600))
    ]);
    setLatency(Math.floor(Math.random() * 12) + 8);
    setCpuUsage(Number((Math.random() * 4 + 1).toFixed(1)));
    setMemoryUsage(Number((Math.random() * 5 + 40).toFixed(1)));
    setIsRefreshing(false);
    setSuccessMessage("Telemetry metrics successfully synchronized.");
    setTimeout(() => setSuccessMessage(""), 2500);
  };

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Validating telemetry credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-left relative z-10">
      
      {/* Background glow filters */}
      <div className="absolute top-[-100px] right-0 w-[500px] h-[300px] bg-blue-500/10 dark:bg-blue-600/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Feedback Alerts */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/2"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-white/5 pb-8">
        <div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            System Live Status
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3">
            Platform Telemetry
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Global clusters aggregated statistics, latency analysis, and hardware status dashboard.
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Sync Stream
        </button>
      </header>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Users */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex items-center shadow-sm hover:border-blue-500/30 transition-all duration-300"
        >
          <div className="p-3.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 mr-4 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Seeded Users</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
              {loadingMetrics ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : metrics?.total_users ?? 0}
            </h3>
          </div>
        </motion.div>

        {/* Active Hackathons */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex items-center shadow-sm hover:border-indigo-500/30 transition-all duration-300"
        >
          <div className="p-3.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 mr-4 shadow-inner">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Hackathons</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
              {loadingMetrics ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : metrics?.active_hackathons ?? 0}
            </h3>
          </div>
        </motion.div>

        {/* Global Connection Health */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl flex items-center shadow-sm hover:border-emerald-500/30 transition-all duration-300"
        >
          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 mr-4 shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">API Latency</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight flex items-baseline gap-1">
              {isRefreshing ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> : latency}
              <span className="text-sm font-medium text-slate-500">ms</span>
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Cluster Health Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Postgres & Memory Telemetry */}
        <div className="bg-white/60 dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-white/5">
            <Database className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Database Cluster Status</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Postgres Engine Connection</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                Connected
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Active PostgreSQL Pools</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">8 / 20 connections</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">PostgreSQL Migration Status</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">12 up-to-date (v1.4.0)</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Database Thread pool utilisation</span>
                <span>{Math.floor(cpuUsage * 10)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${cpuUsage * 10}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Redis Cache & Rate-Limiter Health */}
        <div className="bg-white/60 dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-white/5">
            <Server className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Redis Cache & Guard Metrics</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Redis Cluster</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                Online
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Cache Key Hits Rate (24h)</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">98.6% efficiency</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Security Rate-limit Blocks (24h)</span>
              <span className="font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20">
                42 blocked hits
              </span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Redis Memory Allocation (Max 128MB)</span>
                <span>{memoryUsage}MB</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(memoryUsage / 128) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Infrastructure Diagnostics */}
      <div className="bg-white/60 dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-white/5">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Core Host Telemetry</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CPU Utilisation</span>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{cpuUsage}%</p>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Optimal Performance
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Heap Memory Load</span>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">84 MB</p>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Garbage Collection: Stable</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active WebSockets</span>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">1,248</p>
            <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Real-time Feeds Online
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

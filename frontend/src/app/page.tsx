"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Terminal, Code2, Users, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-wide">
            THE ULTIMATE HACKATHON COMMAND MATRIX
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6">
            Build the Future.<br />
            <span className="text-primary">Without the Chaos.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
            Experience the most advanced hackathon infrastructure. Intelligent mentor routing, real-time metrics, and seamless team collaboration.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-primary rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
              >
                Register Now
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/community"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-foreground bg-surface border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Explore Community
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Pulse Countdown */}
        <motion.div 
          className="mt-20 flex gap-6 text-center"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          {[
            { label: "DAYS", value: "14" },
            { label: "HOURS", value: "08" },
            { label: "MINS", value: "45" },
          ].map((time, idx) => (
            <div key={idx} className="flex flex-col items-center bg-surface px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-4xl font-black text-foreground font-mono">{time.value}</span>
              <span className="text-xs font-bold text-slate-500 mt-1">{time.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Event Tracks Section */}
      <section className="py-24 bg-surface border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Event Tracks</h2>
            <p className="mt-4 text-slate-500">Choose your domain and dominate the competition.</p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { title: "Artificial Intelligence", desc: "Build agentic workflows and LLM-powered tools.", icon: <Terminal className="w-8 h-8" /> },
              { title: "Web3 & Blockchain", desc: "Decentralized apps, smart contracts, and DeFi.", icon: <Code2 className="w-8 h-8" /> },
              { title: "Cybersecurity", desc: "Zero-trust architectures and threat detection.", icon: <ShieldAlert className="w-8 h-8" /> },
            ].map((track, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="bg-background p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center text-primary mb-6">
                  {track.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{track.title}</h3>
                <p className="text-slate-500 leading-relaxed">{track.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

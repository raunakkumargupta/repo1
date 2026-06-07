"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, TerminalSquare, LayoutDashboard, ListOrdered } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Don't show navbar on auth pages
  if (pathname === "/login" || pathname === "/forget-password") {
    return null;
  }

  const navItems = [
    { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Mentor Queue", href: "/mentor-queue", icon: ListOrdered },
  ];

  return (
    <nav className="bg-[var(--surface)] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex flex-shrink-0 items-center">
              <TerminalSquare className="h-8 w-8 text-[var(--primary)]" />
              <span className="ml-2 text-xl font-bold text-[var(--foreground)] tracking-tight">Matrix</span>
            </Link>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out flex items-center ${
                  pathname === item.href
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--foreground)]"
                }`}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)] transition-all duration-200"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 overflow-hidden bg-[var(--surface)]"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 flex items-center ${
                    pathname === item.href
                      ? "bg-[var(--primary)] text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--foreground)]"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

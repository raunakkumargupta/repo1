"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, Terminal, LayoutDashboard, Users, LogOut,
  FolderGit2, UserCircle2, Activity, HelpCircle, Award, ChevronLeft, ChevronRight,
  Sun, Moon, Compass, CalendarPlus, Settings, ShieldAlert, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCometChat } from "@/components/providers/CometChatProvider";

type NavItem = { name: string; href: string; icon: any };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logoutUser } = useCometChat();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [user, setUser] = useState<{ id: string; role: string } | null | undefined>(undefined);
  const [authChecked, setAuthChecked] = useState(false);
  const [hackathonId, setHackathonId] = useState<string | null>(null);
  const [preference, setPreference] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);


  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data);
        setAuthChecked(true);
      })
      .catch(() => {
        setUser(null);
        setAuthChecked(true);
      });
  }, [pathname]);

  // Role-based route protection guards
  useEffect(() => {
    // Only redirect if auth check has completed (user is explicitly null, not undefined/loading)
    if (!authChecked) return; // still loading, don't redirect
    if (user === null) {
      // Session expired or not logged in -> Redirect to login
      router.push("/login");
    } else if (user) {
      if (user.role === "SuperAdmin" && pathname === "/dashboard") {
        router.push("/super-admin/metrics");
      } else if (user.role === "Admin" && pathname === "/dashboard") {
        router.push("/admin");
      }
    }
  }, [user, authChecked, pathname, router]);

  useEffect(() => {
    const match = pathname.match(/^\/(workspace|organizer|mentor|judge)\/([a-f0-9-]+)/i);
    if (match) {
      const hid = match[2];
      const spaceType = match[1];
      setHackathonId(hid);

      // Check if user is staff for this hackathon
      fetch(`/api/hackathons/${hid}/staff-role`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.role === "Mentor" && spaceType === "workspace") {
            // Mentor shouldn't be in workspace, push them to mentor dashboard
            router.push(`/mentor/${hid}`);
          }
        })
        .catch(() => {});

      // Fetch hackathon details to check creator ownership
      fetch(`/api/hackathons/${hid}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && user) {
            setIsCreator(user.id === data.organizer_id);
          } else {
            setIsCreator(false);
          }
        })
        .catch(() => setIsCreator(false));

      if (spaceType === "workspace") {
        fetch(`/api/hackathons/${hid}/my-registration`)
          .then((res) => (res.ok ? res.json() : null))
          .then((reg) => {
            if (reg && reg.approval_status === "Accepted") {
              setPreference(reg.team_preference);
            } else setPreference(null);
          })
          .catch(() => setPreference(null));
      } else setPreference(null);
    } else {
      setHackathonId(null);
      setPreference(null);
      setIsCreator(false);
    }
  }, [pathname, router, user]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    try {
      await logoutUser();
    } catch (e) {
      console.error("CometChat logout error:", e);
    }
    setUser(null);
    router.push("/login");
  };

  const navItems: NavItem[] = [];
  if (user === undefined) {
    // Prevent layouts flashing general routes during load
  } else if (user?.role === "SuperAdmin") {
    navItems.push({ name: "Platform Metrics", href: "/super-admin/metrics", icon: Activity });
    navItems.push({ name: "Tenant Verification", href: "/super-admin/organizers", icon: Layers });
    navItems.push({ name: "Global Moderation", href: "/super-admin/moderation", icon: ShieldAlert });
    navItems.push({ name: "All Hackathons", href: "/super-admin/hackathons", icon: FolderGit2 });
  } else if (user?.role === "Admin") {
    navItems.push({ name: "Admin Console", href: "/admin", icon: ShieldAlert });
  } else {
    if (hackathonId) {
      if (pathname.startsWith("/workspace/")) {
        navItems.push({ name: "Dashboard", href: `/workspace/${hackathonId}`, icon: LayoutDashboard });
        if (preference === "Looking for Team") {
          navItems.push({ name: "Find Team", href: `/workspace/${hackathonId}/find-team`, icon: Users });
        }
        if (preference === "Solo" || preference === "Has Team") {
          navItems.push({ name: "My Project", href: `/workspace/${hackathonId}/project`, icon: FolderGit2 });
        }
        if (user?.role === "Organizer" && isCreator) {
          navItems.push({ name: "Organizer Console", href: `/workspace/${hackathonId}/organizer`, icon: Settings });
        }
        navItems.push({ name: "Explore", href: "/explore", icon: Compass });
        navItems.push({ name: "Hosting", href: "/host", icon: CalendarPlus });
        navItems.push({ name: "Profile", href: "/profile", icon: UserCircle2 });
      } else if (pathname.startsWith("/organizer/")) {
        navItems.push({ name: "Organizer Console", href: `/organizer/${hackathonId}`, icon: LayoutDashboard });
      } else if (pathname.startsWith("/mentor/")) {
        navItems.push({ name: "Live Queue", href: `/mentor/${hackathonId}`, icon: HelpCircle });
      } else if (pathname.startsWith("/judge/")) {
        navItems.push({ name: "Submissions Grid", href: `/judge/${hackathonId}`, icon: Award });
      }
    } else {
      navItems.push({ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
      navItems.push({ name: "Explore", href: "/explore", icon: Compass });
      navItems.push({ name: "Hosting", href: "/host", icon: CalendarPlus });
      navItems.push({ name: "Profile", href: "/profile", icon: UserCircle2 });
    }
  }



  if (!mounted) {
    return <div className="flex h-screen overflow-hidden bg-background"></div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isDesktopCollapsed ? 80 : 260 }}
        className="hidden md:flex flex-col h-full bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/40 relative z-20"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/60 dark:border-slate-800/40">
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.3)] min-w-[32px] overflow-hidden">
              <img src="/logo.png" alt="Matrix Logo" className="w-full h-full object-cover" />
            </div>
            {!isDesktopCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-extrabold tracking-tighter text-slate-900 dark:text-white whitespace-nowrap">
                MATRIX
              </motion.span>
            )}
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          className="absolute -right-3 top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-slate-500 hover:text-blue-500 shadow-md z-30"
        >
          {isDesktopCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={isDesktopCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 min-w-[20px]" />
                {!isDesktopCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Bottom panel */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/40 flex flex-col gap-1">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-500/10 dark:hover:bg-white/5 transition-all cursor-pointer ${isDesktopCollapsed ? "justify-center" : ""}`}
            title={isDesktopCollapsed ? "Toggle theme" : undefined}
          >
            {theme === "dark" ? <Sun className="h-5 w-5 min-w-[20px]" /> : <Moon className="h-5 w-5 min-w-[20px]" />}
            {!isDesktopCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>

          {user && (
            <button
              onClick={logout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer ${isDesktopCollapsed ? "justify-center" : ""}`}
              title={isDesktopCollapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-5 w-5 min-w-[20px]" />
              {!isDesktopCollapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </motion.aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/40 z-30 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Matrix Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-extrabold tracking-tighter text-slate-900 dark:text-white">
            MATRIX
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button onClick={() => setIsMobileOpen(true)} className="p-2 text-slate-500 dark:text-slate-400">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-white dark:bg-slate-950 z-50 md:hidden flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">Menu</span>
                <button onClick={() => setIsMobileOpen(false)} className="p-2 text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-left"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                {user && (
                  <button onClick={() => { setIsMobileOpen(false); logout(); }} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 cursor-pointer text-left">
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto pt-16 md:pt-0 relative bg-slate-50/50 dark:bg-slate-950/20">
        <div className="p-4 sm:p-8 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	Menu,
	X,
	Terminal,
	LayoutDashboard,
	Users,
	LogOut,
	LogIn,
	UserPlus,
	Home,
	Sun,
	Moon,
	FolderGit2,
	UserCircle2,
	Activity,
	HelpCircle,
	Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type UserSession = { id: string; role: string } | null;

const AUTH_PAGES = ["/login", "/register", "/forget-password"];

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const [user, setUser] = useState<UserSession>(undefined as any);
	const [theme, setTheme] = useState<"light" | "dark">("dark");
	const [hackathonId, setHackathonId] = useState<string | null>(null);
	const [preference, setPreference] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);

	const pathname = usePathname();
	const router = useRouter();

	// 1. Fetch Auth session
	useEffect(() => {
		fetch("/api/auth/me")
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => setUser(data))
			.catch(() => setUser(null));
	}, [pathname]);

	// 2. Manage Theme
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
			// default dark
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

	// 3. Hackathon Context Detection
	useEffect(() => {
		const match = pathname.match(/^\/(workspace|organizer|mentor|judge)\/([a-f0-9-]+)/i);
		if (match) {
			const hid = match[2];
			setHackathonId(hid);

			// Fetch preference if context is workspace
			if (match[1] === "workspace") {
				fetch(`/api/hackathons/${hid}/my-registration`)
					.then((res) => (res.ok ? res.json() : null))
					.then((reg) => {
						if (reg && reg.approval_status === "Accepted") {
							setPreference(reg.team_preference);
						} else {
							setPreference(null);
						}
					})
					.catch(() => setPreference(null));
			} else {
				setPreference(null);
			}
		} else {
			setHackathonId(null);
			setPreference(null);
		}
	}, [pathname]);

	const logout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		setUser(null);
		router.push("/login");
		router.refresh();
	};



	const DASHBOARD_ROUTES = ["/workspace", "/organizer", "/mentor", "/judge", "/profile", "/super-admin", "/admin", "/dashboard", "/explore", "/host"];
	const isDashboardRoute = DASHBOARD_ROUTES.some(r => pathname.startsWith(r));

	if (!mounted) return null;
	if (AUTH_PAGES.includes(pathname) || isDashboardRoute) return null;

	// Build navigation items
	const navItems = [];

	if (hackathonId) {
		// Inside specific hackathon context
		if (pathname.startsWith("/workspace/")) {
			navItems.push({ name: "Dashboard", href: `/workspace/${hackathonId}`, icon: LayoutDashboard });
			if (preference === "Looking for Team") {
				navItems.push({ name: "Find Team", href: `/workspace/${hackathonId}/find-team`, icon: Users });
			}
			if (preference === "Solo" || preference === "Has Team") {
				navItems.push({ name: "My Project", href: `/workspace/${hackathonId}/project`, icon: FolderGit2 });
			}
			navItems.push({ name: "Profile", href: "/profile", icon: UserCircle2 });
		} else if (pathname.startsWith("/organizer/")) {
			navItems.push({ name: "Overview", href: `/organizer/${hackathonId}`, icon: LayoutDashboard });
			navItems.push({ name: "Applications", href: `/organizer/${hackathonId}/applications`, icon: Users });
			navItems.push({ name: "Broadcasts", href: `/organizer/${hackathonId}/broadcasts`, icon: Activity });
		} else if (pathname.startsWith("/mentor/")) {
			navItems.push({ name: "Live Queue", href: `/mentor/${hackathonId}`, icon: HelpCircle });
		} else if (pathname.startsWith("/judge/")) {
			navItems.push({ name: "Submissions Grid", href: `/judge/${hackathonId}`, icon: Award });
		}
	} else {
		// Global Context
		if (!user || (user.role !== "SuperAdmin" && user.role !== "Admin")) {
			navItems.push({ name: "Explore", href: "/explore", icon: Home });
			navItems.push({ name: "Community Hub", href: "/community", icon: Users });
		}
		if (user) {
			if (user.role === "SuperAdmin") {
				navItems.push({ name: "Control Center", href: "/super-admin/metrics", icon: LayoutDashboard });
			} else if (user.role === "Admin") {
				navItems.push({ name: "Admin Console", href: "/admin", icon: LayoutDashboard });
			} else {
				navItems.push({ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
				navItems.push({ name: "Profile", href: "/profile", icon: UserCircle2 });
			}
		}
	}

	return (
		<nav className="sticky top-0 z-50 w-full bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/40 transition-colors duration-200">
			<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
					<div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform overflow-hidden">
						<img src="/logo.png" alt="Matrix Logo" className="w-full h-full object-cover" />
					</div>
					<span className="text-lg font-extrabold tracking-tighter text-slate-900 dark:text-white">
						MATRIX
					</span>
				</Link>

				{/* Desktop Nav Items */}
				<div className="hidden md:flex items-center gap-1">
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.name}
								href={item.href}
								className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
									isActive
										? "text-blue-600 dark:text-blue-400 bg-blue-500/5"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
								}`}
							>
								<item.icon className="h-4 w-4" />
								{item.name}
							</Link>
						);
					})}
				</div>

				{/* Right Side Controls */}
				<div className="hidden md:flex items-center gap-3">
					{/* Theme Switcher */}
					<button
						onClick={toggleTheme}
						className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
						aria-label="Toggle theme"
					>
						{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>

					{user === undefined ? (
						<div className="w-24 h-8 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />
					) : user ? (
						<>
							<span className="text-[10px] font-bold bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
								{user.role}
							</span>
							<button
								onClick={logout}
								className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
							>
								<LogOut className="h-4 w-4" />
								Sign Out
							</button>
						</>
					) : (
						<>
							<Link
								href="/login"
								className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
							>
								<LogIn className="h-4 w-4" />
								Sign In
							</Link>
							<Link
								href="/register"
								className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all shadow-[0_0_12px_rgba(59,130,246,0.2)]"
							>
								<UserPlus className="h-4 w-4" />
								Sign Up
							</Link>
						</>
					)}
				</div>

				{/* Mobile Hamburger */}
				<div className="flex md:hidden items-center gap-2">
					<button
						onClick={toggleTheme}
						className="p-2 rounded-lg text-slate-500 dark:text-slate-400"
					>
						{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
					>
						{isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>

			{/* Mobile Drawer */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="md:hidden border-t border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950 overflow-hidden"
					>
						<div className="px-4 py-4 space-y-1">
							{navItems.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									onClick={() => setIsOpen(false)}
									className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
										pathname === item.href
											? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
									}`}
								>
									<item.icon className="h-5 w-5" />
									{item.name}
								</Link>
							))}
							<div className="border-t border-slate-200 dark:border-slate-800/40 pt-3 mt-2 space-y-1">
								{user ? (
									<>
										<div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-widest">
											Signed in as {user.role}
										</div>
										<button
											onClick={() => {
												setIsOpen(false);
												logout();
											}}
											className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/5 transition-all text-left"
										>
											<LogOut className="h-5 w-5" />
											Sign Out
										</button>
									</>
								) : (
									<>
										<Link
											href="/login"
											onClick={() => setIsOpen(false)}
											className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
										>
											<LogIn className="h-5 w-5" />
											Sign In
										</Link>
										<Link
											href="/register"
											onClick={() => setIsOpen(false)}
											className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-blue-600 text-white"
										>
											<UserPlus className="h-5 w-5" />
											Sign Up
										</Link>
									</>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</nav>
	);
}

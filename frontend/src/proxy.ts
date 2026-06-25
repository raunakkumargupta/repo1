import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Routes that don't require any auth
const PUBLIC_ROUTES = ["/", "/login", "/register", "/forget-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("jwt")?.value;
  let role: string | null = null;
  let userId: string | null = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "737334e376af72b3ad827135c8f5a13b7debbe9da07c4c76d1f395686bb7bc7f"
      );
      const { payload } = await jwtVerify(token, secret);
      role = (payload.role as string) || null;
      userId = (payload.user_id as string) || null;
    } catch {
      // Invalid / expired token — treat as unauthenticated
      role = null;
      userId = null;
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  // --- Unauthenticated ---
  if (!role) {
    if (isPublicRoute) return NextResponse.next();
    // Block all protected routes → redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // --- Authenticated: redirect away from /login and /register ---
  if (pathname === "/login" || pathname === "/register") {
    const url = request.nextUrl.clone();
    if (role === "SuperAdmin" || role === "Admin") url.pathname = "/super-admin";
    else if (role === "Organizer") url.pathname = "/dashboard";
    else if (role === "Mentor" || role === "Agent" || role === "Manager") url.pathname = "/dashboard";
    else url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // --- Role-based route blocking ---
  
  // Super Admin panel
  if (pathname.startsWith("/super-admin") && role !== "SuperAdmin" && role !== "Admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Organizer panels (check /organizer/[hackathon_id] and /workspace/[hackathon_id]/organizer)
  const workspaceOrganizerMatch = pathname.match(/^\/workspace\/([^/]+)\/organizer(?:\/|$)/i);
  const organizerMatch = pathname.match(/^\/organizer\/([^/]+)(?:\/|$)/i);

  if (workspaceOrganizerMatch || organizerMatch) {
    // 1. Only allow Organizer, Admin, SuperAdmin roles
    if (role !== "Organizer" && role !== "SuperAdmin" && role !== "Admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // 2. If Organizer, check ownership
    if (role === "Organizer") {
      const hackathonId = workspaceOrganizerMatch ? workspaceOrganizerMatch[1] : organizerMatch![1];
      try {
        const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/api/hackathons/${hackathonId}`);
        if (!res.ok) {
          // If hackathon doesn't exist, redirect to dashboard
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
        const hackathon = await res.json();
        if (hackathon.organizer_id !== userId) {
          // Organizer is not the owner -> Redirect to dashboard
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      } catch (err) {
        console.error("Middleware hackathon ownership check error:", err);
        // On backend/network error, fail secure (block access)
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  // Mentor panel
  if (pathname.startsWith("/mentor") && role !== "Mentor" && role !== "Agent" && role !== "Manager" && role !== "SuperAdmin" && role !== "Admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Judge panel
  if (pathname.startsWith("/judge") && role !== "Judge" && role !== "Moderator" && role !== "SuperAdmin" && role !== "Admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

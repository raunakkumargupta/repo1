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

  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "super_secret_jwt_key"
      );
      const { payload } = await jwtVerify(token, secret);
      role = (payload.role as string) || null;
    } catch {
      // Invalid / expired token — treat as unauthenticated
      role = null;
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

  // Organizer panel
  if (pathname.startsWith("/organizer") && role !== "Organizer" && role !== "SuperAdmin" && role !== "Admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
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

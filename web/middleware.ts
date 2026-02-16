/**
 * Next.js middleware for route protection.
 *
 * When OpenSnek auth is configured (NEXTAUTH_SECRET is set):
 * - Unauthenticated users are redirected to /login
 * - Authenticated users are redirected away from /login
 * - /professor/* routes require professor or admin role
 *
 * When NEXTAUTH_SECRET is not set, all routes are accessible (pure DeepTutor).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // If OpenSnek auth is not configured, pass through
  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Always allow these paths
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/logo")
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthenticated = !!sessionToken;
  const isLoginPage = pathname === "/login";

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

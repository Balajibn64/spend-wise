import { NextRequest, NextResponse } from "next/server";

/**
 * `sw_session` is a plain (non-HttpOnly) marker cookie set by the client
 * right after a successful login/signup and cleared on logout — see
 * auth-context.tsx. It carries no security meaning of its own (the real
 * session is the HttpOnly refresh-token cookie the backend validates on
 * every request); it only lets this edge middleware redirect unauthenticated
 * visitors before the dashboard shell mounts, instead of the previous
 * client-side useEffect that briefly rendered the page first.
 */
const SESSION_COOKIE = "sw_session";

const PROTECTED_PATHS = [
  "/dashboard",
  "/transactions",
  "/budgets",
  "/quick-track",
  "/recurring",
  "/borrow-lend",
  "/settings",
];

const AUTH_PATHS = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/quick-track/:path*",
    "/recurring/:path*",
    "/borrow-lend/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};

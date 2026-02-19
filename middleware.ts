import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_USER_SESSION_COOKIE,
  computeDemoAccessToken,
  decodeUserSession,
} from "./app/lib/demoAuth";

// Skip password gate when DEMO_ACCESS_PASSWORD is not set (local dev)
function isPasswordGateEnabled(): boolean {
  return !!process.env.DEMO_ACCESS_PASSWORD;
}

export async function middleware(request: NextRequest) {
  if (!isPasswordGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow demo login (first screen) and static assets for everyone
  if (
    pathname === "/demo-login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/demo/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|svg|jpg|jpeg|gif|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const accessCookie = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  const expectedToken = await computeDemoAccessToken(
    process.env.DEMO_ACCESS_PASSWORD!
  );

  // No demo_access -> must pass first screen (password gate)
  if (accessCookie !== expectedToken) {
    const loginUrl = new URL("/demo-login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Has demo_access: allow /login and public share links without user session
  if (pathname === "/login" || pathname.startsWith("/share/")) {
    return NextResponse.next();
  }

  // For /projects and all other app routes: require user session
  const sessionCookie = request.cookies.get(DEMO_USER_SESSION_COOKIE)?.value;
  const decoded = await decodeUserSession(
    process.env.DEMO_ACCESS_PASSWORD!,
    sessionCookie
  );
  if (!decoded) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!api|_next/static|_next/image).*)",
  ],
};

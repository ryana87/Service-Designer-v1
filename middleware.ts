import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_ACCESS_COOKIE, computeDemoAccessToken } from "./app/lib/demoAuth";

// Skip password gate when DEMO_ACCESS_PASSWORD is not set (local dev)
function isPasswordGateEnabled(): boolean {
  return !!process.env.DEMO_ACCESS_PASSWORD;
}

export async function middleware(request: NextRequest) {
  if (!isPasswordGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow demo login page and static assets
  if (
    pathname === "/demo-login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/demo/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|svg|jpg|jpeg|gif|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  const expected = await computeDemoAccessToken(process.env.DEMO_ACCESS_PASSWORD!);

  if (cookieValue === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/demo-login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
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

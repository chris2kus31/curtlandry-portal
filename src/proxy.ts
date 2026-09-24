import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/forbidden"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get("auth_session")?.value === "1";

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/time-off",
    "/time-off/:path*",
    "/team",
    "/team/:path*",
    "/admin",
    "/admin/:path*",
    "/woo-discounts",
    "/woo-discounts/:path*",
    "/people-ops",
    "/people-ops/:path*",
  ],
};

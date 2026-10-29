import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/server/session-token";

/**
 * Optimistic auth redirects. The real checks happen in the route handlers
 * and server actions, next to the data.
 */

const APP_ROUTES = ["/today", "/health", "/care", "/records", "/chat", "/profile", "/onboarding"];
const AUTH_ROUTES = ["/login", "/signup"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isApp = APP_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
  const isAuth = AUTH_ROUTES.includes(path);
  if (!isApp && !isAuth) return NextResponse.next();

  const session = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (isApp && !session) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (isAuth && session) return NextResponse.redirect(new URL("/today", req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\.(?:png|ico|svg)$).*)"],
};

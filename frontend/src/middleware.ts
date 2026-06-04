import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicRoutes = [
  "/",
  "/login",
  "/forgot-password",
  "/change-password",
];
const authRoutes = ["/login"];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Apply intl middleware first

  const intlResponse = intlMiddleware(req);

  // Get locale
  const locale =
    routing.locales.find((l) => pathname.startsWith(`/${l}`)) ??
    routing.defaultLocale;

  const pathnameWithoutLocale =
    pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  // 🔥 FIXED: Check for ANY cookie that starts with session token patterns
  const allCookies = req.cookies.getAll();

  // Look for any cookie that starts with these prefixes (handles chunked cookies)
  let hasSessionToken = false;

  for (const cookie of allCookies) {
    if (
      cookie.name.startsWith("next-auth.session-token") ||
      cookie.name.startsWith("__Secure-next-auth.session-token") ||
      cookie.name.startsWith("authjs.session-token") ||
      cookie.name.startsWith("__Secure-authjs.session-token")
    ) {
      hasSessionToken = true;
      break;
    }
  }

  const isPublicRoute = publicRoutes.includes(pathnameWithoutLocale);
  const isAuthRoute = authRoutes.includes(pathnameWithoutLocale);

  if (isAuthRoute && hasSessionToken) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  if (!isPublicRoute && !hasSessionToken) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathnameWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Allow access
  return intlResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files, API routes, etc.
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)",
  ],
};
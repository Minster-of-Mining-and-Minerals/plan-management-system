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

function hasSessionToken(req: NextRequest): boolean {
  return req.cookies.getAll().some(
    (cookie) =>
      cookie.name.startsWith("next-auth.session-token") ||
      cookie.name.startsWith("__Secure-next-auth.session-token") ||
      cookie.name.startsWith("authjs.session-token") ||
      cookie.name.startsWith("__Secure-authjs.session-token")
  );
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const intlResponse = intlMiddleware(req);

  const locale =
    routing.locales.find((l) => pathname.startsWith(`/${l}`)) ??
    routing.defaultLocale;

  const pathnameWithoutLocale =
    pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  const sessionToken = hasSessionToken(req);
  const isPublicRoute = publicRoutes.includes(pathnameWithoutLocale);
  const isAuthRoute = authRoutes.includes(pathnameWithoutLocale);

  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL(`/${locale}/profile`, req.url));
  }

  if (!isPublicRoute && !sessionToken) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathnameWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)",
  ],
};

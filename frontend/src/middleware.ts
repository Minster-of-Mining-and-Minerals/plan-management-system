import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicRoutes = [
  "/",
  "/login",
  "/forgot-password",
  "/change-password",
];
const authRoutes = ["/login"];

const patientPortalPrefixes = ["/patient"];
const internalPortalPrefixes = [
  "/dashboard",
  "/users",
  "/patients",
  "/branding",
  "/profile",
];

function hasSessionToken(req: NextRequest): boolean {
  return req.cookies.getAll().some(
    (cookie) =>
      cookie.name.startsWith("next-auth.session-token") ||
      cookie.name.startsWith("__Secure-next-auth.session-token") ||
      cookie.name.startsWith("authjs.session-token") ||
      cookie.name.startsWith("__Secure-authjs.session-token")
  );
}

function matchesPrefix(path: string, prefixes: string[]) {
  return prefixes.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

export default async function middleware(req: NextRequest) {
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
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const home =
      token?.home_route ||
      (token?.account_type === "PATIENT" ? "/patient/profile" : "/profile");
    return NextResponse.redirect(new URL(`/${locale}${home}`, req.url));
  }

  if (!isPublicRoute && !sessionToken) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", pathnameWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  if (sessionToken && !isPublicRoute && !isAuthRoute) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const accountType = token?.account_type ?? "INTERNAL";
    const isPatientRoute = matchesPrefix(pathnameWithoutLocale, patientPortalPrefixes);
    const isInternalRoute = matchesPrefix(
      pathnameWithoutLocale,
      internalPortalPrefixes
    );

    if (accountType === "PATIENT" && isInternalRoute) {
      return NextResponse.redirect(
        new URL(`/${locale}/patient/profile`, req.url)
      );
    }

    if (accountType === "INTERNAL" && isPatientRoute) {
      return NextResponse.redirect(new URL(`/${locale}/profile`, req.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)",
  ],
};

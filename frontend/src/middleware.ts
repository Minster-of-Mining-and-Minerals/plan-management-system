import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  AUTH_PUBLIC_ROUTES,
  isLegacyAuthPath,
  isLoginPath,
} from "./constants/authRoutes";

const intlMiddleware = createMiddleware(routing);

function notFoundResponse(): NextResponse {
  return new NextResponse(null, { status: 404, statusText: "Not Found" });
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const locale =
    routing.locales.find((l) => pathname.startsWith(`/${l}`)) ??
    routing.defaultLocale;

  const pathnameWithoutLocale =
    pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  if (isLegacyAuthPath(pathnameWithoutLocale)) {
    return notFoundResponse();
  }

  const allCookies = req.cookies.getAll();

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

  const isPublicRoute = AUTH_PUBLIC_ROUTES.includes(
    pathnameWithoutLocale as (typeof AUTH_PUBLIC_ROUTES)[number]
  );
  const isAuthRoute = isLoginPath(pathnameWithoutLocale);

  if (isAuthRoute && hasSessionToken) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  if (!isPublicRoute && !hasSessionToken) {
    return notFoundResponse();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)",
  ],
};

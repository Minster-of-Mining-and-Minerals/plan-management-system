export const AUTH_ROUTES = {
  login: "/access/identity/gateway/login",
  forgotPassword: "/access/identity/gateway/forgot-password",
  changePassword: "/access/identity/gateway/change-password",
} as const;

/** Deprecated paths — must not resolve; used only for callback-url normalization. */
export const LEGACY_AUTH_ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",
  changePassword: "/change-password",
} as const;

export const AUTH_PUBLIC_ROUTES = [
  "/",
  AUTH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.changePassword,
] as const;

const LOGIN_PATHS = new Set<string>([
  AUTH_ROUTES.login,
  LEGACY_AUTH_ROUTES.login,
]);

const LEGACY_AUTH_PATHS = new Set<string>(Object.values(LEGACY_AUTH_ROUTES));

export function isLegacyAuthPath(pathname: string): boolean {
  return LEGACY_AUTH_PATHS.has(pathname);
}

export function isLoginPath(pathname: string): boolean {
  return LOGIN_PATHS.has(pathname);
}

export function isGatewayAuthPath(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.login ||
    pathname === AUTH_ROUTES.forgotPassword ||
    pathname === AUTH_ROUTES.changePassword
  );
}

export function isChangePasswordPath(pathname: string): boolean {
  return pathname.includes(AUTH_ROUTES.changePassword);
}

export function resolvePostAuthRedirect(
  callbackUrl: string | null | undefined,
  defaultPath = "/dashboard"
): string {
  if (!callbackUrl || isLoginPath(callbackUrl) || isLegacyAuthPath(callbackUrl)) {
    return defaultPath;
  }
  return callbackUrl;
}

/** Neutral post-logout landing — avoids exposing the gateway login URL. */
export const POST_LOGOUT_PATH = "/" as const;

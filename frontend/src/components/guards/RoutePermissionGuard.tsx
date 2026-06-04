"use client";

import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/permission-guard";
import {
  getDefaultFallbackRoute,
  matchRoutePermission,
} from "@/lib/route-permissions";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AccessDenied } from "./AccessDenied";

interface RoutePermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Enforces route-level permissions for all private routes.
 * Waits for auth + permissions before rendering children.
 */
export function RoutePermissionGuard({ children }: RoutePermissionGuardProps) {
  const pathname = usePathname();
  const { permissions, isLoading } = useAuth();

  if (isLoading) {
    return <Loading01 />;
  }

  const rule = matchRoutePermission(pathname);

  if (rule === null || !canAccessRoute(permissions, rule)) {
    const fallbackPath = getDefaultFallbackRoute(permissions);
    return <AccessDenied attemptedPath={pathname} fallbackPath={fallbackPath} />;
  }

  return <>{children}</>;
}

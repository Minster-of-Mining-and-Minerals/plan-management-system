"use client";

import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/permission-guard";
import { normalizeToPermissionKeys } from "@/lib/permissions";
import {
  getDefaultFallbackRoute,
  matchRoutePermission,
  matchRoutePermissionRule,
} from "@/lib/route-permissions";
import { useGetSecuritySystemSettingsQuery } from "@/redux/api/systemSettingsApi";
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
  const { data: securitySettings, isLoading: isSettingsLoading } =
    useGetSecuritySystemSettingsQuery();

  if (isLoading || isSettingsLoading) {
    return <Loading01 />;
  }

  const matchedRule = matchRoutePermissionRule(pathname);
  const rule = matchRoutePermission(pathname);
  const permissionKeys = normalizeToPermissionKeys(permissions);

  if (rule === null || !canAccessRoute(permissionKeys, rule)) {
    const fallbackPath = getDefaultFallbackRoute(permissionKeys);
    return (
      <AccessDenied
        attemptedPath={pathname}
        fallbackPath={fallbackPath}
        permissionRule={rule}
        routePattern={matchedRule?.pattern}
        showRequiredPermissions={Boolean(securitySettings?.expose_required_permissions)}
      />
    );
  }

  return <>{children}</>;
}

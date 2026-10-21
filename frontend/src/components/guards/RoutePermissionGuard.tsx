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
import { useGetMyPermissionsQuery } from "@/redux/api/authApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { AccessDenied } from "./AccessDenied";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { setPermissions } from "@/redux/slices/authSlice";
import { useSession } from "next-auth/react";

interface RoutePermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Enforces route-level permissions for all private routes.
 * Waits for auth + permissions before rendering children.
 */
export function RoutePermissionGuard({ children }: RoutePermissionGuardProps) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { status } = useSession();
  const { permissions, roles, isLoading, bootstrapError } = useAuth();
  const { refetch: refetchPermissions } = useGetMyPermissionsQuery(undefined, {
    skip: status !== "authenticated",
  });
  const { data: securitySettings, isLoading: isSettingsLoading } =
    useGetSecuritySystemSettingsQuery();

  if (isLoading || isSettingsLoading) {
    return <Loading01 />;
  }

  if (bootstrapError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-destructive text-lg font-medium">Could not load your permissions</p>
        <p className="text-muted-foreground text-sm max-w-md">{bootstrapError}</p>
        <Button
          onClick={async () => {
            const result = await refetchPermissions();
            if (result.data?.data) {
              dispatch(setPermissions(result.data.data));
            }
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const isSuperAdmin = roles?.some((r) => String(r).toLowerCase() === "super admin");
  const matchedRule = matchRoutePermissionRule(pathname);
  const rule = matchRoutePermission(pathname);
  const permissionKeys = normalizeToPermissionKeys(permissions);

  if (!isSuperAdmin && (rule === null || !canAccessRoute(permissionKeys, rule))) {
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

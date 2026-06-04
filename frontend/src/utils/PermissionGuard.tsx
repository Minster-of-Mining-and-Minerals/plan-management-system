"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { PermissionKey } from "@/lib/permissions";

interface PermissionGuardProps {
  children: React.ReactNode;
  requireAll?: PermissionKey[];
  requireAny?: PermissionKey[];
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requireAll,
  requireAny,
  fallback = null,
}) => {
  const { check, isLoading } = usePermissions();

  if (isLoading) return null;

  let canAccess = true;

  if (requireAll?.length) {
    canAccess = check({ allPermissions: requireAll });
  } else if (requireAny?.length) {
    canAccess = check({ anyPermissions: requireAny });
  }

  return <>{canAccess ? children : fallback}</>;
};

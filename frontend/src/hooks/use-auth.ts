"use client";

import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { RootState } from "@/redux/store";

/**
 * useAuth — Client-side hook for accessing auth state.
 *
 * Reads user profile, roles, and permissions from Redux (populated by
 * AuthInitializer via GET /api/auth/me after login).
 *
 * Usage:
 *   const { user, roles, permissions, hasPermission, hasRole, isLoaded } = useAuth();
 *   if (hasPermission("USERS:READ")) { ... }
 *   if (hasRole("Super Admin")) { ... }
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const { user, roles, permissions, isLoaded } = useSelector(
    (state: RootState) => state.auth
  );

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading" || (isAuthenticated && !isLoaded);

  /**
   * Check if the current user has a specific permission.
   * @param permission - Permission key in "RESOURCE:ACTION" format e.g. "USERS:READ"
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission.toUpperCase());
  };

  /**
   * Check if the current user has any of the given permissions.
   */
  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some((p) => permissions.includes(p.toUpperCase()));
  };

  /**
   * Check if the current user has a specific role by name.
   * @param roleName - Role name e.g. "Super Admin"
   */
  const hasRole = (roleName: string): boolean => {
    return roles.includes(roleName);
  };

  /**
   * Check if the current user has any of the given roles.
   */
  const hasAnyRole = (...roleNames: string[]): boolean => {
    return roleNames.some((rn) => roles.includes(rn));
  };

  return {
    // User info
    user,
    session,
    roles,
    permissions,

    // State flags
    isAuthenticated,
    isLoading,
    isLoaded,

    // Helper methods
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,

    // Quick access to the backend JWT token
    accessToken: session?.accessToken ?? null,
  };
}

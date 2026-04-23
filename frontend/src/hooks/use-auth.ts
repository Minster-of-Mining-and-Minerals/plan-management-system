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
 *   if (hasPermission("users:read")) { ... }
 *   if (hasRole("Admin")) { ... }
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
   * @param permission - Permission key in "resource:action" format e.g. "users:read"
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Check if the current user has any of the given permissions.
   */
  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some((p) => permissions.includes(p));
  };

  /**
   * Check if the current user has a specific role by name.
   * @param roleName - Role name e.g. "Admin", "Manager"
   */
  const hasRole = (roleName: string): boolean => {
    return roles.some((r) => r.name === roleName);
  };

  /**
   * Check if the current user has any of the given roles.
   */
  const hasAnyRole = (...roleNames: string[]): boolean => {
    return roleNames.some((rn) => roles.some((r) => r.name === rn));
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

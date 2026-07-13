"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setPermissions, completeAuthBootstrap, clearUserProfile } from "@/redux/slices/authSlice";
import { useGetMeQuery, useGetMyPermissionsQuery } from "@/redux/api/authApi";
import { baseApi } from "@/redux/baseApi";

/**
 * AuthInitializer
 *
 * Placed inside ReduxProvider + SessionProvider.
 * On mount (and on session change):
 *  1. Saves the accessToken from NextAuth session to localStorage
 *  2. Calls GET /api/auth/me to fetch user profile
 *  3. Calls GET /api/auth/permissions to fetch roles & permissions
 *  4. Stores the results in Redux (authSlice)
 *  5. Clears Redux + localStorage on logout
 */
export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();

  // Sync token during render so RTK Query requests in child components
  // have the Bearer token on the same tick (useEffect would be too late).
  if (
    typeof window !== "undefined" &&
    status === "authenticated" &&
    session?.accessToken
  ) {
    localStorage.setItem("authToken", session.accessToken);
  }

  // Step 1: Keep useEffect as backup when accessToken updates after refresh
  useEffect(() => {
    if (session?.accessToken) {
      localStorage.setItem("authToken", session.accessToken);
    }
  }, [session?.accessToken]);

  // Refetch structure lists that may have been requested before auth was ready
  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      dispatch(
        baseApi.util.invalidateTags(["GovernmentStructures", "InternalStructures"])
      );
    }
  }, [status, session?.accessToken, dispatch]);

  // Step 2: Fetch user profile from /me
  const { data: meData } = useGetMeQuery(undefined, {
    skip: status !== "authenticated" || !session?.accessToken,
  });

  // Step 3: Fetch roles + permissions from /permissions (always refetch while authenticated)
  const { data: permissionsData, isError: permissionsError, error: permissionsFetchError, refetch: refetchPermissions } =
    useGetMyPermissionsQuery(undefined, {
    skip: status !== "authenticated" || !session?.accessToken,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  // Step 4: Populate Redux when data responds
  useEffect(() => {
    if (meData?.data?.user) {
      dispatch(setUser(meData.data.user));
    }
  }, [meData, dispatch]);

  useEffect(() => {
    if (permissionsData?.data) {
      dispatch(setPermissions(permissionsData.data));
    }
  }, [permissionsData, dispatch]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) {
      return;
    }
    if (permissionsError) {
      const message =
        (permissionsFetchError as { data?: { message?: string } })?.data?.message ||
        "Failed to load your permissions.";
      dispatch(completeAuthBootstrap({ error: message }));
    }
  }, [status, session?.accessToken, permissionsError, permissionsFetchError, dispatch]);

  // Expose retry for RoutePermissionGuard via window event is overkill; guard uses refetch via store - skip

  // Step 5: Clear on logout
  useEffect(() => {
    if (status === "unauthenticated") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      dispatch(clearUserProfile());
    }
  }, [status, dispatch]);

  return <>{children}</>;
}

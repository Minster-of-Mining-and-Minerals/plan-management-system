"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setPermissions, clearUserProfile } from "@/redux/slices/authSlice";
import { useGetMeQuery, useGetMyPermissionsQuery } from "@/redux/api/authApi";
import { RootState } from "@/redux/store";
import { clearAuthToken, setSessionAuthToken } from "@/lib/authToken";

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
  const isLoaded = useSelector((state: RootState) => state.auth.isLoaded);

  // Step 1: Sync NextAuth session token (single source for RTK Query)
  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      setSessionAuthToken(session.accessToken);
      return;
    }
    if (status === "unauthenticated") {
      clearAuthToken();
    }
  }, [session?.accessToken, status]);

  // Step 2: Fetch user profile from /me
  const { data: meData } = useGetMeQuery(undefined, {
    skip: status !== "authenticated" || !session?.accessToken,
  });

  // Step 3: Fetch roles + permissions from /permissions
  const { data: permissionsData } = useGetMyPermissionsQuery(undefined, {
    skip: status !== "authenticated" || !session?.accessToken || isLoaded,
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

  // Step 5: Clear on logout
  useEffect(() => {
    if (status === "unauthenticated") {
      clearAuthToken();
      dispatch(clearUserProfile());
    }
  }, [status, dispatch]);

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { setUserProfile, clearUserProfile } from "@/redux/slices/authSlice";
import { useGetMeQuery } from "@/redux/api/authApi";
import { RootState } from "@/redux/store";

/**
 * AuthInitializer
 *
 * Placed inside ReduxProvider + SessionProvider.
 * On mount (and on session change):
 *  1. Saves the accessToken from NextAuth session to localStorage
 *  2. Calls GET /api/auth/me to fetch full user profile, roles, permissions
 *  3. Stores the result in Redux (authSlice)
 *  4. Clears Redux + localStorage on logout
 */
export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const isLoaded = useSelector((state: RootState) => state.auth.isLoaded);

  // Step 1: When session is ready, persist the accessToken to localStorage
  // so that baseApi can attach it to all API requests via prepareHeaders
  useEffect(() => {
    if (session?.accessToken) {
      localStorage.setItem("authToken", session.accessToken);
    }
  }, [session?.accessToken]);

  // Step 2: Fetch user profile + roles + permissions from /me
  // Only when: authenticated + have token + haven't loaded yet
  const { data: meData } = useGetMeQuery(undefined, {
    skip: status !== "authenticated" || !session?.accessToken || isLoaded,
  });

  // Step 3: Populate Redux when /me responds
  useEffect(() => {
    if (meData?.data) {
      dispatch(
        setUserProfile({
          user: meData.data.user,
          roles: meData.data.roles,
        })
      );
    }
  }, [meData, dispatch]);

  // Step 4: Clear on logout
  useEffect(() => {
    if (status === "unauthenticated") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      dispatch(clearUserProfile());
    }
  }, [status, dispatch]);

  return <>{children}</>;
}

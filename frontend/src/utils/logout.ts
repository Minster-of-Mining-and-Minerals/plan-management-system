import { signOut } from "next-auth/react";
import { POST_LOGOUT_PATH } from "@/constants/authRoutes";

/**
 * Perform a thorough logout by clearing all browser storage and sessions.
 * This ensures no stale data remains in localStorage, sessionStorage, or cookies.
 */
let isLoggingOut = false;

export const performLogout = async (callbackUrl: string = POST_LOGOUT_PATH) => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  // 1. Clear all browser storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    // Don't clear everything if we want to keep some preferences, 
    // but the user's request suggests a clean state is better.
    localStorage.clear(); 
    sessionStorage.clear();

    // 2. Clear all cookies (best effort from client side)
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
    }
  }

  // 3. Use next-auth/react signOut for complete session clearing and redirect
  try {
    await signOut({ callbackUrl, redirect: true });
  } catch (error) {
    console.error("Logout error:", error);
    if (typeof window !== "undefined") {
        window.location.href = callbackUrl;
    }
  } finally {
    isLoggingOut = false;
  }
};

import { signOut } from "next-auth/react";

/**
 * Perform a thorough logout by clearing all browser storage and sessions.
 * This ensures no stale data remains in localStorage, sessionStorage, or cookies.
 */
export const performLogout = async (callbackUrl: string = "/login") => {
  // 1. Clear all browser storage
  if (typeof window !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();

    // 2. Clear all cookies (best effort from client side)
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      // Also try to clear for the current domain just in case
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
    }
  }

  // 3. Use next-auth/react signOut for complete session clearing and redirect
  await signOut({ callbackUrl, redirect: true });
};

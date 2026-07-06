const AUTH_TOKEN_KEY = "authToken";

/** In-memory token from NextAuth session — preferred over stale localStorage. */
let sessionToken: string | null = null;

export function setSessionAuthToken(token: string | null) {
  sessionToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  if (sessionToken) return sessionToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

export function clearAuthToken() {
  sessionToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("user");
  }
}

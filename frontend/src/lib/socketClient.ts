/**
 * Socket.IO client helper — JWT via handshake.auth.token.
 * Realtime shares the API origin (same port as REST). Notifications still work over REST.
 */
import { io, type Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/authToken";

let socket: Socket | null = null;

function socketOrigin(): string {
  const api = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000/api";
  try {
    const u = new URL(api);
    return u.origin;
  } catch {
    return "http://localhost:4000";
  }
}

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = getAuthToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  socket?.disconnect();
  socket = io(socketOrigin(), {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { io, Socket } from "socket.io-client";
import { baseApi } from "@/redux/baseApi";
import { getSocketUrl } from "@/lib/socketUrl";
import { performLogout } from "@/utils/logout";

export default function SocketNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(getSocketUrl(), {
      auth: { token: session.accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on("notification", () => {
      dispatch(baseApi.util.invalidateTags(["Notification"]));
    });

    socket.on("session_revoked", (data: any) => {
      dispatch(
        baseApi.util.invalidateTags([
          "UserSession",
          "DeviceRestriction",
          "IpRestriction",
          "SessionLog",
        ])
      );

      const currentUserId = (session?.user as any)?.id;
      if (currentUserId && data?.userId === currentUserId) {
        void performLogout();
      }
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket connection failed:", error.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, session?.accessToken, dispatch]);

  return <>{children}</>;
}

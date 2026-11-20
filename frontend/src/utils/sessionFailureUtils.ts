import type { Dispatch } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { clearUserProfile } from "@/redux/slices/authSlice";
import { isForcedLogoutError, isNetworkAuthFailure } from "@/utils/authErrorUtils";
import { performLogout } from "@/utils/logout";
import { toast } from "sonner";

let isHandlingSessionFailure = false;
let lastBusyNoticeAt = 0;
const BUSY_NOTICE_INTERVAL_MS = 20000;

/** Throttled notice when the server is slow/unreachable — the session is kept. */
function notifyServerBusy(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastBusyNoticeAt < BUSY_NOTICE_INTERVAL_MS) return;
  lastBusyNoticeAt = now;
  toast.warning(
    "The server is responding slowly. Your session is still active — please retry in a moment."
  );
}

export function handleApiSessionFailure(
  error: FetchBaseQueryError | undefined,
  dispatch: Dispatch
): void {
  if (!isForcedLogoutError(error) && isNetworkAuthFailure(error)) {
    notifyServerBusy();
    return;
  }
  if (!isForcedLogoutError(error) || isHandlingSessionFailure) return;

  isHandlingSessionFailure = true;

  dispatch(clearUserProfile());

  // Lazy import avoids circular dependency: baseApi/collaborationApi -> sessionFailureUtils -> apis
  const { baseApi } = require("@/redux/baseApi") as typeof import("@/redux/baseApi");
  const { collaborationApi } =
    require("@/redux/api/collaborationApi") as typeof import("@/redux/api/collaborationApi");

  dispatch(baseApi.util.resetApiState());
  dispatch(collaborationApi.util.resetApiState());

  void performLogout().finally(() => {
    isHandlingSessionFailure = false;
  });
}

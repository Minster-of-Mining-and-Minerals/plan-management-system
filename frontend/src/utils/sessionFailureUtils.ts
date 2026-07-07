import type { Dispatch } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { clearUserProfile } from "@/redux/slices/authSlice";
import { isForcedLogoutError } from "@/utils/authErrorUtils";
import { performLogout } from "@/utils/logout";

let isHandlingSessionFailure = false;

export function handleApiSessionFailure(
  error: FetchBaseQueryError | undefined,
  dispatch: Dispatch
): void {
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

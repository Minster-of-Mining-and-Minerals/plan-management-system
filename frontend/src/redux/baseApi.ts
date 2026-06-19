import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { sanitizeApiPayload } from "@/utils/apiPayloadUtils";
import { isTokenAuthFailure } from "@/utils/authErrorUtils";
import { performLogout } from "@/utils/logout";
import { clearUserProfile } from "@/redux/slices/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_BASE_URL}`,
  prepareHeaders: (headers) => {
    // Read token from localStorage (set during login via authApi or NextAuth flow)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
    }
    headers.set("content-type", "application/json");
    headers.set("accept", "application/json");
    return headers;
  },
});

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const request =
    args && typeof args === "object" && "body" in args && args.body
      ? { ...args, body: sanitizeApiPayload(args.body) }
      : args;

  const result = await rawBaseQuery(request, api, extraOptions);

  if (isTokenAuthFailure(result.error)) {
    api.dispatch(clearUserProfile());
    api.dispatch(baseApi.util.resetApiState());
    void performLogout();
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Attachment",
    "User",
    "Roles",
    "Permissions",
    "PermissionGroups",
    "GovernmentStructures",
    "InternalStructures",
    "PlanVersions",
    "PlanningConfiguration",
    "PlanNodes",
    "AnnualTargetAllocations",
    "PeriodTargetAllocations",
    "PlanRules",
    "AssignmentActions",
    "ExternalAssignments",
    "InternalAssignments",
    "ActionLogs",
    "PerformanceColorThresholds",
    "PlanAssignmentOptions",
    "Notification",
    "NotificationTemplate",
    "Branding",
    "SystemAuditLog",
    "SystemSettings",
    "Issues",
    "IssueCategories",
    "IssuePriorities",
    "IssueDashboard",
    "IssueHistory",
  ],
  endpoints: () => ({}),
});

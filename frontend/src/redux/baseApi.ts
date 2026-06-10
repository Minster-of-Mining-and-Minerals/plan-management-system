import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { sanitizeApiPayload } from "@/utils/apiPayloadUtils";

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
  if (args && typeof args === "object" && "body" in args && args.body) {
    return rawBaseQuery(
      { ...args, body: sanitizeApiPayload(args.body) },
      api,
      extraOptions
    );
  }
  return rawBaseQuery(args, api, extraOptions);
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
  ],
  endpoints: () => ({}),
});

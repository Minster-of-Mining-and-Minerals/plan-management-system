import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
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

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQuery,
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

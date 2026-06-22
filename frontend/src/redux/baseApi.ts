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
    headers.set("accept", "application/json");
    return headers;
  },
});

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let request: string | FetchArgs = args;

  if (args && typeof args === "object" && "body" in args && args.body) {
    if (isFormDataBody(args.body)) {
      // Let the browser set multipart boundary; do not JSON-serialize FormData.
      request = args;
    } else {
      request = {
        ...args,
        body: sanitizeApiPayload(args.body),
        headers: {
          ...(typeof args.headers === "object" && args.headers ? args.headers : {}),
          "content-type": "application/json",
        },
      };
    }
  } else if (args && typeof args === "object" && "method" in args && args.method && args.method !== "GET") {
    request = {
      ...args,
      headers: {
        ...(typeof args.headers === "object" && args.headers ? args.headers : {}),
        "content-type": "application/json",
      },
    };
  }

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
    "PlanAssignmentScope",
    "Notification",
    "NotificationTemplate",
    "Branding",
    "SystemAuditLog",
    "SystemSettings",
    "Issues",
    "IssueCategories",
    "IssuePriorities",
    "FormConfigContainers",
    "IssueDashboard",
    "IssueHistory",
  ],
  endpoints: () => ({}),
});

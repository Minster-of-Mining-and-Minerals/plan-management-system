import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { sanitizeApiPayload } from "@/utils/apiPayloadUtils";
import { handleApiSessionFailure } from "@/utils/sessionFailureUtils";

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

  handleApiSessionFailure(result.error, api.dispatch);

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
    "PlanExecutionDashboard",
    "PlanningConfiguration",
    "PlanNodes",
    "AnnualTargetAllocations",
    "PeriodTargetAllocations",
    "TargetReallocations",
    "PeriodTargetReallocationReporting",
    "PlanAmendments",
    "AnnualTargetRevisionReporting",
    "KpiAdditionReporting",
    "ExecutionWindowReopeningReporting",
    "PlanAchievementWorkflowScope",
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
    "Notes",
    "Regions",
    "RegionalStructures",
    "RegionalBranding",
    "RegionalDashboard",
    "RegionalPlans",
    "RegionalPlanVersions",
    "RegionalPlanNodes",
    "RegionalPlanDashboard",
    "RegionalPlanRules",
    "RegionalPlanConfig",
    "Companies",
    "CompanyStructures",
    "CompanyBranding",
    "CompanyDashboard",
    "CompanyPlans",
    "CompanyPlanVersions",
    "CompanyPlanNodes",
    "CompanyPlanDashboard",
    "CompanyPlanRules",
    "CompanyPlanConfig",
    "PurchasingCenters",
    "PurchasingCenterBranding",
    "PurchasingCenterDashboard",
    "GoldPurchases",
    "GoldReports",
    "AsmMiners",
    "GoldUnits",
    "GoldPrices",
    "GoldOversight",
    "ProductionItems",
    "ProductionItemUnits",
    "ProductionFrequencies",
    "CompanyProductionAssignments",
    "CompanyProductionTargets",
    "CompanyProductionReports",
    "ProductionDashboard",
  ],
  endpoints: () => ({}),
});

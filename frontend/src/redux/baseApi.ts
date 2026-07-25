import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { signOut } from "next-auth/react";
import { clearAuthToken, getAuthToken } from "@/lib/authToken";
import { performLogout } from "@/utils/logout";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_BASE_URL}`,
  prepareHeaders: (headers, { arg }) => {
    const token = getAuthToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    const body =
      typeof arg === "object" && arg !== null && "body" in arg
        ? (arg as { body?: unknown }).body
        : undefined;
    if (!(body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    headers.set("accept", "application/json");
    return headers;
  },
});

function isTokenAuthError(result: any): boolean {
  if (!result) return false;
  const status = result.error?.status;
  if (status === 401) return true;

  const errMsg =
    (result.error?.data as any)?.message ||
    (result.error?.data as any)?.error ||
    (result.data as any)?.message ||
    "";

  if (typeof errMsg === "string") {
    const lower = errMsg.toLowerCase();
    if (
      lower.includes("invalid or expired token") ||
      lower.includes("access token required") ||
      lower.includes("session revoked") ||
      lower.includes("jwt expired") ||
      lower.includes("invalid token") ||
      lower.includes("token_revoked")
    ) {
      return true;
    }
    if (status === 403 && lower.includes("token")) {
      return true;
    }
  }

  return false;
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (isTokenAuthError(result) && typeof window !== "undefined") {
    performLogout("/login");
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Attachment",
    "User",
    "Roles",
    "Permissions",
    "PermissionGroups",
    "Branding",
    "FormFields",
    "FormFieldGroups",
    "Patient",
    "Department",
    "UserTitle",
    "PatientSlipConfig",
    "PatientSchedule",
    "ScheduleConfig",
    "StaffAppointment",
    "Notification",
    "DiagnosisFormConfig",
    "DiagnosisTemplate",
    "MedicalDiagram",
    "MedicalDiagramCategory",
    "DiagnosisRecord",
    "MedicalWorkflow",
    "PrescriptionCategory",
    "PrescriptionTemplate",
    "PrescriptionDocumentTemplate",
    "Prescription",
    "Pharmacy",
    "PharmacyPrescription",
    "PharmacyPortal",
    "PatientPortal",
    "MedicalCertificateTemplate",
    "MedicalCertificate",
    "ClinicalSuggestion",
    "BillingService",
    "BillingServiceCategory",
    "AppointmentBilling",
    "CashierSession",
    "CashierQueue",
    "CashierAccount",
    "CashierPaymentsToday",
    "CashierPaymentHistory",
    "FinanceCollections",
    "ReceiptTemplate",
    "AuditLog",
    "Dashboard",
    "ClinicalDocument",
    "WorkflowTask",
    "FollowUp",
    "ClinicalOrder",
    "Laboratory",
    "Radiology",
  ],
  endpoints: () => ({}),
});

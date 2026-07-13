import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { signOut } from "next-auth/react";
import { clearAuthToken, getAuthToken } from "@/lib/authToken";

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

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && typeof window !== "undefined") {
    const hadToken = Boolean(getAuthToken());
    clearAuthToken();
    if (hadToken) {
      await signOut({ callbackUrl: "/login", redirect: true });
    }
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
  ],
  endpoints: () => ({}),
});

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_BASE_URL}`,
  prepareHeaders: (headers, { arg }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
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

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQuery,
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
  ],
  endpoints: () => ({}),
});

import { baseApi } from "../baseApi";
import type {
  LicenseType,
  CompanyLicense,
  CreateLicensePayload,
  UpdateLicensePayload,
  CreateLicenseTypePayload,
  UpdateLicenseTypePayload,
} from "../types/license";

export const licenseApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // License Types
    getLicenseTypes: builder.query<LicenseType[], { is_active?: boolean } | void>({
      query: (params) => ({
        url: "/license-types",
        params: params || undefined,
      }),
      transformResponse: (res: { data: LicenseType[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ license_type_id }) => ({
                type: "LicenseTypes" as const,
                id: license_type_id,
              })),
              { type: "LicenseTypes", id: "LIST" },
            ]
          : [{ type: "LicenseTypes", id: "LIST" }],
    }),

    getLicenseTypeById: builder.query<LicenseType, string>({
      query: (id) => `/license-types/${id}`,
      transformResponse: (res: { data: LicenseType }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "LicenseTypes", id }],
    }),

    createLicenseType: builder.mutation<LicenseType, CreateLicenseTypePayload>({
      query: (body) => ({
        url: "/license-types",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: LicenseType }) => res.data,
      invalidatesTags: [{ type: "LicenseTypes", id: "LIST" }],
    }),

    updateLicenseType: builder.mutation<
      LicenseType,
      { id: string; data: UpdateLicenseTypePayload }
    >({
      query: ({ id, data }) => ({
        url: `/license-types/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: LicenseType }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "LicenseTypes", id },
        { type: "LicenseTypes", id: "LIST" },
      ],
    }),

    deleteLicenseType: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/license-types/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "LicenseTypes", id: "LIST" }],
    }),

    // Licenses
    getLicenses: builder.query<
      CompanyLicense[],
      {
        company_id?: string;
        license_type_id?: string;
        region?: string;
        mineral_type?: string;
        status?: string;
        search?: string;
        is_active?: boolean;
      } | void
    >({
      query: (params) => ({
        url: "/licenses",
        params: params || undefined,
      }),
      transformResponse: (res: { data: CompanyLicense[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ license_id }) => ({
                type: "CompanyLicenses" as const,
                id: license_id,
              })),
              { type: "CompanyLicenses", id: "LIST" },
            ]
          : [{ type: "CompanyLicenses", id: "LIST" }],
    }),

    getLicenseById: builder.query<CompanyLicense, string>({
      query: (id) => `/licenses/${id}`,
      transformResponse: (res: { data: CompanyLicense }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "CompanyLicenses", id }],
    }),

    createLicense: builder.mutation<CompanyLicense, CreateLicensePayload>({
      query: (body) => ({
        url: "/licenses",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CompanyLicense }) => res.data,
      invalidatesTags: [
        { type: "CompanyLicenses", id: "LIST" },
        { type: "Companies", id: "LIST" },
      ],
    }),

    updateLicense: builder.mutation<
      CompanyLicense,
      { id: string; data: UpdateLicensePayload }
    >({
      query: ({ id, data }) => ({
        url: `/licenses/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: CompanyLicense }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "CompanyLicenses", id },
        { type: "CompanyLicenses", id: "LIST" },
      ],
    }),

    deleteLicense: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/licenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "CompanyLicenses", id: "LIST" },
        { type: "Companies", id: "LIST" },
      ],
    }),

    getCompanyLicenses: builder.query<CompanyLicense[], string>({
      query: (companyId) => `/companies/${companyId}/licenses`,
      transformResponse: (res: { data: CompanyLicense[] }) => res.data,
      providesTags: (_res, _err, companyId) => [
        { type: "CompanyLicenses", id: `COMPANY_${companyId}` },
        { type: "CompanyLicenses", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetLicenseTypesQuery,
  useGetLicenseTypeByIdQuery,
  useCreateLicenseTypeMutation,
  useUpdateLicenseTypeMutation,
  useDeleteLicenseTypeMutation,
  useGetLicensesQuery,
  useGetLicenseByIdQuery,
  useCreateLicenseMutation,
  useUpdateLicenseMutation,
  useDeleteLicenseMutation,
  useGetCompanyLicensesQuery,
} = licenseApi;

import { baseApi } from "../baseApi";
import type {
  Company,
  CompanyStructure,
  CompanyBrandingData,
  CompanyDashboardData,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  CreateCompanyStructurePayload,
  UpdateCompanyStructurePayload,
} from "../types/company";
import type { Role } from "../types/user";

export const companyApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCompanies: builder.query<Company[], { is_active?: boolean; search?: string } | void>({
      query: (params) => ({
        url: "/companies",
        params: params || undefined,
      }),
      transformResponse: (res: { data: Company[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ company_id }) => ({ type: "Companies" as const, id: company_id })),
              { type: "Companies", id: "LIST" },
            ]
          : [{ type: "Companies", id: "LIST" }],
    }),

    getCompanyById: builder.query<Company, string>({
      query: (id) => `/companies/${id}`,
      transformResponse: (res: { data: Company }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "Companies", id }],
    }),

    createCompany: builder.mutation<Company, CreateCompanyPayload>({
      query: (body) => ({
        url: "/companies",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Company }) => res.data,
      invalidatesTags: [{ type: "Companies", id: "LIST" }],
    }),

    updateCompany: builder.mutation<Company, { id: string; data: UpdateCompanyPayload }>({
      query: ({ id, data }) => ({
        url: `/companies/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: Company }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Companies", id },
        { type: "Companies", id: "LIST" },
        "CompanyBranding",
      ],
    }),

    toggleCompanyStatus: builder.mutation<Company, { id: string; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/companies/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      transformResponse: (res: { data: Company }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Companies", id },
        { type: "Companies", id: "LIST" },
      ],
    }),

    deleteCompany: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/companies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Companies", id: "LIST" }],
    }),

    // Company Structures
    getCompanyStructures: builder.query<
      CompanyStructure[],
      { company_id: string; is_active?: boolean }
    >({
      query: ({ company_id, is_active }) => ({
        url: "/company-structures",
        params: {
          company_id,
          is_active: is_active !== undefined ? String(is_active) : undefined,
        },
      }),
      transformResponse: (res: { data: CompanyStructure[] }) => res.data,
      providesTags: (result, _err, { company_id }) =>
        result
          ? [
              ...result.map(({ company_structure_id }) => ({
                type: "CompanyStructures" as const,
                id: company_structure_id,
              })),
              { type: "CompanyStructures", id: company_id },
            ]
          : [{ type: "CompanyStructures", id: company_id }],
    }),

    getCompanyStructureById: builder.query<CompanyStructure, string>({
      query: (id) => `/company-structures/${id}`,
      transformResponse: (res: { data: CompanyStructure }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "CompanyStructures", id }],
    }),

    createCompanyStructure: builder.mutation<CompanyStructure, CreateCompanyStructurePayload>({
      query: (body) => ({
        url: "/company-structures",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CompanyStructure }) => res.data,
      invalidatesTags: (_res, _err, { company_id }) => [
        { type: "CompanyStructures", id: company_id },
        { type: "Companies", id: company_id },
        { type: "CompanyDashboard", id: company_id },
      ],
    }),

    updateCompanyStructure: builder.mutation<
      CompanyStructure,
      { id: string; data: UpdateCompanyStructurePayload; company_id: string }
    >({
      query: ({ id, data, company_id }) => ({
        url: `/company-structures/${id}`,
        method: "PUT",
        body: { ...data, company_id },
      }),
      transformResponse: (res: { data: CompanyStructure }) => res.data,
      invalidatesTags: (_res, _err, { id, company_id }) => [
        { type: "CompanyStructures", id },
        { type: "CompanyStructures", id: company_id },
        { type: "CompanyDashboard", id: company_id },
      ],
    }),

    deleteCompanyStructure: builder.mutation<
      { success: boolean; message: string },
      { id: string; company_id: string }
    >({
      query: ({ id, company_id }) => ({
        url: `/company-structures/${id}`,
        method: "DELETE",
        params: { company_id },
      }),
      invalidatesTags: (_res, _err, { company_id }) => [
        { type: "CompanyStructures", id: company_id },
        { type: "Companies", id: company_id },
        { type: "CompanyDashboard", id: company_id },
      ],
    }),

    // Company Branding
    getCompanyBranding: builder.query<CompanyBrandingData, string | void>({
      query: (company_id) => ({
        url: "/company-branding/resolve",
        params: company_id ? { company_id } : undefined,
      }),
      transformResponse: (res: { data: CompanyBrandingData }) => res.data,
      providesTags: (_res, _err, company_id) => [
        { type: "CompanyBranding", id: company_id || "CURRENT" },
      ],
    }),

    updateCompanyBranding: builder.mutation<
      CompanyBrandingData,
      { company_id: string; data: Partial<CompanyBrandingData> }
    >({
      query: ({ company_id, data }) => ({
        url: "/company-branding",
        method: "PUT",
        params: { company_id },
        body: data,
      }),
      transformResponse: (res: { data: CompanyBrandingData }) => res.data,
      invalidatesTags: (_res, _err, { company_id }) => [
        { type: "CompanyBranding", id: company_id },
        { type: "CompanyBranding", id: "CURRENT" },
        { type: "Companies", id: company_id },
        { type: "CompanyDashboard", id: company_id },
      ],
    }),

    // Company Dashboard
    getCompanyDashboard: builder.query<CompanyDashboardData, string>({
      query: (company_id) => ({
        url: "/company/dashboard",
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyDashboardData }) => res.data,
      providesTags: (_res, _err, company_id) => [
        { type: "CompanyDashboard", id: company_id },
      ],
    }),

    // Company Roles
    getCompanyRoles: builder.query<Role[], string | void>({
      query: (company_id) => ({
        url: "/company/roles",
        params: company_id ? { company_id } : undefined,
      }),
      transformResponse: (res: { data: Role[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ role_id }) => ({ type: "Roles" as const, id: role_id })),
              { type: "Roles", id: "COMPANY_LIST" },
            ]
          : [{ type: "Roles", id: "COMPANY_LIST" }],
    }),
  }),
});

export const {
  useGetCompaniesQuery,
  useGetCompanyByIdQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useToggleCompanyStatusMutation,
  useDeleteCompanyMutation,
  useGetCompanyStructuresQuery,
  useGetCompanyStructureByIdQuery,
  useCreateCompanyStructureMutation,
  useUpdateCompanyStructureMutation,
  useDeleteCompanyStructureMutation,
  useGetCompanyBrandingQuery,
  useUpdateCompanyBrandingMutation,
  useGetCompanyDashboardQuery,
  useGetCompanyRolesQuery,
} = companyApi;

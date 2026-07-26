import { baseApi } from "../baseApi";

export interface OrganizationTenant {
  tenant_id: string;
  name: string;
  type: string;
  branding_config_json: any;
  timezone: string;
  currency: string;
  country: string;
  status: string;
  facilities?: Facility[];
}

export interface Facility {
  facility_id: string;
  tenant_id: string;
  name: string;
  code: string;
  type: string;
  address?: any;
  status: string;
}

export interface UserFacilityAssignment {
  assignment_id: string;
  user_id: string;
  tenant_id: string;
  facility_id: string;
  role_id?: string;
  role_name: string;
  is_default: boolean;
  status: string;
  facility?: Facility;
  tenant?: OrganizationTenant;
}

export interface TenantBranding {
  tenant_id: string;
  application_name: string;
  logo_url: string;
  favicon_url: string;
  colors: {
    primary: string;
    primary_hover?: string;
    secondary: string;
    accent: string;
    background?: string;
  };
}

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<OrganizationTenant[], void>({
      query: () => "/tenants/tenants",
      transformResponse: (res: { data: OrganizationTenant[] }) => res.data ?? [],
      providesTags: ["Tenant"],
    }),

    getTenantById: builder.query<OrganizationTenant, string>({
      query: (id) => `/tenants/tenants/${id}`,
      transformResponse: (res: { data: OrganizationTenant }) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Tenant", id }],
    }),

    getFacilities: builder.query<Facility[], { tenant_id?: string } | void>({
      query: (params) => ({
        url: "/tenants/facilities",
        params: params || {},
      }),
      transformResponse: (res: { data: Facility[] }) => res.data ?? [],
      providesTags: ["Facility"],
    }),

    getMyFacilityAssignments: builder.query<UserFacilityAssignment[], string | void>({
      query: (userId) => ({
        url: "/tenants/user-facility-assignments/my",
        params: userId ? { user_id: userId } : {},
      }),
      transformResponse: (res: { data: UserFacilityAssignment[] }) => res.data ?? [],
      providesTags: ["UserFacilityAssignment"],
    }),

    getTenantBranding: builder.query<TenantBranding, string | void>({
      query: (tenantId) => ({
        url: "/tenants/branding",
        params: tenantId ? { tenant_id: tenantId } : {},
      }),
      transformResponse: (res: { data: TenantBranding }) => res.data,
      providesTags: [{ type: "TenantBranding", id: "ACTIVE" }],
    }),

    updateTenantBranding: builder.mutation<TenantBranding, Partial<TenantBranding>>({
      query: (body) => ({
        url: "/tenants/branding",
        method: "PUT",
        body,
      }),
      transformResponse: (res: { data: TenantBranding }) => res.data,
      invalidatesTags: [{ type: "TenantBranding", id: "ACTIVE" }],
    }),

    createTenant: builder.mutation<OrganizationTenant, Partial<OrganizationTenant>>({
      query: (body) => ({
        url: "/tenants/tenants",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: OrganizationTenant }) => res.data,
      invalidatesTags: ["Tenant"],
    }),

    createFacility: builder.mutation<Facility, Partial<Facility>>({
      query: (body) => ({
        url: "/tenants/facilities",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Facility }) => res.data,
      invalidatesTags: ["Facility", "Tenant"],
    }),
  }),
});

export const {
  useGetTenantsQuery,
  useGetTenantByIdQuery,
  useGetFacilitiesQuery,
  useGetMyFacilityAssignmentsQuery,
  useGetTenantBrandingQuery,
  useUpdateTenantBrandingMutation,
  useCreateTenantMutation,
  useCreateFacilityMutation,
} = tenantApi;
